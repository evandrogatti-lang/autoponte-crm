import assert from "node:assert/strict";
import test from "node:test";
import { buildFlowEngine, evaluateOpportunity } from "../lib/ade/index.ts";

const NOW = new Date("2026-08-05T12:00:00.000Z");

const completeProposal = {
  id: "proposal-1",
  stage: "proposal" as const,
  leadCategory: "hot",
  estimatedMin: 102000,
  estimatedMax: 116000,
  referencePrice: 124000,
  createdAt: "2026-08-03T12:00:00.000Z",
  nextFollowUp: "2026-08-05T15:00:00.000Z",
  lastContactAt: "2026-08-05T10:00:00.000Z",
  desiredVehicle: "Jeep Compass",
  condition: "excellent",
  mileage: 42000,
  notes: "Cliente revisitou a proposta",
};

test("probabilidade ativa é calibrada e nunca chega a 100%", () => {
  const result = evaluateOpportunity(completeProposal, NOW);
  assert.ok(result.dna.chance >= 48);
  assert.ok(result.dna.chance <= 97);
  assert.notEqual(result.dna.chance, 100);
  assert.ok(result.explainability.reasons.some((reason) => reason.includes("calibrada")));
});

test("somente oportunidade fechada recebe 100%", () => {
  const result = evaluateOpportunity({ ...completeProposal, id: "closed-1", stage: "closed" }, NOW);
  assert.equal(result.dna.chance, 100);
});

test("baixa confiança reduz a chance estimada", () => {
  const complete = evaluateOpportunity(completeProposal, NOW);
  const incomplete = evaluateOpportunity({
    id: "proposal-incomplete",
    stage: "proposal",
    leadCategory: "hot",
    estimatedMin: 102000,
    estimatedMax: 116000,
    createdAt: "2026-08-03T12:00:00.000Z",
  }, NOW);

  assert.ok(complete.confidence.score > incomplete.confidence.score);
  assert.ok(complete.dna.chance > incomplete.dna.chance);
});

test("Flow Engine limita chance ponderada do pipeline ativo a 97%", () => {
  const flow = buildFlowEngine([
    {
      id: "1", stage: "proposal", value: 125000, probability: 100, priorityScore: 94, ageDays: 1,
      temperature: { score: 88, level: "critical", label: "Crítica" }, momentum: "accelerating",
    },
    {
      id: "2", stage: "qualified", value: 90000, probability: 92, priorityScore: 80, ageDays: 2,
      temperature: { score: 78, level: "hot", label: "Quente" }, momentum: "stable",
    },
    {
      id: "3", stage: "closed", value: 130000, probability: 100, priorityScore: 100, ageDays: 4,
      temperature: { score: 92, level: "critical", label: "Crítica" }, momentum: "stable",
    },
  ]);

  assert.ok(flow.weightedProbability <= 97);
  assert.ok(flow.stages.find((stage) => stage.key === "proposal")!.averageProbability <= 97);
  assert.equal(flow.stages.find((stage) => stage.key === "closed")!.averageProbability, 100);
});

test("Flow Engine mantém detecção de gargalo e risco financeiro", () => {
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

  assert.equal(flow.bottleneck.stage, "contacted");
  assert.equal(flow.atRiskCount, 2);
  assert.equal(flow.atRiskValue, 200000);
  assert.equal(flow.activeValue, 325000);
});
