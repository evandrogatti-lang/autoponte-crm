import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { negotiations } from "../../db/negotiation-schema";
import { resolveTenantContext } from "../tenant-runtime";
import { validateCreateNegotiation, type CreateNegotiationInput } from "./contracts";

export async function createNegotiation(input: CreateNegotiationInput) {
  validateCreateNegotiation(input);
  const context = await resolveTenantContext(input.tenantId);
  const id = randomUUID();
  return getDb().transaction(async tx => {
    // Recheck and lock authorization and confirmed identities through insertion.
    // The invoker function is server-only; authenticated clients cannot supply its actor.
    await tx.execute(sql`select public.create_manual_negotiation(${id},${context.tenantId},${context.membershipId},${context.userId},${input.responsibleMembershipId},${input.customerId},${input.leadId ?? null},${input.buyerProfileId ?? null},${input.origin})`);
    const [row] = await tx.select().from(negotiations).where(and(eq(negotiations.id, id), eq(negotiations.tenantId, context.tenantId)));
    if (!row) throw new Error("Negotiation creation did not return persisted state.");
    return row;
  });
}

export async function readNegotiation(id: string, requestedTenantId?: string) {
  const context = await resolveTenantContext(requestedTenantId);
  const [row] = await getDb().select().from(negotiations).where(and(eq(negotiations.id, id), eq(negotiations.tenantId, context.tenantId)));
  return row ?? null;
}
