import { vehicleDataProvenance } from "../../db/vehicle-intelligence-schema.ts";
import type { getDb } from "../../db/index.ts";
import type { VehicleProvenanceEntry } from "./provenance.ts";

type AppDatabase = ReturnType<typeof getDb>;
type AppTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];
export type VehicleProvenanceDatabase = AppDatabase | AppTransaction;

export async function persistVehicleDataProvenance(
  db: VehicleProvenanceDatabase,
  entries: readonly VehicleProvenanceEntry[],
): Promise<number> {
  for (const entry of entries) {
    await db
      .insert(vehicleDataProvenance)
      .values(entry)
      .onConflictDoUpdate({
        target: [vehicleDataProvenance.vehicleId, vehicleDataProvenance.fieldName],
        set: {
          valueHash: entry.valueHash,
          source: entry.source,
          confidence: entry.confidence,
          verified: entry.verified,
          verifiedAt: entry.verifiedAt,
          observationId: entry.observationId ?? null,
          updatedAt: entry.updatedAt,
        },
      });
  }
  return entries.length;
}
