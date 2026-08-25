import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { getDb } from "../../db/index.ts";
import { crmAuditLogs } from "../../db/schema.ts";
import { vehicleDataProvenance, vehicleEvidenceObservations } from "../../db/vehicle-intelligence-schema.ts";
import { vehicles } from "../../db/vehicle-schema.ts";
import { COMPONENT_OBSERVATION_TYPES, isTrustedVqiEvidenceSource, type TrustedVqiEvidenceSource, type VqiEvidenceType } from "./evidence.ts";
import { attachVehicleProvenance, calculateProvenanceValueHash } from "./provenance.ts";
import { calculateVehicleIntelligence } from "./scoring.ts";
import { persistVehicleIntelligenceSnapshot } from "./service.ts";

type AppDatabase = ReturnType<typeof getDb>;
type AppTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export type EvidenceActor = { id: string; email: string };
export type TrustedEvidenceContext = { source: TrustedVqiEvidenceSource; actor: EvidenceActor };
export type IngestVehicleEvidenceInput = {
  vehicleId: string;
  evidenceType: VqiEvidenceType;
  value: unknown;
  externalRef?: string;
  metadata?: Record<string, unknown>;
  supersedesObservationId?: string;
  capturedAt?: Date;
};

export class VehicleEvidenceError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const STATUS_VALUES: Partial<Record<VqiEvidenceType, ReadonlySet<string>>> = {
  inspectionStatus: new Set(["completed", "approved"]),
  documentStatus: new Set(["critical", "rejected", "irregular", "bad", "attention", "fair", "pending", "good", "regular", "approved", "excellent"]),
  vehicleCondition: new Set(["critical", "rejected", "irregular", "bad", "attention", "fair", "pending", "good", "regular", "approved", "excellent"]),
};

function canonicalEvidenceValue(evidenceType: VqiEvidenceType, value: unknown): string | number {
  if (COMPONENT_OBSERVATION_TYPES.has(evidenceType)) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
      throw new VehicleEvidenceError("A observação do componente deve ser um inteiro entre 0 e 100.");
    }
    return value;
  }
  if (typeof value !== "string") throw new VehicleEvidenceError("A observação de estado deve ser textual.");
  const normalized = value.trim().toLowerCase();
  if (!STATUS_VALUES[evidenceType]?.has(normalized)) throw new VehicleEvidenceError("Valor de evidência não reconhecido para este tipo.");
  return normalized;
}

function cleanExternalRef(value: string | undefined): string {
  const normalized = String(value ?? "").trim();
  if (normalized.length > 200) throw new VehicleEvidenceError("A referência externa deve ter no máximo 200 caracteres.");
  return normalized;
}

function observationId(): string {
  return `vehicle-evidence:${crypto.randomUUID()}`;
}

function provenanceId(vehicleId: string, fieldName: string): string {
  return `vehicle-provenance:${createHash("sha256").update(`${vehicleId}\0${fieldName}`).digest("hex")}`;
}

export function prepareTrustedEvidence(
  input: IngestVehicleEvidenceInput,
  context: TrustedEvidenceContext,
) {
  if (!isTrustedVqiEvidenceSource(input.evidenceType, context.source)) {
    throw new VehicleEvidenceError("A fonte autenticada não é confiável para este tipo de evidência.", 403);
  }
  if (!context.actor.id || !context.actor.email) throw new VehicleEvidenceError("Verificador autenticado inválido.", 403);
  const value = canonicalEvidenceValue(input.evidenceType, input.value);
  return {
    value,
    valueHash: calculateProvenanceValueHash(value),
    confidence: typeof value === "number" ? value : 100,
    externalRef: cleanExternalRef(input.externalRef),
    capturedAt: input.capturedAt ?? new Date(),
    metadata: input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : {},
  };
}

async function assertColumnEvidenceMatchesVehicle(
  vehicle: Record<string, unknown>,
  evidenceType: VqiEvidenceType,
  value: string | number,
) {
  if (COMPONENT_OBSERVATION_TYPES.has(evidenceType)) return;
  const current = String(vehicle[evidenceType] ?? "").trim().toLowerCase();
  if (current !== value) throw new VehicleEvidenceError("A evidência está obsoleta em relação ao valor atual do veículo.", 409);
}

export async function ingestTrustedVehicleEvidence(
  input: IngestVehicleEvidenceInput,
  context: TrustedEvidenceContext,
  database?: AppDatabase,
) {
  const db = database ?? (await import("../../db/index.ts")).getDb();
  const prepared = prepareTrustedEvidence(input, context);
  return db.transaction(async (tx) => ingestInTransaction(tx, input, context, prepared));
}

async function ingestInTransaction(
  tx: AppTransaction,
  input: IngestVehicleEvidenceInput,
  context: TrustedEvidenceContext,
  prepared: ReturnType<typeof prepareTrustedEvidence>,
) {
  const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, input.vehicleId)).for("update").limit(1);
  if (!vehicle) throw new VehicleEvidenceError("Veículo não encontrado.", 404);
  await assertColumnEvidenceMatchesVehicle(vehicle, input.evidenceType, prepared.value);

  const allBefore = await tx.select().from(vehicleEvidenceObservations).where(eq(vehicleEvidenceObservations.vehicleId, input.vehicleId));
  if (prepared.externalRef) {
    const existing = allBefore.find((row) =>
      row.evidenceType === input.evidenceType &&
      row.source === context.source &&
      row.externalRef === prepared.externalRef
    );
    if (existing) {
      if (existing.valueHash !== prepared.valueHash || existing.supersedesObservationId !== (input.supersedesObservationId || null)) {
        throw new VehicleEvidenceError("A identidade externa já foi usada com conteúdo diferente.", 409);
      }
      return { observationId: existing.id, idempotent: true, persistedScores: 0 };
    }
  }
  if (input.supersedesObservationId) {
    const previous = allBefore.find((row) => row.id === input.supersedesObservationId);
    if (!previous || previous.evidenceType !== input.evidenceType) throw new VehicleEvidenceError("A observação substituída é inválida ou pertence a outro contexto.", 409);
    if (allBefore.some((row) => row.supersedesObservationId === previous.id)) throw new VehicleEvidenceError("A observação informada já foi substituída.", 409);
  }

  const now = new Date();
  const candidate = {
    id: observationId(),
    vehicleId: input.vehicleId,
    evidenceType: input.evidenceType,
    value: prepared.value,
    valueHash: prepared.valueHash,
    source: context.source,
    confidence: prepared.confidence,
    verified: true,
    externalRef: prepared.externalRef,
    metadata: prepared.metadata,
    submittedBy: context.actor.id,
    verifiedBy: context.actor.id,
    capturedAt: prepared.capturedAt,
    verifiedAt: now,
    supersedesObservationId: input.supersedesObservationId || null,
    createdAt: now,
  };
  const inserted = await tx.insert(vehicleEvidenceObservations).values(candidate).onConflictDoNothing().returning();
  if (!inserted.length) {
    if (!prepared.externalRef) throw new VehicleEvidenceError("Conflito ao registrar evidência sem identidade externa.", 409);
    const [existing] = await tx.select().from(vehicleEvidenceObservations).where(and(
      eq(vehicleEvidenceObservations.vehicleId, input.vehicleId),
      eq(vehicleEvidenceObservations.evidenceType, input.evidenceType),
      eq(vehicleEvidenceObservations.source, context.source),
      eq(vehicleEvidenceObservations.externalRef, prepared.externalRef),
    )).limit(1);
    if (!existing || existing.valueHash !== prepared.valueHash || existing.supersedesObservationId !== (input.supersedesObservationId || null)) {
      throw new VehicleEvidenceError("A identidade externa já foi usada com conteúdo diferente.", 409);
    }
    return { observationId: existing.id, idempotent: true, persistedScores: 0 };
  }

  await tx.insert(vehicleDataProvenance).values({
    id: provenanceId(input.vehicleId, input.evidenceType),
    vehicleId: input.vehicleId,
    fieldName: input.evidenceType,
    valueHash: candidate.valueHash,
    source: candidate.source,
    confidence: candidate.confidence,
    verified: true,
    verifiedAt: candidate.verifiedAt,
    observationId: candidate.id,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [vehicleDataProvenance.vehicleId, vehicleDataProvenance.fieldName],
    set: {
      valueHash: candidate.valueHash,
      source: candidate.source,
      confidence: candidate.confidence,
      verified: true,
      verifiedAt: candidate.verifiedAt,
      observationId: candidate.id,
      updatedAt: now,
    },
  });

  const [provenance, observations] = await Promise.all([
    tx.select().from(vehicleDataProvenance).where(eq(vehicleDataProvenance.vehicleId, input.vehicleId)),
    tx.select().from(vehicleEvidenceObservations).where(eq(vehicleEvidenceObservations.vehicleId, input.vehicleId)),
  ]);
  const scores = calculateVehicleIntelligence({
    ...attachVehicleProvenance(vehicle, provenance, observations),
    calculatedAt: now.toISOString(),
  });
  const persistedScores = await persistVehicleIntelligenceSnapshot({ vehicleId: input.vehicleId, scores, transactionDb: tx });
  await tx.insert(crmAuditLogs).values({
    id: crypto.randomUUID(),
    actorUserId: context.actor.id,
    actorEmail: context.actor.email.toLowerCase(),
    action: "vehicle.evidence.verified",
    entityType: "vehicle_evidence_observation",
    entityId: candidate.id,
    detail: JSON.stringify({ vehicleId: input.vehicleId, evidenceType: input.evidenceType, source: context.source, externalRef: prepared.externalRef }),
  });
  return { observationId: candidate.id, idempotent: false, persistedScores };
}
