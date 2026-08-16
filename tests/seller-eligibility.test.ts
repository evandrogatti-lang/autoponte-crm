import assert from "node:assert/strict";
import test from "node:test";
import { isSellerEligibleForOpportunity } from "../lib/seller-eligibility.ts";

const baseSeller = {
  availabilityStatus: "available",
  capacity: 1,
  activeAssignments: 0,
  specialties: ["honda", "suv", "seminovo"],
};

test("lead sem brand/model mantém vendedor elegível", () => {
  const eligible = isSellerEligibleForOpportunity(baseSeller, { brand: "", model: "" });
  assert.equal(eligible, true);
});

test("match de Honda é elegível", () => {
  const eligible = isSellerEligibleForOpportunity(baseSeller, { brand: "Honda", model: "HR-V" });
  assert.equal(eligible, true);
});

test("marca incompatível é inelegível", () => {
  const eligible = isSellerEligibleForOpportunity(baseSeller, { brand: "Toyota", model: "Corolla" });
  assert.equal(eligible, false);
});

test("vendedor indisponível é inelegível", () => {
  const eligible = isSellerEligibleForOpportunity(
    { ...baseSeller, availabilityStatus: "unavailable" },
    { brand: "Honda", model: "Civic" },
  );
  assert.equal(eligible, false);
});

test("vendedor sem capacidade é inelegível", () => {
  const eligible = isSellerEligibleForOpportunity(
    { ...baseSeller, activeAssignments: 1, capacity: 1 },
    { brand: "Honda", model: "Civic" },
  );
  assert.equal(eligible, false);
});
