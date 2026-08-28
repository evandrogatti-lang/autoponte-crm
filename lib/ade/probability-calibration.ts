import type { Momentum, OpportunityStage } from "./types.ts";
import { clamp } from "./utils.ts";

const stageBaseRate: Record<OpportunityStage, number> = {
  new: 24,
  contacted: 39,
  qualified: 57,
  store: 68,
  proposal: 79,
  closed: 100,
};

const stageFloor: Record<OpportunityStage, number> = {
  new: 8,
  contacted: 16,
  qualified: 28,
  store: 38,
  proposal: 48,
  closed: 100,
};

const stageCeiling: Record<OpportunityStage, number> = {
  new: 68,
  contacted: 79,
  qualified: 89,
  store: 94,
  proposal: 97,
  closed: 100,
};

export function calibrateClosingProbability(
  rawChance: number,
  stage: OpportunityStage,
  confidenceScore: number,
  momentum: Momentum,
  status?: string,
) {
  if (status === "lost") return 0;
  if (status === "closed" || (stage === "closed" && !status)) return 100;

  const confidenceWeight = Math.min(0.86, Math.max(0.22, confidenceScore / 100));
  const base = stageBaseRate[stage];
  const evidenceAdjusted = base + (rawChance - base) * confidenceWeight;
  const momentumAdjustment = momentum === "accelerating" ? 4 : momentum === "decelerating" ? -7 : 0;
  const uncertaintyPenalty = confidenceScore < 55 ? (55 - confidenceScore) * 0.18 : 0;

  return clamp(
    evidenceAdjusted + momentumAdjustment - uncertaintyPenalty,
    stageFloor[stage],
    stageCeiling[stage],
  );
}
