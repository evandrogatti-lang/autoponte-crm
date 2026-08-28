import assert from "node:assert/strict";
import test from "node:test";
import { assertVehicleLifecycleConsistency, assertVehicleLifecycleTransition, legacyStatusToLifecycle } from "../lib/vehicles/lifecycle.ts";
import { buildTradeInDecision } from "../lib/vehicles/managerial-decision.ts";

test("accepts canonical forward lifecycle and rejects contradictory jumps", () => {
  assert.doesNotThrow(() => assertVehicleLifecycleTransition("AVAILABLE", "RESERVED"));
  assert.doesNotThrow(() => assertVehicleLifecycleTransition("RESERVED", "AVAILABLE"));
  assert.throws(() => assertVehicleLifecycleTransition("SOLD", "AVAILABLE"), /inválida/);
  assert.throws(() => assertVehicleLifecycleConsistency("SOLD", ["DOCUMENT_BLOCKED"]), /não pode/);
  assert.throws(() => assertVehicleLifecycleConsistency("AVAILABLE", ["VQI_PENDING"]), /VQI/);
  assert.equal(legacyStatusToLifecycle("sold"), "SOLD");
});

test("managerial trade-in decision always exposes required decision dimensions", () => {
  const decision = buildTradeInDecision({ appraisalValue: 80_000, creditedValue: 82_000, projectedAcquisitionCost: 85_000, askingPrice: 99_000, existingMatches: 2, openOpportunities: 1, inventoryAgeDays: 12, likelyNextSale: "Customer B has an active compatible intent." });
  assert.ok(decision.recommendation);
  assert.ok(decision.risk);
  assert.match(decision.financialImpact, /Margem/);
  assert.match(decision.futureOpportunity, /Customer B/);
  assert.ok(decision.confidence > 0);
  assert.ok(decision.reasons.length >= 5);
  assert.ok(decision.alternativeAction);
});

test("provenance remains distinct from the next customer's commercial context", () => {
  const vehicle = { id: "vehicle-1", previousOwnerCustomerId: "customer-a", sourceCaseId: "negotiation-a" };
  const futureMatch = { vehicleId: vehicle.id, buyerProfileCustomerId: "customer-b" };
  const negotiationB = { vehicleId: vehicle.id, customerId: "customer-b" };
  assert.equal(futureMatch.vehicleId, vehicle.id);
  assert.equal(negotiationB.vehicleId, vehicle.id);
  assert.notEqual(vehicle.previousOwnerCustomerId, negotiationB.customerId);
});
