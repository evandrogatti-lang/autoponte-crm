import { calculateBusinessTemperature, calculateMomentum } from "./business-temperature";
import { assessConfidence } from "./confidence";
import { explainAssessment } from "./explainability";
import { buildOpportunityDNA } from "./opportunity-dna";
import { recommendNextAction } from "./recommendation";
import { ageInDays, average, clamp, temperatureLabel } from "./utils";
import type { BusinessTemperature, OpportunityAssessment, OpportunitySignals } from "./types";

export * from "./types";
export { buildFlowEngine } from "./flow-engine";

export function evaluateOpportunity(signals: OpportunitySignals, now = new Date()): OpportunityAssessment {
  const dna = buildOpportunityDNA(signals, now);
  const confidence = assessConfidence(signals, dna);
  const temperature = calculateBusinessTemperature(dna);
  const momentum = calculateMomentum(signals, now);
  const explainability = explainAssessment(signals, dna, now);
  const recommendation = recommendNextAction(signals, momentum, explainability, now);
  return {
    dna,
    confidence,
    temperature,
    momentum,
    explainability,
    recommendation,
    ageDays: ageInDays(signals.createdAt, now),
  };
}

export function aggregateBusinessTemperature(temperatures: BusinessTemperature[]): BusinessTemperature {
  const score = clamp(average(temperatures.map((item) => item.score)));
  const level = score >= 86 ? "critical" : score >= 72 ? "hot" : score >= 50 ? "warm" : "cold";
  return { score, level, label: temperatureLabel(level) };
}
