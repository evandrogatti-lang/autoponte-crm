import type { BusinessTemperature, Momentum, OpportunityDNA, OpportunitySignals } from "./types";
import { ageInDays, clamp, daysSince, daysUntil, temperatureLabel } from "./utils";

export function calculateBusinessTemperature(dna: OpportunityDNA): BusinessTemperature {
  const score = clamp(
    dna.priorityScore * 0.56 +
    dna.urgency * 0.18 +
    dna.engagement * 0.14 +
    dna.timing * 0.12,
  );
  const level = score >= 86 ? "critical" : score >= 72 ? "hot" : score >= 50 ? "warm" : "cold";
  return { score, level, label: temperatureLabel(level) };
}

export function calculateMomentum(signals: OpportunitySignals, now = new Date()): Momentum {
  if (signals.stage === "closed") return "stable";
  const followUp = daysUntil(signals.nextFollowUp, now);
  const lastContact = daysSince(signals.lastContactAt, now);
  const age = ageInDays(signals.createdAt, now);
  if ((lastContact !== null && lastContact <= 1) || (followUp !== null && followUp >= 0 && followUp <= 1)) {
    return "accelerating";
  }
  if ((followUp !== null && followUp < -1) || (lastContact !== null && lastContact >= 6) || (!signals.nextFollowUp && age >= 4)) {
    return "decelerating";
  }
  return "stable";
}
