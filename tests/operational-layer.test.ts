import assert from "node:assert/strict";
import test from "node:test";
import { evaluateOpportunity } from "../lib/ade";
import { buildMissionControl } from "../lib/mission-control/mapper";
import { parseOpportunityCommand } from "../lib/opportunities/domain";
import type { TradeInRow } from "../lib/mission-control/model";

const NOW = new Date("2026-08-05T12:00:00.000Z");

function row(overrides: Partial<TradeInRow> = {}): TradeInRow {
  return {
    id: "op-1",
    name: "Cliente real",
    city: "São Bernardo do Campo",
    brand: "Toyota",
    model: "Corolla",
    year: "2021",
    desiredVehicle: "Jeep Compass",
    estimatedMin: 98000,
    estimatedMax: 108000,
    referencePrice: 116000,
    mileage: 52000,
    condition: "good",
    status: "qualified",
    leadCategory: "hot",
    nextFollowUp: "2026-08-05T15:00:00.000Z",
    lastContactAt: "2026-08-05T10:00:00.000Z",
    notes: "Cliente confirmou interesse",
    createdAt: new Date("2026-08-02T12:00:00.000Z"),
    ...overrides,
  };
}

test("Mission Control vazio não injeta dados demonstrativos", () => {
  const model = buildMissionControl([], NOW);
  assert.equal(model.opportunities.length, 0);
  assert.equal(model.activeCount, 0);
  assert.equal(model.activeValue, 0);
  assert.equal(model.tradeInCount, 0);
});

test("oportunidade perdida recebe 0% e não entra no pipeline ativo", () => {
  const signals = {
    id: "lost-1",
    status: "lost",
    stage: "closed" as const,
    leadCategory: "hot",
    estimatedMin: 98000,
    estimatedMax: 108000,
    referencePrice: 116000,
    createdAt: "2026-08-02T12:00:00.000Z",
    desiredVehicle: "Jeep Compass",
  };
  const assessment = evaluateOpportunity(signals, NOW);
  assert.equal(assessment.dna.chance, 0);
  assert.equal(assessment.dna.priorityScore, 0);

  const model = buildMissionControl([row({ status: "lost" })], NOW);
  assert.equal(model.activeCount, 0);
  assert.equal(model.conversion, 0);
  assert.equal(model.flow.stages.find((stage) => stage.key === "closed")?.count, 0);
});

test("somente negócio fechado recebe 100% e conta conversão", () => {
  const model = buildMissionControl([row({ status: "closed" })], NOW);
  assert.equal(model.opportunities[0].probability, 100);
  assert.equal(model.conversion, 100);
  assert.equal(model.flow.stages.find((stage) => stage.key === "closed")?.count, 1);
});

test("comandos operacionais são validados e normalizados", () => {
  assert.deepEqual(parseOpportunityCommand({ action: "stage", status: "proposal" }), { action: "stage", status: "proposal" });
  assert.deepEqual(parseOpportunityCommand({ action: "contact", channel: " WhatsApp ", summary: " Falou com cliente " }), { action: "contact", channel: "WhatsApp", summary: "Falou com cliente" });
  const next = parseOpportunityCommand({ action: "next_action", label: " Retornar ", dueAt: "2026-08-06T10:00:00.000Z" });
  assert.equal(next.action, "next_action");
  if (next.action === "next_action") assert.equal(next.label, "Retornar");
  assert.throws(() => parseOpportunityCommand({ action: "stage", status: "invalid" }), /Etapa inválida/);
});

test("margem e recomendações vêm de registros reais", () => {
  const model = buildMissionControl([row()], NOW);
  assert.equal(model.opportunities.length, 1);
  assert.equal(model.opportunities[0].name, "Cliente real");
  assert.equal(model.opportunities[0].marginPotential, 13000);
  assert.equal(model.recommendations[0].opportunityId, "op-1");
});
