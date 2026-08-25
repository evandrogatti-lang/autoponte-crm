import assert from "node:assert/strict";
import test from "node:test";
import {
  attachVehicleProvenance,
  buildAutomaticVehicleProvenance,
  buildVerifiedFipeBackfill,
  calculateProvenanceValueHash,
  filterChangedVehicleProvenance,
  hasVehicleIntelligenceDataChanges,
  mergeVehicleProvenance,
} from "../lib/vehicle-intelligence/provenance.ts";
import { calculateVehicleIntelligence } from "../lib/vehicle-intelligence/scoring.ts";

const quote = {
  price: 118000,
  priceFormatted: "R$ 118.000,00",
  brand: "Volkswagen",
  model: "T-Cross Comfortline",
  modelYear: 2024,
  fuel: "Gasolina",
  fipeCode: "005544-1",
  referenceMonth: "agosto de 2026",
};

const vehicle = {
  id: "vehicle-4b",
  sourceType: "partner_inventory",
  plate: "ABC1D23",
  chassis: "9BWZZZ377VT004251",
  stockCode: "AP-4B",
  brandCode: "59",
  modelCode: "5940",
  yearCode: "2024-1",
  brand: quote.brand,
  model: quote.model,
  modelYear: quote.modelYear,
  fuel: quote.fuel,
  fipeCode: quote.fipeCode,
  fipeReferenceMonth: quote.referenceMonth,
  fipeValue: quote.price,
  mileage: 12000,
  color: "Preto",
  transmission: "Automático",
  bodyType: "SUV",
  doors: 4,
  engine: "1.0",
  power: "128 cv",
  renavam: "12345678901",
  registrationState: "SP",
  documentStatus: "regular",
  vehicleCondition: "good",
  inspectionStatus: "approved",
  acquisitionDate: "2026-01-01",
  listingDate: "2026-01-15",
  optionalItems: "Ar-condicionado",
  city: "São Paulo",
  ownerName: "AutoPonte",
  askingPrice: 120000,
  acquisitionCost: 100000,
  additionalCosts: 2000,
};

test("captures only explicit manual fields and verified FIPE response fields", () => {
  const capturedAt = new Date("2026-08-24T10:00:00.000Z");
  const entries = buildAutomaticVehicleProvenance({
    vehicleId: vehicle.id,
    vehicle,
    submittedFields: new Set(["plate", "documentStatus", "inspectionStatus", "notes"]),
    fipeQuote: quote,
    capturedAt,
  });

  const plate = entries.find((entry) => entry.fieldName === "plate");
  const documentStatus = entries.find((entry) => entry.fieldName === "documentStatus");
  const inspectionStatus = entries.find((entry) => entry.fieldName === "inspectionStatus");
  const brand = entries.find((entry) => entry.fieldName === "brand");

  assert.deepEqual(
    { source: plate?.source, confidence: plate?.confidence, verified: plate?.verified },
    { source: "manual", confidence: 55, verified: false },
  );
  assert.equal(documentStatus?.source, "manual");
  assert.equal(documentStatus?.verified, false);
  assert.equal(inspectionStatus?.source, "manual");
  assert.equal(inspectionStatus?.verified, false);
  assert.equal(entries.some((entry) => entry.fieldName === "notes"), false);
  assert.deepEqual(
    { source: brand?.source, confidence: brand?.confidence, verified: brand?.verified, verifiedAt: brand?.verifiedAt },
    { source: "fipe", confidence: 95, verified: true, verifiedAt: capturedAt },
  );
});

test("does not manufacture provenance when an edit resubmits unchanged values", () => {
  const unchanged = buildAutomaticVehicleProvenance({
    vehicleId: vehicle.id,
    vehicle: { ...vehicle },
    previousVehicle: vehicle,
    submittedFields: new Set(["plate", "mileage", "documentStatus"]),
  });
  assert.deepEqual(unchanged, []);

  const changed = buildAutomaticVehicleProvenance({
    vehicleId: vehicle.id,
    vehicle: { ...vehicle, mileage: 12500 },
    previousVehicle: vehicle,
    submittedFields: new Set(["mileage"]),
  });
  assert.deepEqual(changed.map((entry) => [entry.fieldName, entry.source, entry.verified]), [["mileage", "manual", false]]);
});

test("binds evidence to the exact value and ignores stale provenance", () => {
  const current = buildAutomaticVehicleProvenance({
    vehicleId: vehicle.id,
    vehicle,
    submittedFields: new Set(["plate"]),
  });
  const attached = attachVehicleProvenance(vehicle, current);
  assert.equal(attached.provenance.plate?.source, "manual");

  const changedVehicle = { ...vehicle, plate: "XYZ9A99" };
  const stale = attachVehicleProvenance(changedVehicle, current);
  assert.equal(stale.provenance.plate, undefined);
  assert.notEqual(calculateProvenanceValueHash(vehicle.plate), calculateProvenanceValueHash(changedVehicle.plate));
});

test("accepts historical FIPE provenance only after an exact live quote match", () => {
  const verifiedAt = new Date("2026-08-24T10:00:00.000Z");
  const exact = buildVerifiedFipeBackfill({ vehicleId: vehicle.id, vehicle, quote, verifiedAt });
  assert.equal(exact.length, 10);
  assert.equal(exact.every((entry) => entry.source === "fipe" && entry.verified), true);

  assert.deepEqual(
    buildVerifiedFipeBackfill({
      vehicleId: vehicle.id,
      vehicle: { ...vehicle, fipeValue: vehicle.fipeValue - 1 },
      quote,
      verifiedAt,
    }),
    [],
  );
  assert.deepEqual(
    buildVerifiedFipeBackfill({
      vehicleId: vehicle.id,
      vehicle: { ...vehicle, brandCode: "legacy-brand" },
      quote,
      verifiedAt,
    }),
    [],
  );
});

test("manual reports improve DCQ traceability without becoming verified VQI evidence", () => {
  const manual = buildAutomaticVehicleProvenance({
    vehicleId: vehicle.id,
    vehicle,
    submittedFields: new Set(["documentStatus", "vehicleCondition", "inspectionStatus"]),
  });
  const withManualEvidence = calculateVehicleIntelligence({
    ...attachVehicleProvenance(vehicle, manual),
    calculatedAt: "2026-08-24T10:00:00.000Z",
  });

  assert.ok(withManualEvidence.DCQ.confidence > 0);
  assert.equal(withManualEvidence.VQI.score, 0);
  assert.equal(withManualEvidence.VQI.confidence, 0);
});

test("FIPE provenance changes the semantic input once and remains deterministic", () => {
  const before = calculateVehicleIntelligence({ ...vehicle, calculatedAt: "2026-08-24T10:00:00.000Z" });
  const fipe = buildVerifiedFipeBackfill({ vehicleId: vehicle.id, vehicle, quote });
  const merged = mergeVehicleProvenance([], fipe);
  const after = calculateVehicleIntelligence({
    ...attachVehicleProvenance(vehicle, merged),
    calculatedAt: "2026-08-24T10:00:00.000Z",
  });
  const retry = calculateVehicleIntelligence({
    ...attachVehicleProvenance(vehicle, mergeVehicleProvenance(merged, fipe)),
    calculatedAt: "2026-08-24T15:00:00.000Z",
  });

  assert.notEqual(before.DCQ.inputSnapshotHash, after.DCQ.inputSnapshotHash);
  assert.equal(after.DCQ.inputSnapshotHash, retry.DCQ.inputSnapshotHash);
  assert.ok(after.DCQ.score > before.DCQ.score);
  assert.ok(after.DCQ.confidence > before.DCQ.confidence);
});

test("filters an identical provenance retry even when audit timestamps differ", () => {
  const first = buildVerifiedFipeBackfill({
    vehicleId: vehicle.id,
    vehicle,
    quote,
    verifiedAt: new Date("2026-08-24T10:00:00.000Z"),
  });
  const retry = buildVerifiedFipeBackfill({
    vehicleId: vehicle.id,
    vehicle,
    quote,
    verifiedAt: new Date("2026-08-25T10:00:00.000Z"),
  });

  assert.deepEqual(filterChangedVehicleProvenance(first, retry), []);
  assert.equal(
    calculateVehicleIntelligence({
      ...attachVehicleProvenance(vehicle, first),
      calculatedAt: "2026-08-24T10:00:00.000Z",
    }).DCQ.inputSnapshotHash,
    calculateVehicleIntelligence({
      ...attachVehicleProvenance(vehicle, retry),
      calculatedAt: "2026-08-24T15:00:00.000Z",
    }).DCQ.inputSnapshotHash,
  );
});

test("detects only scoring-input changes", () => {
  assert.equal(hasVehicleIntelligenceDataChanges(vehicle, { ...vehicle, notes: "Novo texto" }), false);
  assert.equal(hasVehicleIntelligenceDataChanges(vehicle, { ...vehicle, askingPrice: 121000 }), true);
  assert.equal(
    hasVehicleIntelligenceDataChanges(
      { ...vehicle, acquisitionDate: new Date("2026-01-01T00:00:00.000Z") },
      { ...vehicle, acquisitionDate: "2026-01-01" },
    ),
    false,
  );
});
