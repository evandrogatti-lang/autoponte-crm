export type TenantRole = "owner" | "manager" | "seller";
export type TenantCandidate = { tenantId: string; membershipId: string; tenantStatus: string; membershipStatus: string; revokedAt: Date | null; roles: TenantRole[] };
export class TenantAccessError extends Error {}

// requestedTenantId is a selector only; candidates must come from authenticated-user queries.
export function selectTenantContext(candidates: TenantCandidate[], requestedTenantId?: string) {
  const active = candidates.filter(c => c.tenantStatus === "active" && c.membershipStatus === "active" && c.revokedAt === null && c.roles.length > 0);
  const selected = requestedTenantId ? active.filter(c => c.tenantId === requestedTenantId) : active;
  if (selected.length !== 1) throw new TenantAccessError("An active, unambiguous Tenant membership is required.");
  return selected[0];
}
export function authorizeStore(roles: TenantRole[], tenantId: string, store: { tenantId: string; status: string; hasActiveAccess: boolean }) {
  if (store.tenantId !== tenantId || store.status !== "active" || (!roles.includes("owner") && (!roles.some(r => r === "manager" || r === "seller") || !store.hasActiveAccess))) throw new TenantAccessError("Store access denied.");
}
export function validateIntakeRoute(route: { intakeKind: string; status: string; tenantStatus: string; tenantId: string; storeId: string | null }, kind: string) {
  // These two endpoints currently have approved tenant-level routing only.
  if (route.intakeKind !== kind || route.status !== "active" || route.tenantStatus !== "active" || route.storeId !== null) throw new TenantAccessError("Intake routing unavailable.");
  return { tenantId: route.tenantId, storeId: null };
}
