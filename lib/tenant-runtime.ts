import { and, eq, sql } from "drizzle-orm";
import { getCurrentAppUser } from "../app/app-auth";
import { getDb } from "../db";
import { intakeRoutes, memberships, roleAssignments, storeAccess, stores, tenants } from "../db/tenant-schema";
import { authorizeStore, selectTenantContext, TenantAccessError, validateIntakeRoute, type TenantRole } from "./tenant-context";

export async function resolveTenantContext(requestedTenantId?: string, requiredStoreId?: string) {
  const user = await getCurrentAppUser();
  if (!user?.id) throw new TenantAccessError("Authentication required.");
  const db = getDb();
  const rows = await db.select({ membership: memberships, tenant: tenants }).from(memberships).innerJoin(tenants,eq(tenants.id,memberships.tenantId)).where(eq(memberships.userId,user.id));
  const candidates = await Promise.all(rows.map(async ({membership,tenant}) => {
    const assignments = await db.select().from(roleAssignments).where(and(eq(roleAssignments.membershipId,membership.id),eq(roleAssignments.status,"active")));
    return { tenantId:tenant.id, membershipId:membership.id, tenantStatus:tenant.status, membershipStatus:membership.status, revokedAt:membership.revokedAt, roles:assignments.filter(a => a.revokedAt === null && ["owner","manager","seller"].includes(a.roleCode)).map(a => a.roleCode as TenantRole) };
  }));
  const context = selectTenantContext(candidates,requestedTenantId);
  if (requiredStoreId) {
    const [store] = await db.select().from(stores).where(eq(stores.id,requiredStoreId));
    if (!store) throw new TenantAccessError("Store access denied.");
    const access = await db.select().from(storeAccess).where(and(eq(storeAccess.membershipId,context.membershipId),eq(storeAccess.tenantId,context.tenantId),eq(storeAccess.storeId,store.id),eq(storeAccess.status,"active")));
    authorizeStore(context.roles,context.tenantId,{...store,hasActiveAccess:access.some(a => a.revokedAt === null)});
  }
  return {...context,userId:user.id};
}

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export async function resolvePublicIntake(kind: "buyer_profile" | "trade_in", executor: Db | Tx = getDb()) {
  const key = kind === "buyer_profile" ? "public_buyer_profile" : "public_trade_in";
  // Locks serialize route/Tenant revocation with inserts when used inside a transaction.
  const result = await executor.execute(sql`select r.tenant_id as "tenantId", r.store_id as "storeId", r.intake_kind as "intakeKind", r.status, t.status as "tenantStatus" from ${intakeRoutes} r join ${tenants} t on t.id = r.tenant_id where r.route_key = ${key} for share of r,t`);
  const row = result[0] as { tenantId:string; storeId:string|null; intakeKind:string; status:string; tenantStatus:string } | undefined;
  if (!row) throw new TenantAccessError("Intake routing unavailable.");
  return validateIntakeRoute(row,kind);
}
