import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getCurrentAppUser } from "../../app/app-auth";
import { getDb } from "../../db";
import { resolveTenantContext } from "../tenant-runtime";
import { assertHomologationEnvironment } from "./homologation-environment";

const tenantId = "03824f9e-0924-435e-8b20-50b8ea52774b";
const batch = "first_synthetic_batch_5";
const manifest = Object.freeze([
  { inventory: "phase2-p2-01-vehicle", alias: null },
  { inventory: "phase2-p2-02-vehicle", alias: null },
  { inventory: "pilot-p1-01-vehicle", alias: null },
  { inventory: "phase2-p2-03-vehicle", alias: "phase2-p2-03-opportunity" },
  { inventory: "pilot-p1-02-vehicle", alias: "pilot-p1-02-opportunity" },
].map(unit => Object.freeze(unit)));
const inventories = manifest.map(unit => unit.inventory);
const aliases = manifest.flatMap(unit => unit.alias ? [unit.alias] : []);

export class HomologationExecutionError extends Error {
  constructor(public readonly status: number = 409) {
    super("DECISION REQUIRED: homologation execution rejected.");
    this.name = "HomologationExecutionError";
  }
}
const reject = () => { throw new HomologationExecutionError(); };
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Root = { id: string; tenantId: string; specificationId: string | null; status: string;
  creatorId: string; creatorUserId: string; reason: string };
type Link = { id: string; tenantId: string; vehicleId: string; inventoryId: string | null;
  tradeInId: string | null; consignmentId: string | null; actorId: string; reason: string };
type Actor = { userId: string; membershipId: string };

function provenance(unit: typeof manifest[number], actor: Actor, timestamp: string, sourceId: string) {
  return JSON.stringify({ policy: "AP-CRM-004V2A", reference: "AP-CRM-004V2", batch,
    nature: "synthetic_homologation", environment: "teste2", tenant: tenantId,
    confirmationSource: "explicit_approved_manifest", realPhysicalVehicleVerified: false,
    inventorySourceId: unit.inventory, tradeInAlias: unit.alias, originalSourceId: sourceId,
    userId: actor.userId, membershipId: actor.membershipId, timestamp,
    reason: "Approved fictitious homologation unit; no verified physical vehicle or Production promotion." });
}

async function readBatch(tx: Tx) {
  const roots = await tx.execute(sql`select v.id,v.tenant_id as "tenantId",
    v.vehicle_specification_id as "specificationId",v.status,
    v.created_by_membership_id as "creatorId",m.user_id as "creatorUserId",v.registration_reason as reason
    from public.tenant_vehicles v join public.memberships m on m.id=v.created_by_membership_id
    where v.registration_reason like ${`%${batch}%`} for update of v`);
  const links = await tx.execute(sql`select id,tenant_id as "tenantId",tenant_vehicle_id as "vehicleId",
    inventory_vehicle_id as "inventoryId",trade_in_id as "tradeInId",consignment_id as "consignmentId",
    confirmed_by_membership_id as "actorId",reason from public.tenant_vehicle_source_links
    where inventory_vehicle_id=any(${sql.param(inventories)}::text[]) or trade_in_id=any(${sql.param(aliases)}::text[])
    or tenant_vehicle_id=any(${sql.param(roots.map(root => root.id))}::text[]) for update`);
  return { roots: Array.from(roots) as Root[], links: Array.from(links) as Link[] };
}

function validatePersisted(state: { roots: Root[]; links: Link[] }) {
  if (state.roots.length !== 5 || state.links.length !== 7) reject();
  const used = new Set<string>();
  const vehicles = manifest.map(unit => {
    const inventoryLinks = state.links.filter(link => link.inventoryId === unit.inventory);
    if (inventoryLinks.length !== 1) reject();
    const root = state.roots.find(row => row.id === inventoryLinks[0].vehicleId);
    if (!root || root.tenantId !== tenantId || root.specificationId !== null || root.status !== "qualification" || used.has(root.id)) reject();
    used.add(root!.id);
    let recorded: Record<string, unknown>;
    try { recorded = JSON.parse(root!.reason); } catch { return reject(); }
    if (!recorded || typeof recorded !== "object" || typeof recorded.timestamp !== "string" ||
        !Number.isFinite(Date.parse(recorded.timestamp))) reject();
    const actor = { userId: root!.creatorUserId, membershipId: root!.creatorId };
    if (root!.reason !== provenance(unit, actor, recorded.timestamp as string, unit.inventory)) reject();
    const unitLinks = state.links.filter(link => link.vehicleId === root!.id);
    if (unitLinks.length !== (unit.alias ? 2 : 1)) reject();
    for (const link of unitLinks) {
      const sourceId = link.inventoryId ?? link.tradeInId;
      if (link.tenantId !== tenantId || link.actorId !== root!.creatorId || link.consignmentId !== null ||
          (link.inventoryId !== null && link.tradeInId !== null) ||
          !sourceId || (link.inventoryId !== unit.inventory && (!unit.alias || link.tradeInId !== unit.alias)) ||
          link.reason !== provenance(unit, actor, recorded.timestamp as string, sourceId!)) reject();
    }
    if (unit.alias && unitLinks.filter(link => link.tradeInId === unit.alias).length !== 1) reject();
    return { tenantVehicleId: root!.id, inventorySourceId: unit.inventory, tradeInAlias: unit.alias };
  });
  return vehicles;
}

// One-purpose entry point. Payload is rejected, never interpreted as actor or identity.
export async function executeFirstSyntheticBatch(payload: unknown = {}) {
  const user = await getCurrentAppUser();
  if (!user) throw new HomologationExecutionError(401);
  assertHomologationEnvironment();
  const context = await resolveTenantContext(tenantId);
  if (context.userId !== user.id || context.tenantId !== tenantId ||
      !context.roles.some(role => role === "owner" || role === "manager")) throw new HomologationExecutionError(403);
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length) {
    throw new HomologationExecutionError(400);
  }
  return getDb().transaction(async tx => {
    // Serialize this fixed batch; source unique indexes remain the database backstop.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${tenantId}:AP-CRM-004V2B1:${batch}`},0))`);
    // Revalidate active Tenant, actual User/Membership and owner/manager under DB locks.
    await tx.execute(sql`select public.assert_vehicle_registry_actor(${tenantId},${context.membershipId},${user.id})`);
    const sources = await tx.execute(sql`select id,source_negotiation_id as alias
      from public.vehicles where id=any(${sql.param(inventories)}::text[]) order by id for update`);
    const leads = await tx.execute(sql`select id,tenant_id as "tenantId" from public.trade_ins
      where id=any(${sql.param(aliases)}::text[]) order by id for update`);
    if (sources.length !== 5 || leads.length !== 2 || manifest.some(unit =>
      sources.filter(row => row.id === unit.inventory && row.alias === unit.alias).length !== 1) ||
      aliases.some(id => leads.filter(row => row.id === id && row.tenantId === tenantId).length !== 1)) reject();
    const before = await readBatch(tx);
    if (before.roots.length || before.links.length) {
      return { result: "ALREADY_EXECUTED" as const, batch, tenantId, vehicles: validatePersisted(before) };
    }
    const timestamp = new Date().toISOString();
    const actor = { userId: user.id, membershipId: context.membershipId };
    for (const unit of manifest) {
      const id = randomUUID();
      await tx.execute(sql`select public.register_tenant_vehicle(${id},${tenantId},${context.membershipId},${user.id},${null},${"qualification"},${provenance(unit, actor, timestamp, unit.inventory)})`);
      await tx.execute(sql`select public.confirm_tenant_vehicle_source(${tenantId},${context.membershipId},${user.id},${id},${"inventory"},${unit.inventory},${provenance(unit, actor, timestamp, unit.inventory)})`);
      if (unit.alias) await tx.execute(sql`select public.confirm_tenant_vehicle_source(${tenantId},${context.membershipId},${user.id},${id},${"trade_in"},${unit.alias},${provenance(unit, actor, timestamp, unit.alias)})`);
    }
    // Any unexpected final state aborts the whole transaction, including all roots.
    return { result: "EXECUTED" as const, batch, tenantId, vehicles: validatePersisted(await readBatch(tx)) };
  });
}
