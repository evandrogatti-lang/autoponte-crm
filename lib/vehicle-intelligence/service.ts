import {
  buildVehicleInputSnapshot,
  calculateInputSnapshotHash,
  calculateVehicleIntelligence,
  type VehicleIntelligenceResult,
  type VehicleScore,
} from "./scoring.ts";
import { attachVehicleProvenance } from "./provenance.ts";
import type { getDb } from "../../db/index.ts";

export type VehicleIntelligenceSnapshotRow = {
  id: string;
  vehicleId: string;
  scoreType: string;
  score: number;
  breakdown: string;
  confidence: number;
  status: string;
  version: string;
  calculatorVersion: string;
  components: unknown;
  reasonCodes: unknown;
  inputSnapshot: Record<string, unknown>;
  inputSnapshotHash: string;
  evidenceSummary: Record<string, unknown>;
  calculatedAt: string;
  createdAt?: Date;
};

type InsertBuilder = {
  values: (row: Record<string, unknown>) => {
    onConflictDoNothing: (target: unknown) => {
      execute: () => Promise<{ rowCount?: number }>;
    };
  };
};

type TransactionDb = {
  insert: (table: unknown) => InsertBuilder;
};

type DatabaseLike = {
  transaction?: (callback: (tx: TransactionDb) => Promise<void>) => Promise<void>;
  insert?: (table: unknown) => InsertBuilder;
};

type AppDatabase = ReturnType<typeof getDb>;
type AppTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

type AffectedRowResult = {
  count?: number;
  rowCount?: number;
  affectedRows?: number;
};

export function affectedRowCount(result: AffectedRowResult | unknown[] | undefined, fallback = 0): number {
  if (result && typeof result === "object") {
    const metadata = result as AffectedRowResult;
    for (const value of [metadata.count, metadata.rowCount, metadata.affectedRows]) {
      if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
    }
  }
  if (Array.isArray(result)) return result.length;
  return fallback;
}

export function buildVehicleScoreSnapshotId(vehicleId: string, score: VehicleScore): string {
  return `${vehicleId}:${score.scoreType}:${score.version}:${score.calculatorVersion}:${score.inputSnapshotHash}`;
}

export function toVehicleIntelligenceSnapshotRow(vehicleId: string, score: VehicleScore): VehicleIntelligenceSnapshotRow {
  const inputSnapshot = buildVehicleInputSnapshot(score.inputSnapshot as Record<string, unknown>);
  const inputSnapshotHash = calculateInputSnapshotHash(inputSnapshot);
  const scoreBreakdown = {
    scoreType: score.scoreType,
    score: score.score,
    confidence: score.confidence,
    status: score.status,
    version: score.version,
    calculatorVersion: score.calculatorVersion,
    components: score.components,
    reasonCodes: score.reasonCodes,
    missingEvidence: score.missingEvidence,
    inputSnapshot,
    inputSnapshotHash,
    calculatedAt: score.calculatedAt,
  };

  return {
    id: buildVehicleScoreSnapshotId(vehicleId, { ...score, inputSnapshotHash }),
    vehicleId,
    scoreType: score.scoreType,
    score: score.score,
    breakdown: JSON.stringify(scoreBreakdown),
    confidence: score.confidence,
    status: score.status,
    version: score.version,
    calculatorVersion: score.calculatorVersion,
    components: score.components,
    reasonCodes: score.reasonCodes,
    inputSnapshot,
    inputSnapshotHash,
    evidenceSummary: {
      reasonCodes: score.reasonCodes,
      missingEvidence: score.missingEvidence,
      components: score.components.map((component) => ({ key: component.key, available: component.available, score: component.score })),
    },
    calculatedAt: score.calculatedAt,
  };
}

export async function calculateVehicleIntelligenceByVehicleId(vehicleId: string): Promise<VehicleIntelligenceResult> {
  const { eq } = await import("drizzle-orm");
  const { getDb } = await import("../../db/index.ts");
  const { vehicles } = await import("../../db/vehicle-schema.ts");
  const { vehicleDataProvenance, vehicleEvidenceObservations } = await import("../../db/vehicle-intelligence-schema.ts");
  const db = getDb();
  const [[vehicle], provenance, observations] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1),
    db.select().from(vehicleDataProvenance).where(eq(vehicleDataProvenance.vehicleId, vehicleId)),
    db.select().from(vehicleEvidenceObservations).where(eq(vehicleEvidenceObservations.vehicleId, vehicleId)),
  ]);
  if (!vehicle) throw new Error(`Veículo ${vehicleId} não encontrado para recalcular inteligência.`);
  return calculateVehicleIntelligence(attachVehicleProvenance(vehicle, provenance, observations));
}

export type PersistVehicleIntelligenceSnapshotInput = {
  vehicleId: string;
  scores: VehicleIntelligenceResult;
  db?: DatabaseLike;
  transactionDb?: AppTransaction;
};

export async function persistVehicleIntelligenceSnapshot({
  vehicleId,
  scores,
  db,
  transactionDb,
}: PersistVehicleIntelligenceSnapshotInput): Promise<number> {
  const activeDb = db ?? (transactionDb ? undefined : (await import("../../db/index.ts")).getDb());
  const { vehicleScores } = await import("../../db/vehicle-intelligence-schema.ts");
  const rows = Object.values(scores).map((score) => toVehicleIntelligenceSnapshotRow(vehicleId, score));

  if (transactionDb) {
    let inserted = 0;
    for (const row of rows) {
      const result = await transactionDb
        .insert(vehicleScores)
        .values({
          id: row.id,
          vehicleId: row.vehicleId,
          scoreType: row.scoreType,
          score: row.score,
          breakdown: row.breakdown,
          confidence: row.confidence,
          status: row.status,
          version: row.version,
          calculatorVersion: row.calculatorVersion,
          components: row.components,
          reasonCodes: row.reasonCodes,
          inputSnapshot: row.inputSnapshot,
          inputSnapshotHash: row.inputSnapshotHash,
          evidenceSummary: row.evidenceSummary,
          calculatedAt: new Date(row.calculatedAt),
          createdAt: new Date(),
        })
        .onConflictDoNothing({
          target: [
            vehicleScores.vehicleId,
            vehicleScores.scoreType,
            vehicleScores.version,
            vehicleScores.calculatorVersion,
            vehicleScores.inputSnapshotHash,
          ],
        })
        .execute() as AffectedRowResult | unknown[];
      if (affectedRowCount(result) > 0) inserted += 1;
    }
    return inserted;
  }

  const selectIfSupported = async (row: VehicleIntelligenceSnapshotRow) => {
    if (typeof (activeDb as { select?: unknown }).select !== "function") {
      return false;
    }
    const { and, eq } = await import("drizzle-orm");
    const existing = await (activeDb as typeof activeDb & {
      select: () => { from: (table: unknown) => { where: (condition: unknown) => { limit: (count: number) => Promise<unknown[]> } } };
    }).select().from(vehicleScores).where(and(
      eq(vehicleScores.vehicleId, row.vehicleId),
      eq(vehicleScores.scoreType, row.scoreType),
      eq(vehicleScores.version, row.version),
      eq(vehicleScores.calculatorVersion, row.calculatorVersion),
      eq(vehicleScores.inputSnapshotHash, row.inputSnapshotHash),
    )).limit(1);
    return Array.isArray(existing) && existing.length > 0;
  };

  if (!activeDb?.transaction) {
    if (!activeDb?.insert) {
      throw new Error("Database adapter sem suporte a insert para persistência de score.");
    }
    let inserted = 0;
    for (const row of rows) {
      try {
        if (await selectIfSupported(row)) {
          continue;
        }
        const result = await activeDb.insert(vehicleScores).values({
          id: row.id,
          vehicleId: row.vehicleId,
          scoreType: row.scoreType,
          score: row.score,
          breakdown: row.breakdown,
          confidence: row.confidence,
          status: row.status,
          version: row.version,
          calculatorVersion: row.calculatorVersion,
          components: row.components,
          reasonCodes: row.reasonCodes,
          inputSnapshot: row.inputSnapshot,
          inputSnapshotHash: row.inputSnapshotHash,
          evidenceSummary: row.evidenceSummary,
          calculatedAt: new Date(row.calculatedAt),
          createdAt: new Date(),
        }).onConflictDoNothing({
          target: [
            vehicleScores.vehicleId,
            vehicleScores.scoreType,
            vehicleScores.version,
            vehicleScores.calculatorVersion,
            vehicleScores.inputSnapshotHash,
          ],
        }).execute() as { rowCount?: number; count?: number } | undefined;
        if (affectedRowCount(result, 1) > 0) {
          inserted += 1;
        }
      } catch (error) {
        if (String(error).includes("duplicate") || String(error).includes("23505")) {
          continue;
        }
        throw error;
      }
    }
    return inserted;
  }

  let inserted = 0;
  await activeDb.transaction(async (tx) => {
    for (const row of rows) {
      try {
        const existing = typeof (tx as { select?: unknown }).select === "function"
          ? await (tx as typeof tx & {
              select: () => { from: (table: unknown) => { where: (condition: unknown) => { limit: (count: number) => Promise<unknown[]> } } };
            }).select().from(vehicleScores).where((await import("drizzle-orm")).and(
              (await import("drizzle-orm")).eq(vehicleScores.vehicleId, row.vehicleId),
              (await import("drizzle-orm")).eq(vehicleScores.scoreType, row.scoreType),
              (await import("drizzle-orm")).eq(vehicleScores.version, row.version),
              (await import("drizzle-orm")).eq(vehicleScores.calculatorVersion, row.calculatorVersion),
              (await import("drizzle-orm")).eq(vehicleScores.inputSnapshotHash, row.inputSnapshotHash),
            )).limit(1)
          : [];
        if (Array.isArray(existing) && existing.length > 0) {
          continue;
        }
        const result = await tx.insert(vehicleScores).values({
          id: row.id,
          vehicleId: row.vehicleId,
          scoreType: row.scoreType,
          score: row.score,
          breakdown: row.breakdown,
          confidence: row.confidence,
          status: row.status,
          version: row.version,
          calculatorVersion: row.calculatorVersion,
          components: row.components,
          reasonCodes: row.reasonCodes,
          inputSnapshot: row.inputSnapshot,
          inputSnapshotHash: row.inputSnapshotHash,
          evidenceSummary: row.evidenceSummary,
          calculatedAt: new Date(row.calculatedAt),
          createdAt: new Date(),
        }).onConflictDoNothing({
          target: [
            vehicleScores.vehicleId,
            vehicleScores.scoreType,
            vehicleScores.version,
            vehicleScores.calculatorVersion,
            vehicleScores.inputSnapshotHash,
          ],
        }).execute() as { rowCount?: number; count?: number } | undefined;
        if (affectedRowCount(result, 1) > 0) {
          inserted += 1;
        }
      } catch (error) {
        if (String(error).includes("duplicate") || String(error).includes("23505")) {
          continue;
        }
        throw error;
      }
    }
  });

  return inserted;
}

export async function recalculateAndPersistVehicleIntelligence(vehicleId: string): Promise<{ vehicleId: string; scores: VehicleIntelligenceResult; persisted: number }> {
  const result = await calculateVehicleIntelligenceByVehicleId(vehicleId);
  const persisted = await persistVehicleIntelligenceSnapshot({ vehicleId, scores: result });
  return { vehicleId, scores: result, persisted };
}
