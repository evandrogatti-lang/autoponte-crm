import { calculateBusinessTemperature, calculateMomentum } from "./business-temperature.ts";
import { assessConfidence } from "./confidence.ts";
import { explainAssessment } from "./explainability.ts";
import { buildOpportunityDNA } from "./opportunity-dna.ts";
import { calibrateClosingProbability } from "./probability-calibration.ts";
import { recommendNextAction } from "./recommendation.ts";
import { ageInDays, average, clamp, temperatureLabel } from "./utils.ts";
import type { BusinessTemperature, OpportunityAssessment, OpportunitySignals } from "./types.ts";

export * from "./types.ts";
export { buildFlowEngine } from "./flow-engine.ts";
export { calibrateClosingProbability } from "./probability-calibration.ts";

export function evaluateOpportunity(signals: OpportunitySignals, now = new Date()): OpportunityAssessment {
  const rawDna = buildOpportunityDNA(signals, now);
  const preliminaryConfidence = assessConfidence(signals, rawDna);
  const momentum = calculateMomentum(signals, now);
  const dna = {
    ...rawDna,
    chance: calibrateClosingProbability(
      rawDna.chance,
      signals.stage,
      preliminaryConfidence.score,
      momentum,
      signals.status,
    ),
  };

  if (signals.status === "lost") {
    const confidence = assessConfidence(signals, { ...dna, priorityScore: 0 });
    return {
      dna: { ...dna, chance: 0, priorityScore: 0 },
      confidence,
      temperature: { score: 0, level: "cold", label: "Fria" },
      momentum: "stable",
      explainability: { reasons: ["Oportunidade registrada como perdida"], warnings: [] },
      recommendation: {
        action: "Revisar motivo da perda",
        channel: "CRM",
        urgency: "routine",
        rationale: "Registrar o aprendizado comercial antes de encerrar o ciclo.",
      },
      ageDays: ageInDays(signals.createdAt, now),
    };
  }

  const confidence = assessConfidence(signals, dna);
  const temperature = calculateBusinessTemperature(dna);
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
