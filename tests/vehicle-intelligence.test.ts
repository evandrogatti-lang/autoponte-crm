import assert from "node:assert/strict";
import test from "node:test";
import { calculateVehicleIntelligence, type VehicleIntelligenceInput, vqiClassification } from "../lib/vehicle-intelligence/scoring.ts";

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
