import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { TenantAccessError } from "../tenant-context";
import { resolveTenantContext } from "../tenant-runtime";
import { IdentityConflictError, isIdentityConflict, resolveConfirmedIdentity, type ConfirmedIdentitySource } from "./contracts";

export type IdentityOrigins = { tenantId?: string; customerId?: string; buyerProfileId?: string; leadId?: string; matchId?: string };

// Tenant selection is validated against the authenticated Membership, never trusted as a grant.
export async function resolveCommercialIdentity(input: IdentityOrigins) {
  const context = await resolveTenantContext(input.tenantId);
  return getDb().transaction(async tx => {
    const sources: ConfirmedIdentitySource[] = [];
    async function profile(id: string, origin: string) {
      const rows = await tx.execute(sql`select b.customer_id as "customerId" from public.buyer_profiles b where b.id=${id} and b.tenant_id=${context.tenantId} for share of b`);
      if (!rows[0]) throw new TenantAccessError("Identity origin unavailable in authorized Tenant.");
      sources.push({ origin, customerId: rows[0].customerId as string | null });
    }
    if (input.customerId) {
      const rows = await tx.execute(sql`select id from public.customers where id=${input.customerId} and tenant_id=${context.tenantId} for share`);
      if (!rows[0]) throw new TenantAccessError("Customer unavailable in authorized Tenant.");
      sources.push({ origin: "customer", customerId: input.customerId });
    }
    if (input.buyerProfileId) await profile(input.buyerProfileId, "buyer_profile");
    if (input.matchId) {
      const rows = await tx.execute(sql`select m.buyer_profile_id as "buyerProfileId" from public.vehicle_matches m join public.buyer_profiles b on b.id=m.buyer_profile_id where m.id=${input.matchId} and b.tenant_id=${context.tenantId} for share of m,b`);
      if (!rows[0]) throw new TenantAccessError("Match unavailable in authorized Tenant.");
      await profile(rows[0].buyerProfileId as string, "match");
    }
    if (input.leadId) {
      // Lock the Lead root, which also serializes all mapping confirmations/corrections.
      const roots = await tx.execute(sql`select id from public.trade_ins where id=${input.leadId} and tenant_id=${context.tenantId} for share`);
      if (!roots[0]) throw new TenantAccessError("Lead unavailable in authorized Tenant.");
      const rows = await tx.execute(sql`select customer_id as "customerId" from public.lead_customer_links where lead_id=${input.leadId} and tenant_id=${context.tenantId}`);
      sources.push({ origin: "lead", customerId: rows[0] ? rows[0].customerId as string : null });
    }
    return { ...resolveConfirmedIdentity(sources), tenantId: context.tenantId };
  });
}

export async function confirmCommercialIdentity(input: {
  tenantId?: string; kind: "buyer_profile" | "lead"; originId: string;
  customerId: string | null; expectedCustomerId: string | null; reason: string; source: string;
}) {
  const context = await resolveTenantContext(input.tenantId);
  if (!input.reason.trim() || !input.source.trim() || input.reason.length > 1000 || input.source.length > 100) {
    throw new Error("Identity confirmation requires a bounded reason and source.");
  }
  try {
    const rows = await getDb().execute(sql`select public.confirm_commercial_identity(${input.kind},${input.originId},${input.customerId},${input.expectedCustomerId},${context.tenantId},${context.membershipId},${context.userId},${input.reason.trim()},${input.source.trim()}) as "eventId"`);
    return { eventId: rows[0].eventId as string, tenantId: context.tenantId };
  } catch (error) {
    if (isIdentityConflict(error)) {
      throw new IdentityConflictError("Confirmed identity changed; reload before correcting it.");
    }
    throw error;
  }
}
