import type { ConfidenceAssessment, OpportunityDNA, OpportunitySignals } from "./types";
import { average, clamp } from "./utils";

export function assessConfidence(signals: OpportunitySignals, dna: OpportunityDNA): ConfidenceAssessment {
  const checks: Array<[string, boolean]> = [
    ["veículo desejado", Boolean(signals.desiredVehicle?.trim())],
    ["próximo contato", Boolean(signals.nextFollowUp)],
    ["último contato", Boolean(signals.lastContactAt)],
    ["preço de referência", Boolean(signals.referencePrice && signals.referencePrice > 0)],
    ["estado do veículo", Boolean(signals.condition?.trim())],
    ["quilometragem", typeof signals.mileage === "number" && signals.mileage >= 0],
    ["faixa de avaliação", signals.estimatedMax > 0 && signals.estimatedMin > 0],
  ];
  const missingSignals = checks.filter(([, present]) => !present).map(([label]) => label);
  const completeness = clamp(((checks.length - missingSignals.length) / checks.length) * 100);
  const dimensions = [dna.chance, dna.urgency, dna.engagement, dna.timing];
  const mean = average(dimensions);
  const deviation = average(dimensions.map((value) => Math.abs(value - mean)));
  const agreement = clamp(100 - deviation * 1.8);
  const score = clamp(completeness * 0.62 + agreement * 0.38);
  const level = score >= 78 ? "high" : score >= 55 ? "medium" : "low";
  return { score, level, completeness, agreement, missingSignals };
}
