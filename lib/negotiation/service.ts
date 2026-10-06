import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { negotiations } from "../../db/negotiation-schema";
import { resolveTenantContext } from "../tenant-runtime";
import { initiationFailures, NegotiationInitiationError, validateCreateNegotiation, validateStartNegotiationFromMatch, validateReadNegotiationWorkspace, type CreateNegotiationInput, type StartNegotiationFromMatchInput, type NegotiationWorkspace } from "./contracts";

export async function startNegotiationFromMatch(input: StartNegotiationFromMatchInput): Promise<{ negotiationId: string; created: boolean }> {
  validateStartNegotiationFromMatch(input);
  const context = await resolveTenantContext(input.tenantId);
  try {
    return await getDb().transaction(async tx => {
      // Server-derived authority is rechecked and locked through persistence.
      // SQL resolves identity/vehicle and serializes initiation; no read token escapes.
      const rows = await tx.execute(sql`select * from public.start_negotiation_from_match(${randomUUID()},${context.tenantId},${context.membershipId},${context.userId},${input.responsibleMembershipId},${input.matchId},${input.leadId ?? null})`);
      const row = rows[0];
      if (!row || typeof row.negotiation_id !== "string" || typeof row.created !== "boolean") throw new Error("Match initiation did not return persisted state.");
      return { negotiationId: row.negotiation_id, created: row.created };
    }, { isolationLevel: "read committed" });
  } catch (error) {
    let current: unknown = error;
    const seen = new Set<unknown>();
    while (current && typeof current === "object" && !seen.has(current)) {
      seen.add(current);
      const failure = current as { hint?: string; cause?: unknown };
      const code = initiationFailures.find(value => value === failure.hint);
      if (code) throw new NegotiationInitiationError(code, error);
      current = failure.cause;
    }
    throw error;
  }
}

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

// Tenant-level root read only; no Store-scoped data or future write capability implied.
// Missing and foreign roots intentionally share the existing null/not-found semantics.
export async function readNegotiationWorkspace(id: string, requestedTenantId?: string): Promise<NegotiationWorkspace | null> {
  validateReadNegotiationWorkspace(id, requestedTenantId);
  const row = await readNegotiation(id, requestedTenantId);
  if (!row) return null;
  const unavailable = () => ({ state: "UNRESOLVED", reason: "CANONICAL_PERSISTENCE_NOT_ESTABLISHED" } as const);
  return {
    negotiation: {
      id: row.id, tenantId: row.tenantId, customerId: row.customerId,
      leadId: row.leadId, buyerProfileId: row.buyerProfileId, matchId: row.matchId,
      tenantVehicleId: row.tenantVehicleId, responsibleMembershipId: row.responsibleMembershipId,
      createdByMembershipId: row.createdByMembershipId, origin: row.origin,
      stage: row.stage, lifecycle: row.lifecycle, closureReason: row.closureReason,
      createdAt: row.createdAt, updatedAt: row.updatedAt, closedAt: row.closedAt, formalizedAt: row.formalizedAt,
    },
    sections: {
      events: unavailable(), notes: unavailable(), communications: unavailable(), tasks: unavailable(),
      nextAction: unavailable(), documentRequests: unavailable(), approvals: unavailable(),
      objections: unavailable(), checkout: unavailable(),
    },
  };
}
