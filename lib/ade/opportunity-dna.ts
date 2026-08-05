import type { OpportunityDNA, OpportunitySignals } from "./types";
import { ageInDays, clamp, daysSince, daysUntil, stageIndex } from "./utils";

function leadHeat(category?: string) {
  if (category === "hot") return 95;
  if (category === "warm") return 72;
  return 46;
}

function marginScore(signals: OpportunitySignals) {
  const midpoint = Math.max(0, (signals.estimatedMin + signals.estimatedMax) / 2);
  const spread = Math.max(0, signals.estimatedMax - signals.estimatedMin);
  const base = signals.referencePrice && signals.referencePrice > 0
    ? ((signals.referencePrice - midpoint) / signals.referencePrice) * 100
    : midpoint > 0 ? (spread / midpoint) * 100 : 0;
  return clamp(42 + base * 3.1);
}

function urgencyScore(signals: OpportunitySignals, now: Date) {
  const followUp = daysUntil(signals.nextFollowUp, now);
  const age = ageInDays(signals.createdAt, now);
  if (followUp !== null && followUp < 0) return clamp(92 + Math.min(8, Math.abs(followUp) * 2));
  if (followUp === 0) return 94;
  if (followUp === 1) return 82;
  if (followUp !== null && followUp <= 3) return 68;
  if (age >= 7) return 72;
  if (!signals.nextFollowUp) return 64;
  return 42;
}

function engagementScore(signals: OpportunitySignals, now: Date) {
  const lastContact = daysSince(signals.lastContactAt, now);
  let score = leadHeat(signals.leadCategory) * 0.55 + stageIndex(signals.stage) * 8;
  if (lastContact === 0) score += 22;
  else if (lastContact === 1) score += 14;
  else if (lastContact !== null && lastContact <= 3) score += 7;
  else if (lastContact !== null && lastContact >= 7) score -= 22;
  if (signals.notes?.trim()) score += 4;
  return clamp(score);
}

function timingScore(signals: OpportunitySignals, now: Date) {
  const followUp = daysUntil(signals.nextFollowUp, now);
  const stage = stageIndex(signals.stage);
  let score = 38 + stage * 10;
  if (followUp !== null && followUp <= 0) score += 24;
  else if (followUp === 1) score += 16;
  else if (followUp !== null && followUp <= 3) score += 8;
  if (signals.stage === "proposal") score += 8;
  return clamp(score);
}

function competitionScore(signals: OpportunitySignals) {
  let score = 50;
  if (signals.desiredVehicle?.trim()) score += 12;
  if (signals.stage === "proposal") score += 12;
  if (signals.condition === "excellent") score += 6;
  if ((signals.mileage ?? 0) > 120_000) score -= 8;
  return clamp(score);
}

export function buildOpportunityDNA(signals: OpportunitySignals, now = new Date()): OpportunityDNA {
  const urgency = urgencyScore(signals, now);
  const engagement = engagementScore(signals, now);
  const timing = timingScore(signals, now);
  const margin = marginScore(signals);
  const competition = competitionScore(signals);
  const stage = stageIndex(signals.stage);
  const chance = clamp(
    leadHeat(signals.leadCategory) * 0.28 +
    engagement * 0.24 +
    timing * 0.22 +
    stage * 7 +
    (signals.desiredVehicle?.trim() ? 8 : 0),
  );
  const priorityScore = clamp(
    chance * 0.29 +
    margin * 0.19 +
    urgency * 0.22 +
    engagement * 0.14 +
    competition * 0.05 +
    timing * 0.11,
  );
  return { chance, margin, urgency, engagement, competition, timing, priorityScore };
}
