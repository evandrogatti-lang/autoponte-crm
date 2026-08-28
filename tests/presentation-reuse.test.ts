import assert from "node:assert/strict";
import test from "node:test";
import { formatBRL } from "../lib/presentation/formatters.ts";
import { vehicleLifecycleLabel, VEHICLE_STATUS_LABELS } from "../lib/vehicles/presentation.ts";

test("formatadores compartilhados mantêm apresentação brasileira", () => {
  assert.match(formatBRL(123_456), /123\.456/);
  assert.equal(formatBRL(undefined), formatBRL(0));
});

test("catálogo veicular traduz estados canônicos e preserva desconhecidos", () => {
  assert.equal(VEHICLE_STATUS_LABELS.available, "Disponível");
  assert.equal(vehicleLifecycleLabel("PUBLISHED"), "Publicado");
  assert.equal(vehicleLifecycleLabel("LEGACY_STATE"), "LEGACY_STATE");
});
