import assert from "node:assert/strict";
import test from "node:test";
import { formatVehicleIntelligenceCode } from "../lib/vehicle-intelligence/presentation.ts";
import { buildVehicleInputSnapshot, calculateInputSnapshotHash, calculateVehicleIntelligence, createVehicleScoreSnapshotIdentity, normalizeVehicleDate, type VehicleIntelligenceInput, vqiClassification } from "../lib/vehicle-intelligence/scoring.ts";
import { persistVehicleIntelligenceSnapshot, toVehicleIntelligenceSnapshotRow } from "../lib/vehicle-intelligence/service.ts";

const completeInput: VehicleIntelligenceInput = {
  id: "vehicle-1", sourceType: "autoponte_inventory", plate: "ABC1D23", chassis: "9BWZZZ377VT004251", stockCode: "AP-1",
  brand: "Volkswagen", model: "T-Cross", modelYear: 2024, fuel: "Flex", mileage: 12000, color: "Preto",
  transmission: "Automático", bodyType: "SUV", doors: 4, engine: "1.0", power: "128 cv", renavam: "12345678901",
  registrationState: "SP", documentStatus: "regular", vehicleCondition: "good", inspectionStatus: "approved",
  acquisitionDate: "2026-01-01", listingDate: "2026-01-15", optionalItems: '["ar-condicionado"]', city: "São Paulo",
  ownerName: "AutoPonte", askingPrice: 120000, acquisitionCost: 100000, additionalCosts: 2000, fipeValue: 118000,
  calculatedAt: "2026-02-01T00:00:00.000Z",
  provenance: {
    documentStatus: { source: "document", confidence: 92, verified: true },
    vehicleCondition: { source: "inspection", confidence: 85, verified: true },
    mechanical: { source: "inspection", confidence: 88, verified: true },
    structural: { source: "inspection", confidence: 86, verified: true },
    wear: { source: "inspection", confidence: 78, verified: true },
    provenance_maintenance: { source: "document", confidence: 82, verified: true },
  },
};

test("presents vehicle intelligence codes in Portuguese without exposing unknown codes", () => {
  assert.equal(formatVehicleIntelligenceCode("VQI_MECHANICAL_UNAVAILABLE"), "Dados mecânicos indisponíveis");
  assert.equal(formatVehicleIntelligenceCode("CVI_DEMAND_MATCH_UNAVAILABLE"), "Dados de demanda/match indisponíveis");
  assert.equal(formatVehicleIntelligenceCode("CVI_MARKET_PRICE_AVAILABLE"), "Preço de mercado disponível");
  assert.equal(formatVehicleIntelligenceCode("DCQ_IDENTIFICATION_WEAK_EVIDENCE"), "Evidências de identificação insuficientes");
  assert.equal(formatVehicleIntelligenceCode("FUTURE_INTERNAL_CODE"), "Informação de avaliação indisponível");
});

test("calculates bounded and versioned scores from complete evidence", () => {
  const scores = calculateVehicleIntelligence(completeInput);
  for (const score of Object.values(scores)) {
    assert.ok(score.score >= 0 && score.score <= 100);
    assert.ok(score.confidence >= 0 && score.confidence <= 100);
    assert.match(score.version, /-v[12]$/);
  }
  assert.equal(scores.DCI.score, 90);
  assert.equal(scores.VQI.status, "VERIFIED");
  assert.equal(vqiClassification(scores.VQI.score), "Muito bom");
  assert.equal(scores.DCI.components.reduce((total, component) => total + component.weight, 0), 100);
  assert.equal(scores.VQI.components.reduce((total, component) => total + component.weight, 0), 100);
  assert.equal(scores.CVI.components.reduce((total, component) => total + component.weight, 0), 100);
});

test("handles absent and weak evidence without NaN or invented VQI quality", () => {
  const scores = calculateVehicleIntelligence({ id: "vehicle-empty", calculatedAt: "2026-02-01T00:00:00.000Z" });
  assert.deepEqual(Object.values(scores).map((score) => score.score), [0, 0, 0, 0]);
  assert.equal(scores.VQI.status, "INSUFFICIENT_DATA");
  assert.equal(scores.VQI.components.every((component) => !component.available), true);
});

test("is deterministic for a fixed calculation instant and preserves unavailable CVI components", () => {
  const first = calculateVehicleIntelligence(completeInput);
  const second = calculateVehicleIntelligence(completeInput);
  assert.deepEqual(
    Object.values(first).map(({ score, confidence, status, version, components }) => ({ score, confidence, status, version, components })),
    Object.values(second).map(({ score, confidence, status, version, components }) => ({ score, confidence, status, version, components })),
  );
  assert.equal(first.CVI.components.find((component) => component.key === "demand_match")?.available, false);
});

test("keeps legacy provenance identifiable and limits low-confidence evidence", () => {
  const scores = calculateVehicleIntelligence({
    id: "legacy", plate: "ABC1D23", calculatedAt: "2026-02-01T00:00:00.000Z",
    provenance: { plate: { source: "legacy_migration", confidence: 20 } },
  });
  assert.equal(scores.DCQ.score, 20);
  assert.ok(scores.DCQ.missingEvidence.includes("DCQ_IDENTIFICATION_WEAK_EVIDENCE"));
});

test("does not verify DCQ from high field coverage without explicit trusted provenance", () => {
  const scores = calculateVehicleIntelligence({ ...completeInput, provenance: {} });
  assert.ok(scores.DCQ.score >= 40);
  assert.ok(scores.DCQ.confidence < 50);
  assert.equal(scores.DCQ.status, "INSUFFICIENT_DATA");
  assert.ok(scores.DCQ.reasonCodes.includes("DCQ_INSUFFICIENT_VERIFIED_EVIDENCE"));
});

test("canonicalizes JSON before hashing and treats semantic snapshots as idempotent", () => {
  const baseInput: VehicleIntelligenceInput = {
    ...completeInput,
    provenance: {
      documentStatus: { source: "document", confidence: 92, verified: true },
      vehicleCondition: { source: "inspection", confidence: 85, verified: true },
    },
  };

  const orderedInput: VehicleIntelligenceInput = {
    ...baseInput,
    provenance: {
      vehicleCondition: { source: "inspection", confidence: 85, verified: true },
      documentStatus: { source: "document", confidence: 92, verified: true },
    },
  };

  const sameHash = calculateInputSnapshotHash(buildVehicleInputSnapshot(baseInput));
  const reorderedHash = calculateInputSnapshotHash(buildVehicleInputSnapshot(orderedInput));
  assert.equal(sameHash, reorderedHash);

  const identityA = createVehicleScoreSnapshotIdentity({
    vehicleId: "vehicle-snapshot-1",
    scoreType: "DCQ",
    version: "dcq-v1",
    calculatorVersion: "vehicle-intelligence-4a.1",
    inputSnapshot: buildVehicleInputSnapshot(baseInput),
  });

  const identityB = createVehicleScoreSnapshotIdentity({
    vehicleId: "vehicle-snapshot-1",
    scoreType: "DCQ",
    version: "dcq-v1",
    calculatorVersion: "vehicle-intelligence-4a.1",
    inputSnapshot: buildVehicleInputSnapshot(orderedInput),
  });

  assert.deepEqual(identityA, identityB);
  assert.notEqual(identityA.inputSnapshotHash, calculateInputSnapshotHash(buildVehicleInputSnapshot({ ...baseInput, plate: "XYZ9A99" })));
  assert.notDeepEqual(
    identityA,
    createVehicleScoreSnapshotIdentity({
      vehicleId: "vehicle-snapshot-1",
      scoreType: "DCQ",
      version: "dcq-v2",
      calculatorVersion: "vehicle-intelligence-4a.1",
      inputSnapshot: buildVehicleInputSnapshot(baseInput),
    }),
  );
  assert.notDeepEqual(
    identityA,
    createVehicleScoreSnapshotIdentity({
      vehicleId: "vehicle-snapshot-1",
      scoreType: "DCQ",
      version: "dcq-v1",
      calculatorVersion: "vehicle-intelligence-4a.2",
      inputSnapshot: buildVehicleInputSnapshot(baseInput),
    }),
  );
  assert.equal(buildVehicleInputSnapshot(baseInput).referenceDate, "2026-02-01");
  assert.equal(
    calculateInputSnapshotHash(buildVehicleInputSnapshot({ ...baseInput, calculatedAt: "2026-02-01T23:59:59.999Z" })),
    calculateInputSnapshotHash(buildVehicleInputSnapshot(baseInput)),
  );
  assert.notEqual(
    calculateInputSnapshotHash(buildVehicleInputSnapshot({ ...baseInput, calculatedAt: "2026-02-02T00:00:00.000Z" })),
    calculateInputSnapshotHash(buildVehicleInputSnapshot(baseInput)),
  );
  assert.deepEqual(
    buildVehicleInputSnapshot({ ...baseInput, notes: "Não participa do cálculo", updatedAt: new Date("2026-03-01T00:00:00.000Z") }),
    buildVehicleInputSnapshot(baseInput),
  );
  const persisted = toVehicleIntelligenceSnapshotRow("vehicle-snapshot-1", calculateVehicleIntelligence(baseInput).DCQ);
  assert.equal(persisted.inputSnapshotHash, calculateInputSnapshotHash(persisted.inputSnapshot));
});

test("normalizes PostgreSQL Date, ISO strings, null and invalid vehicle dates", () => {
  assert.equal(normalizeVehicleDate(new Date("2026-08-17T00:00:00.000Z")), "2026-08-17");
  assert.equal(normalizeVehicleDate("2026-08-17"), "2026-08-17");
  assert.equal(normalizeVehicleDate("2026-08-17T00:00:00.000Z"), "2026-08-17");
  assert.equal(normalizeVehicleDate(null), null);
  assert.equal(normalizeVehicleDate(""), null);
  assert.equal(normalizeVehicleDate("data-inválida"), null);
  assert.equal(normalizeVehicleDate("2026-02-30"), null);
});

test("produces identical scores and hashes for Date, ISO and snapshot replay", () => {
  const calculationInstant = "2026-08-24T15:18:06.367Z";
  const dateInput: VehicleIntelligenceInput = {
    ...completeInput,
    acquisitionDate: new Date("2026-08-17T00:00:00.000Z"),
    listingDate: new Date("2026-08-20T00:00:00.000Z"),
    calculatedAt: calculationInstant,
  };
  const isoInput: VehicleIntelligenceInput = {
    ...completeInput,
    acquisitionDate: "2026-08-17T00:00:00.000Z",
    listingDate: "2026-08-20T00:00:00.000Z",
    calculatedAt: calculationInstant,
  };
  const fromDate = calculateVehicleIntelligence(dateInput);
  const fromIso = calculateVehicleIntelligence(isoInput);
  const replay = calculateVehicleIntelligence({
    ...(fromDate.DCI.inputSnapshot as VehicleIntelligenceInput),
    calculatedAt: calculationInstant,
  });

  assert.equal(fromDate.DCI.inputSnapshot.acquisitionDate, "2026-08-17");
  assert.equal(fromDate.CVI.inputSnapshot.listingDate, "2026-08-20");
  for (const scoreType of ["DCI", "DCQ", "VQI", "CVI"] as const) {
    const select = (scores: typeof fromDate) => ({
      score: scores[scoreType].score,
      confidence: scores[scoreType].confidence,
      status: scores[scoreType].status,
      inputSnapshotHash: scores[scoreType].inputSnapshotHash,
    });
    assert.deepEqual(select(fromDate), select(fromIso));
    assert.deepEqual(select(fromDate), select(replay));
  }
});

test("canonicalizes null and invalid dates to the same semantic snapshot", () => {
  const nullSnapshot = buildVehicleInputSnapshot({ ...completeInput, acquisitionDate: null, listingDate: null });
  const invalidSnapshot = buildVehicleInputSnapshot({ ...completeInput, acquisitionDate: "2026-02-30", listingDate: "inválida" });
  assert.deepEqual(nullSnapshot, invalidSnapshot);
  assert.equal(calculateInputSnapshotHash(nullSnapshot), calculateInputSnapshotHash(invalidSnapshot));
});

test("persists a full score batch atomically and rejects duplicate semantic snapshots", async () => {
  const scores = calculateVehicleIntelligence(completeInput);
  const rows = Object.values(scores).map((score) => toVehicleIntelligenceSnapshotRow("vehicle-atom", score));
  const state: Record<string, unknown>[] = [];
  const provenanceWrites: unknown[] = [];

  type FakeTx = {
    insert: (_table: unknown) => {
      values: (input: Record<string, unknown>) => {
        onConflictDoNothing: () => {
          execute: () => Promise<{ rowCount: number }>;
        };
      };
    };
  };

  const fakeDb = {
    rows: state,
    provenanceWrites,
    async transaction(work: (tx: FakeTx) => Promise<void>) {
      const previous = [...state];
      try {
        await work({
          insert() {
            return {
              values(input: Record<string, unknown>) {
                return {
                  onConflictDoNothing() {
                    return {
                      async execute() {
                        const key = [input.vehicleId, input.scoreType, input.version, input.calculatorVersion, input.inputSnapshotHash].join("::");
                        if (state.some((row) => [row.vehicleId, row.scoreType, row.version, row.calculatorVersion, row.inputSnapshotHash].join("::") === key)) {
                          return { rowCount: 0 };
                        }
                        state.push(input);
                        return { rowCount: 1 };
                      },
                    };
                  },
                };
              },
            };
          },
        });
      } catch (error) {
        state.splice(0, state.length, ...previous);
        throw error;
      }
    },
    insert() {
      return {
        values(input: Record<string, unknown>) {
          return {
            onConflictDoNothing() {
              return {
                async execute() {
                  const key = [input.vehicleId, input.scoreType, input.version, input.calculatorVersion, input.inputSnapshotHash].join("::");
                  if (state.some((row) => [row.vehicleId, row.scoreType, row.version, row.calculatorVersion, row.inputSnapshotHash].join("::") === key)) {
                    return { rowCount: 0 };
                  }
                  state.push(input);
                  return { rowCount: 1 };
                },
              };
            },
          };
        },
      };
    },
  };

  const persisted = await persistVehicleIntelligenceSnapshot({ vehicleId: "vehicle-atom", scores, db: fakeDb });
  assert.equal(persisted, 4);
  assert.equal(state.length, 4);
  assert.equal(provenanceWrites.length, 0);
  assert.deepEqual(rows.map((row) => row.vehicleId), ["vehicle-atom", "vehicle-atom", "vehicle-atom", "vehicle-atom"]);

  const sameReferenceDateScores = calculateVehicleIntelligence({
    ...completeInput,
    calculatedAt: "2026-02-01T23:59:59.999Z",
  });
  assert.equal(scores.CVI.inputSnapshotHash, sameReferenceDateScores.CVI.inputSnapshotHash);
  const repeated = await persistVehicleIntelligenceSnapshot({ vehicleId: "vehicle-atom", scores: sameReferenceDateScores, db: fakeDb });
  assert.equal(repeated, 0);
  assert.equal(state.length, 4);

  const firstAgingScores = calculateVehicleIntelligence({
    id: "vehicle-aging",
    listingDate: "2026-08-20",
    calculatedAt: "2026-08-24T10:00:00.000Z",
  });
  const secondAgingScores = calculateVehicleIntelligence({
    id: "vehicle-aging",
    listingDate: "2026-08-20",
    calculatedAt: "2026-08-25T10:00:00.000Z",
  });
  assert.equal(firstAgingScores.CVI.score, 94);
  assert.equal(secondAgingScores.CVI.score, 93);
  assert.notEqual(firstAgingScores.CVI.inputSnapshotHash, secondAgingScores.CVI.inputSnapshotHash);
  assert.equal(await persistVehicleIntelligenceSnapshot({ vehicleId: "vehicle-aging", scores: firstAgingScores, db: fakeDb }), 4);
  assert.equal(await persistVehicleIntelligenceSnapshot({ vehicleId: "vehicle-aging", scores: secondAgingScores, db: fakeDb }), 4);
  assert.equal(state.length, 12);
});

test("rolls back all inserts when a later score insert fails and keeps VQI zero values valid", async () => {
  const scores = calculateVehicleIntelligence({ id: "vehicle-empty", calculatedAt: "2026-02-01T00:00:00.000Z" });
  assert.equal(scores.VQI.score, 0);
  assert.equal(scores.VQI.confidence, 0);

  const state: Record<string, unknown>[] = [];
  let index = 0;
  type FakeTx = {
    insert: () => {
      values: (input: Record<string, unknown>) => {
        onConflictDoNothing: () => {
          execute: () => Promise<{ rowCount: number }>;
        };
      };
    };
  };

  const fakeDb = {
    async transaction(work: (tx: FakeTx) => Promise<void>) {
      const previous = [...state];
      try {
        await work({
          insert() {
            return {
              values(input: Record<string, unknown>) {
                return {
                  onConflictDoNothing() {
                    return {
                      async execute() {
                        index += 1;
                        if (index === 3) {
                          throw new Error("third insert failed");
                        }
                        state.push(input);
                        return { rowCount: 1 };
                      },
                    };
                  },
                };
              },
            };
          },
        });
      } catch (error) {
        state.splice(0, state.length, ...previous);
        throw error;
      }
    },
  };

  await assert.rejects(() => persistVehicleIntelligenceSnapshot({ vehicleId: "vehicle-empty", scores, db: fakeDb }), /third insert failed/);
  assert.equal(state.length, 0);
  const vqiRow = toVehicleIntelligenceSnapshotRow("vehicle-empty", scores.VQI);
  assert.equal(vqiRow.score, 0);
  assert.equal(vqiRow.confidence, 0);
  assert.equal(vqiRow.status, "INSUFFICIENT_DATA");
});

test("creates a new snapshot when the input or calculator version changes", async () => {
  const baseline = calculateVehicleIntelligence({ ...completeInput, id: "vehicle-versioned", calculatedAt: "2026-02-01T00:00:00.000Z" });
  const updatedInput = { ...completeInput, id: "vehicle-versioned", plate: "XYZ0A00", calculatedAt: "2026-02-01T00:00:00.000Z" };
  const updatedScores = calculateVehicleIntelligence(updatedInput);

  const firstRows = Object.values(baseline).map((score) => toVehicleIntelligenceSnapshotRow("vehicle-versioned", score));
  const secondRows = Object.values(updatedScores).map((score) => toVehicleIntelligenceSnapshotRow("vehicle-versioned", score));
  assert.notDeepEqual(firstRows.map((row) => row.inputSnapshotHash), secondRows.map((row) => row.inputSnapshotHash));

  const updatedVersionScores = calculateVehicleIntelligence({ ...completeInput, id: "vehicle-versioned", calculatedAt: "2026-02-01T00:00:00.000Z" });
  updatedVersionScores.DCI.version = "dci-v99";
  const changedVersionRows = Object.values(updatedVersionScores).map((score) => toVehicleIntelligenceSnapshotRow("vehicle-versioned", score));
  assert.notDeepEqual(firstRows.map((row) => row.version), changedVersionRows.map((row) => row.version));
});
