export type VehicleQualityInput = {
  identityComplete: boolean;
  requiredDataCompletePct: number;
  documentationPct: number;
  technicalConditionPct: number;
  provenancePct: number;
  mediaPct: number;
  priceCompetitivenessPct: number;
  commercialAttractivenessPct: number;
  verificationPct: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function calculateVehicleQualityIndex(input: VehicleQualityInput) {
  const breakdown = {
    dataCompleteness: clamp(input.requiredDataCompletePct),
    documentation: clamp(input.documentationPct),
    technicalCondition: clamp(input.technicalConditionPct),
    provenance: clamp(input.provenancePct),
    media: clamp(input.mediaPct),
    priceCompetitiveness: clamp(input.priceCompetitivenessPct),
    commercialAttractiveness: clamp(input.commercialAttractivenessPct),
    verification: clamp(input.verificationPct),
  };

  const weighted =
    breakdown.dataCompleteness * 0.15 +
    breakdown.documentation * 0.15 +
    breakdown.technicalCondition * 0.20 +
    breakdown.provenance * 0.10 +
    breakdown.media * 0.10 +
    breakdown.priceCompetitiveness * 0.10 +
    breakdown.commercialAttractiveness * 0.10 +
    breakdown.verification * 0.10;

  const score = input.identityComplete ? clamp(weighted) : Math.min(59, clamp(weighted));
  return {
    score,
    grade: score >= 90 ? "excellent" : score >= 80 ? "very_good" : score >= 70 ? "good" : score >= 60 ? "attention" : "incomplete",
    breakdown,
  };
}

export function calculateDataCompleteness(completedRequired: number, totalRequired: number) {
  if (totalRequired <= 0) return 0;
  return clamp((completedRequired / totalRequired) * 100);
}
