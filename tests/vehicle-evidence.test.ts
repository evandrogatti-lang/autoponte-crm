import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  endpointSourceForEvidenceType,
  hasForgedTrustFields,
  isTrustedVqiEvidenceSource,
  VQI_EVIDENCE_PERMISSION,
  type VqiEvidenceType,
} from "../lib/vehicle-intelligence/evidence.ts";
import { prepareTrustedEvidence, VehicleEvidenceError } from "../lib/vehicle-intelligence/evidence-service.ts";
import { attachVehicleProvenance, calculateProvenanceValueHash } from "../lib/vehicle-intelligence/provenance.ts";
import { calculateVehicleIntelligence } from "../lib/vehicle-intelligence/scoring.ts";
import { affectedRowCount } from "../lib/vehicle-intelligence/service.ts";

const vehicle = {
  id: "vehicle-evidence-1",
  plate: "ABC1D23",
  inspectionStatus: "approved",
  documentStatus: "regular",
  vehicleCondition: "good",
};

function observation(overrides: Record<string, unknown> = {}) {
  return {
    id: "observation-1",
    vehicleId: vehicle.id,
    evidenceType: "mechanical",
    value: 88,
    valueHash: calculateProvenanceValueHash(88),
    source: "inspection",
    confidence: 88,
    verified: true,
    verifiedAt: new Date("2026-08-25T10:00:00Z"),
    supersedesObservationId: null,
    ...overrides,
  };
}

function provenance(overrides: Record<string, unknown> = {}) {
  return {
    vehicleId: vehicle.id,
    fieldName: "mechanical",
    valueHash: calculateProvenanceValueHash(88),
    source: "inspection",
    confidence: 88,
    verified: true,
    verifiedAt: new Date("2026-08-25T10:00:00Z"),
    observationId: "observation-1",
    ...overrides,
  };
}

test("uses the existing inventory permission and assigns endpoint trust server-side", () => {
  assert.equal(VQI_EVIDENCE_PERMISSION, "vehicles.manage");
  assert.equal(endpointSourceForEvidenceType("mechanical"), "inspection");
  assert.equal(endpointSourceForEvidenceType("documentStatus"), "document");
  assert.equal(endpointSourceForEvidenceType("provenance_maintenance"), "document");
  assert.equal(hasForgedTrustFields({ source: "inspection" }), true);
  assert.equal(hasForgedTrustFields({ verified: true }), true);
  assert.equal(hasForgedTrustFields({ confidence: 99 }), true);
  assert.equal(hasForgedTrustFields({ evidenceType: "mechanical", value: 88 }), false);
});

test("enforces the VQI trust matrix", () => {
  const allowed: Record<VqiEvidenceType, string[]> = {
    inspectionStatus: ["inspection"],
    documentStatus: ["document"],
    vehicleCondition: ["inspection", "photo_ai"],
    mechanical: ["inspection"],
    structural: ["inspection"],
    wear: ["inspection"],
    provenance_maintenance: ["document", "manufacturer"],
  };
  for (const [type, sources] of Object.entries(allowed) as [VqiEvidenceType, string[]][]) {
    for (const source of ["manual", "document", "inspection", "manufacturer", "photo_ai"]) {
      assert.equal(isTrustedVqiEvidenceSource(type, source), sources.includes(source), `${type}/${source}`);
    }
  }
});

test("canonicalizes trusted values and derives confidence without client trust fields", () => {
  const component = prepareTrustedEvidence({ vehicleId: vehicle.id, evidenceType: "mechanical", value: 88 }, {
    source: "inspection",
    actor: { id: "user-1", email: "inspector@example.com" },
  });
  assert.equal(component.value, 88);
  assert.equal(component.confidence, 88);
  const status = prepareTrustedEvidence({ vehicleId: vehicle.id, evidenceType: "documentStatus", value: " Regular " }, {
    source: "document",
    actor: { id: "user-1", email: "inspector@example.com" },
  });
  assert.equal(status.value, "regular");
  assert.equal(status.confidence, 100);
  assert.throws(() => prepareTrustedEvidence({ vehicleId: vehicle.id, evidenceType: "mechanical", value: 101 }, {
    source: "inspection", actor: { id: "user-1", email: "inspector@example.com" },
  }), VehicleEvidenceError);
  assert.throws(() => prepareTrustedEvidence({ vehicleId: vehicle.id, evidenceType: "mechanical", value: 88 }, {
    source: "document", actor: { id: "user-1", email: "inspector@example.com" },
  }), /fonte autenticada não é confiável/);
});

test("binds component evidence only through a valid referenced observation", () => {
  const attached = attachVehicleProvenance(vehicle, [provenance()], [observation()]);
  assert.deepEqual(attached.provenance.mechanical, { source: "inspection", confidence: 88, verified: true });
  assert.equal(calculateVehicleIntelligence(attached).VQI.score, 88);
});

test("fails closed for unverified, stale, superseded, cross-vehicle, and hash-mismatched observations", () => {
  const cases = [
    { rows: [provenance({ verified: false })], observations: [observation()] },
    { rows: [provenance()], observations: [observation({ verified: false })] },
    { rows: [provenance()], observations: [observation({ vehicleId: "other-vehicle" })] },
    { rows: [provenance({ valueHash: "wrong" })], observations: [observation()] },
    { rows: [provenance()], observations: [observation({ valueHash: "wrong" })] },
    { rows: [provenance()], observations: [observation(), observation({ id: "observation-2", supersedesObservationId: "observation-1" })] },
    { rows: [provenance({ observationId: "missing" })], observations: [observation()] },
  ];
  for (const item of cases) {
    const attached = attachVehicleProvenance(vehicle, item.rows, item.observations);
    assert.equal(attached.provenance.mechanical, undefined);
    assert.equal(calculateVehicleIntelligence(attached).VQI.score, 0);
  }
});

test("preserves legacy column-bound provenance and unchanged scoring output", () => {
  const legacy = {
    vehicleId: vehicle.id,
    fieldName: "documentStatus",
    valueHash: calculateProvenanceValueHash("regular"),
    source: "document",
    confidence: 92,
    verified: true,
    verifiedAt: new Date("2026-08-25T10:00:00Z"),
    observationId: null,
  };
  const before = calculateVehicleIntelligence({ ...vehicle, provenance: { documentStatus: { source: "document", confidence: 92, verified: true } } });
  const after = calculateVehicleIntelligence(attachVehicleProvenance(vehicle, [legacy]));
  assert.deepEqual(
    { score: after.VQI.score, confidence: after.VQI.confidence, status: after.VQI.status, components: after.VQI.components },
    { score: before.VQI.score, confidence: before.VQI.confidence, status: before.VQI.status, components: before.VQI.components },
  );
  assert.equal(after.VQI.score, 75);
});

test("keeps migration 0015 additive and enforces the external idempotency identity", async () => {
  const migration = await readFile(new URL("../drizzle/0015_vehicle_evidence_observations.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.vehicle_evidence_observations/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS observation_id/i);
  assert.match(migration, /ON public\.vehicle_evidence_observations\(vehicle_id, evidence_type, source, external_ref\)/i);
  assert.match(migration, /WHERE external_ref <> ''/i);
  assert.match(migration, /observation_id text REFERENCES public\.vehicle_evidence_observations\(id\) ON DELETE RESTRICT/i);
  assert.doesNotMatch(migration, /UPDATE public\.vehicle_data_provenance/i);
  assert.doesNotMatch(migration, /ALTER COLUMN observation_id SET NOT NULL/i);
});

test("maps authorization to the existing inventory role instead of adding a role", async () => {
  const accessMigration = await readFile(new URL("../supabase/007_access_control.sql", import.meta.url), "utf8");
  assert.match(accessMigration, /'role_inventory','inventory','Estoque e avaliação'/);
  assert.match(accessMigration, /'role_inventory','vehicles\.manage'/);
  assert.equal(VQI_EVIDENCE_PERMISSION, "vehicles.manage");
});

test("normalizes affected-row metadata across supported database adapters", () => {
  assert.equal(affectedRowCount(Object.assign([], { count: 1 })), 1);
  assert.equal(affectedRowCount({ rowCount: 1 }), 1);
  assert.equal(affectedRowCount({ affectedRows: 1 }), 1);
  assert.equal(affectedRowCount([{}]), 1);
  assert.equal(affectedRowCount(Object.assign([], { count: 0 })), 0);
  assert.equal(affectedRowCount(undefined, 1), 1);
});

test("keeps migration 0016 additive, idempotent, and aligned with the vehicle schema", async () => {
  const migration = await readFile(new URL("../drizzle/0016_vehicle_registry_intelligence_columns.sql", import.meta.url), "utf8");
  const columns = [
    "transmission", "body_type", "doors", "engine", "power", "renavam", "registration_state",
    "document_status", "vehicle_condition", "inspection_status", "acquisition_date", "listing_date", "optional_items",
  ];
  for (const column of columns) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`, "i"));
  }
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)/i);
  assert.doesNotMatch(migration, /UPDATE\s+public\.vehicles/i);
  assert.doesNotMatch(migration, /ALTER\s+COLUMN/i);
});
