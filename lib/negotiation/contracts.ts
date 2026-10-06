import type { negotiations } from "../../db/negotiation-schema";

type NegotiationRecord = typeof negotiations.$inferSelect;
export type NegotiationWorkspace = {
  negotiation: Pick<NegotiationRecord, "id" | "tenantId" | "customerId" | "leadId" | "buyerProfileId" | "matchId" | "tenantVehicleId" | "responsibleMembershipId" | "createdByMembershipId" | "origin" | "stage" | "lifecycle" | "closureReason" | "createdAt" | "updatedAt" | "closedAt" | "formalizedAt">;
  sections: Record<"events" | "notes" | "communications" | "tasks" | "nextAction" | "documentRequests" | "approvals" | "objections" | "checkout", {
    state: "UNRESOLVED";
    reason: "CANONICAL_PERSISTENCE_NOT_ESTABLISHED";
  }>;
};

export function validateReadNegotiationWorkspace(id: string, requestedTenantId?: string) {
  if (typeof id !== "string" || !id.trim()) throw new Error("Negotiation ID is required.");
  if (requestedTenantId !== undefined && (typeof requestedTenantId !== "string" || !requestedTenantId.trim())) {
    throw new Error("tenantId must be a nonempty reference.");
  }
}

export const manualOrigins = ["manual", "whatsapp", "phone", "walk_in", "marketplace", "reactivation"] as const;
export type ManualNegotiationOrigin = typeof manualOrigins[number];
export type CreateNegotiationInput = {
  tenantId?: string;
  customerId: string;
  responsibleMembershipId: string;
  origin: ManualNegotiationOrigin;
  leadId?: string;
  buyerProfileId?: string;
};

export type StartNegotiationFromMatchInput = {
  matchId: string;
  responsibleMembershipId: string;
  leadId?: string;
  tenantId?: string;
};

export function validateStartNegotiationFromMatch(input: StartNegotiationFromMatchInput) {
  const allowed = new Set(["matchId", "responsibleMembershipId", "leadId", "tenantId"]);
  if (!input || typeof input !== "object" || Object.keys(input).some(key => !allowed.has(key))) {
    throw new Error("Unsupported Match initiation input.");
  }
  for (const key of ["matchId", "responsibleMembershipId"] as const) {
    if (typeof input[key] !== "string" || !input[key].trim()) throw new Error(`${key} is required.`);
  }
  for (const key of ["leadId", "tenantId"] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || !input[key].trim())) throw new Error(`${key} must be a nonempty reference.`);
  }
}

export const initiationFailures = ["UNRESOLVED_CUSTOMER", "CONFLICT_CUSTOMER", "UNRESOLVED_VEHICLE", "VEHICLE_UNAVAILABLE", "NEGOTIATION_CONFLICT"] as const;
export class NegotiationInitiationError extends Error {
  constructor(public readonly code: typeof initiationFailures[number], cause: unknown) {
    super(code, { cause });
    this.name = "NegotiationInitiationError";
  }
}

// This primitive has no Match initiation, client-owned actor, vehicle, or lifecycle input.
export function validateCreateNegotiation(input: CreateNegotiationInput) {
  const allowed = new Set(["tenantId", "customerId", "responsibleMembershipId", "origin", "leadId", "buyerProfileId"]);
  if (!input || typeof input !== "object" || Object.keys(input).some(key => !allowed.has(key))) {
    throw new Error("Unsupported Negotiation creation input; Match creation requires AP-CRM-004V and AP-CRM-005.");
  }
  for (const key of ["customerId", "responsibleMembershipId"] as const) {
    if (typeof input[key] !== "string" || !input[key].trim()) throw new Error(`${key} is required.`);
  }
  for (const key of ["tenantId", "leadId", "buyerProfileId"] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || !input[key].trim())) throw new Error(`${key} must be a nonempty reference.`);
  }
  if (!manualOrigins.includes(input.origin)) throw new Error("Match creation is deferred; a supported manual origin is required.");
}
