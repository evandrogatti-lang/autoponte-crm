import assert from "node:assert/strict";
import test from "node:test";
import { buildFlowEngine, evaluateOpportunity } from "../lib/ade";

const NOW = new Date("2026-08-05T12:00:00.000Z");

test("ADE prioriza oportunidade quente e atrasada", () => {
  const result = evaluateOpportunity({
    id: "hot-1",
    stage: "proposal",
    leadCategory: "hot",
    estimatedMin: 102000,
    estimatedMax: 116000,
    referencePrice: 124000,
    createdAt: "2026-07-29T12:00:00.000Z",
    nextFollowUp: "2026-08-03T12:00:00.000Z",
    lastContactAt: "2026-07-28T12:00:00.000Z",
    desiredVehicle: "Jeep Compass",
    condition: "good",
    mileage: 62000,
  }, NOW);

  assert.ok(result.dna.priorityScore >= 70);
  assert.ok(["hot", "critical"].includes(result.temperature.level));
  assert.equal(result.momentum, "decelerating");
  assert.equal(result.recommendation.action, "Retomar agora");
  assert.ok(result.explainability.warnings.some((warning) => warning.includes("atrasado")));
});

test("Confidence Engine reage à completude dos dados", () => {
  const complete = evaluateOpportunity({
    id: "complete",
    stage: "qualified",
    leadCategory: "warm",
    estimatedMin: 80000,
    estimatedMax: 90000,
    referencePrice: 95000,
    createdAt: "2026-08-02T12:00:00.000Z",
    nextFollowUp: "2026-08-05T18:00:00.000Z",
    lastContactAt: "2026-08-05T10:00:00.000Z",
    desiredVehicle: "SUV automático",
    condition: "good",
    mileage: 45000,
  }, NOW);

  const incomplete = evaluateOpportunity({
    id: "incomplete",
    stage: "new",
    estimatedMin: 80000,
    estimatedMax: 90000,
    createdAt: "2026-08-02T12:00:00.000Z",
  }, NOW);

  assert.ok(complete.confidence.score > incomplete.confidence.score);
  assert.equal(complete.momentum, "accelerating");
  assert.ok(incomplete.confidence.missingSignals.length >= 4);
});

test("Flow Engine detecta gargalo, risco financeiro e próxima ação", () => {
  const flow = buildFlowEngine([
    {
      id: "1", stage: "contacted", value: 90000, probability: 48, priorityScore: 62, ageDays: 9,
      temperature: { score: 64, level: "warm", label: "Morna" }, momentum: "decelerating",
    },
    {
      id: "2", stage: "contacted", value: 110000, probability: 52, priorityScore: 76, ageDays: 7,
      temperature: { score: 69, level: "warm", label: "Morna" }, momentum: "decelerating",
    },
    {
      id: "3", stage: "proposal", value: 125000, probability: 88, priorityScore: 84, ageDays: 1,
      temperature: { score: 82, level: "hot", label: "Quente" }, momentum: "accelerating",
    },
  ]);

  const contacted = flow.stages.find((stage) => stage.key === "contacted");
  assert.equal(flow.bottleneck.stage, "contacted");
  assert.equal(contacted?.count, 2);
  assert.equal(contacted?.stalled, 2);
  assert.equal(contacted?.highPriority, 1);
  assert.equal(flow.atRiskCount, 2);
  assert.equal(flow.atRiskValue, 200000);
  assert.equal(flow.acceleratingCount, 1);
  assert.match(flow.bottleneck.nextAction, /retornos/i);
  assert.ok(flow.health.score >= 0 && flow.health.score <= 100);
  assert.equal(flow.activeValue, 325000);
});
