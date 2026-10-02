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

// Shared with Match initiation: one typed mapping authority, locks held until commit.
// Caller must authorize Tenant and keep this transaction open through a dependent write.
export async function resolveMatchVehicleInTransaction(tx: Tx, tenantId: string, matchId: string): Promise<VehicleResolution> {
  const rows = await tx.execute(sql`select * from public.resolve_match_vehicle(${tenantId},${matchId})`);
  const vehicle = rows[0];
  if (!vehicle) return { state: "UNRESOLVED", tenantVehicleId: null, actionable: false };
  return { state: "RESOLVED", tenantVehicleId: vehicle.vehicle_id as string, vehicleSpecificationId: vehicle.specification_id as string | null, actionable: vehicle.actionable === true };
}

export async function resolveMatchTenantVehicle(matchId: string, requestedTenantId?: string) {
  const context = await resolveTenantContext(requestedTenantId);
  try {
    return await getDb().transaction(tx => resolveMatchVehicleInTransaction(tx, context.tenantId, matchId));
  } catch (error) {
    const failure = error as { code?: string; cause?: { code?: string } };
    if (failure?.code === "42501" || failure?.cause?.code === "42501") throw new TenantAccessError("Match unavailable in authorized Tenant.");
    throw error;
  }
}
