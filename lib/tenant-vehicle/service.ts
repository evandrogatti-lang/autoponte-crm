import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { tenantVehicles } from "../../db/tenant-vehicle-schema";
import { TenantAccessError } from "../tenant-context";
import { resolveTenantContext } from "../tenant-runtime";
import { validateVehicleInput, type ConfirmVehicleSourceInput, type RegisterTenantVehicleInput, type VehicleResolution } from "./contracts";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function registerTenantVehicle(input: RegisterTenantVehicleInput) {
  validateVehicleInput(input, false);
  const context = await resolveTenantContext(input.tenantId);
  const id = randomUUID();
  return getDb().transaction(async tx => {
    await tx.execute(sql`select public.register_tenant_vehicle(${id},${context.tenantId},${context.membershipId},${context.userId},${input.vehicleSpecificationId ?? null},${input.status ?? "qualification"},${input.registrationReason.trim()})`);
    const [row] = await tx.select().from(tenantVehicles).where(and(eq(tenantVehicles.id, id), eq(tenantVehicles.tenantId, context.tenantId)));
    if (!row) throw new Error("Canonical vehicle registration did not return persisted state.");
    return row;
  });
}

export async function readTenantVehicle(id: string, requestedTenantId?: string) {
  const context = await resolveTenantContext(requestedTenantId);
  const [row] = await getDb().select().from(tenantVehicles).where(and(eq(tenantVehicles.id, id), eq(tenantVehicles.tenantId, context.tenantId)));
  return row ?? null;
}

export async function confirmTenantVehicleSource(input: ConfirmVehicleSourceInput) {
  validateVehicleInput(input, true);
  const context = await resolveTenantContext(input.tenantId);
  const rows = await getDb().execute(sql`select public.confirm_tenant_vehicle_source(${context.tenantId},${context.membershipId},${context.userId},${input.tenantVehicleId},${input.sourceType},${input.sourceId},${input.reason.trim()}) as "linkId"`);
  return { linkId: rows[0].linkId as string, tenantId: context.tenantId };
}

// Internal composable read: caller must authorize Tenant and keep this transaction
// open through any future dependent write. A completed read is not a durable grant.
export async function resolveMatchVehicleInTransaction(tx: Tx, tenantId: string, matchId: string): Promise<VehicleResolution> {
  const rows = await tx.execute(sql`select m.source_type as "sourceType",m.source_id as "sourceId",m.vehicle_id as "vehicleId" from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id where m.id=${matchId} and b.tenant_id=${tenantId} for share of m,b`);
  const match = rows[0];
  if (!match) throw new TenantAccessError("Match unavailable in authorized Tenant.");
  const unresolved: VehicleResolution = { state: "UNRESOLVED", tenantVehicleId: null, actionable: false };
  let sourceColumn;
  if (match.sourceType === "inventory") {
    if (match.vehicleId && match.vehicleId !== match.sourceId) return unresolved;
    sourceColumn = sql`l.inventory_vehicle_id`;
  } else if (match.sourceType === "trade_in") sourceColumn = sql`l.trade_in_id`;
  else if (match.sourceType === "consignment") sourceColumn = sql`l.consignment_id`;
  else return unresolved;
  // Typed source links are explicit, immutable and same-Tenant FK-backed.
  const links = await tx.execute(sql`select v.id as "tenantVehicleId",v.vehicle_specification_id as "vehicleSpecificationId",v.status from public.tenant_vehicle_source_links l join public.tenant_vehicles v on v.id=l.tenant_vehicle_id and v.tenant_id=l.tenant_id where l.tenant_id=${tenantId} and ${sourceColumn}=${match.sourceId} for share of l,v`);
  const vehicle = links[0];
  if (!vehicle) return unresolved;
  return { state: "RESOLVED", tenantVehicleId: vehicle.tenantVehicleId as string, vehicleSpecificationId: vehicle.vehicleSpecificationId as string | null, actionable: vehicle.status === "available" };
}

export async function resolveMatchTenantVehicle(matchId: string, requestedTenantId?: string) {
  const context = await resolveTenantContext(requestedTenantId);
  return getDb().transaction(tx => resolveMatchVehicleInTransaction(tx, context.tenantId, matchId));
}
