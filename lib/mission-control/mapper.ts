import { aggregateBusinessTemperature, buildFlowEngine, evaluateOpportunity } from "../ade";
import { calculateMarginPotential, isTerminalStatus, opportunitySignalsFromRow, statusToStage } from "../opportunities";
import type { MissionControlViewModel, MissionEventRow, MissionOpportunity, TradeInRow } from "./model";

function relativeFollowUp(value?: string, now = new Date()) {
  if (!value) return "Definir retorno";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "Definir retorno";
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return `Atrasado ${Math.abs(days)}d`;
  if (days === 0) return "Retorno hoje";
  return `Em ${days} dia${days === 1 ? "" : "s"}`;
}

function mapTradeIn(row: TradeInRow, now = new Date()): MissionOpportunity {
  const stage = statusToStage(row.status);
  const marginPotential = calculateMarginPotential(row.referencePrice, row.estimatedMin, row.estimatedMax);
  const assessment = evaluateOpportunity(opportunitySignalsFromRow(row), now);
  const priority: MissionOpportunity["priority"] = assessment.temperature.score >= 72
    ? "Alta"
    : assessment.temperature.score >= 52 ? "Média" : "Normal";
  const risk: MissionOpportunity["risk"] = assessment.momentum === "decelerating" || assessment.confidence.score < 55
    ? "alto"
    : assessment.temperature.score >= 72 ? "baixo" : "médio";
  return {
    id: row.id,
    status: row.status,
    name: row.name,
    city: row.city,
    interest: row.desiredVehicle || "Veículo a definir",
    offered: `${row.brand} ${row.model} ${row.year}`.trim(),
    value: row.estimatedMax || 0,
    priority,
    next: relativeFollowUp(row.nextFollowUp, now),
    nextFollowUp: row.nextFollowUp,
    stage,
    source: "Avaliação online",
    probability: assessment.dna.chance,
    marginPotential,
    risk,
    priorityScore: assessment.dna.priorityScore,
    temperature: assessment.temperature,
    momentum: assessment.momentum,
    dna: assessment.dna,
    confidence: assessment.confidence,
    recommendation: assessment.recommendation,
    explanations: assessment.explainability.reasons,
    warnings: assessment.explainability.warnings,
    ageDays: assessment.ageDays,
  };
}

export function buildMissionControl(
  rows: TradeInRow[],
  now = new Date(),
  eventRows: MissionEventRow[] = [],
): MissionControlViewModel {
  const opportunities = rows.map((row) => mapTradeIn(row, now));
  const active = opportunities.filter((item) => !isTerminalStatus(item.status));
  const closed = opportunities.filter((item) => item.status === "closed").length;
  const activeValue = active.reduce((sum, item) => sum + item.value, 0);
  const totalValue = opportunities.reduce((sum, item) => sum + item.value, 0);
  const projectedMargin = active.reduce((sum, item) => sum + item.marginPotential, 0);
  const flow = buildFlowEngine(opportunities
    .filter((item) => item.status !== "lost")
    .map((item) => ({
      id: item.id,
      stage: item.stage,
      value: item.value,
      probability: item.probability,
      priorityScore: item.priorityScore,
      ageDays: item.ageDays,
      temperature: item.temperature,
      momentum: item.momentum,
    })));
  const businessTemperature = aggregateBusinessTemperature(active.map((item) => item.temperature));
  const recommendations = [...active]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map((item) => ({
      opportunityId: item.id,
      name: item.name,
      text: `${item.name}: ${item.recommendation.action.toLowerCase()} via ${item.recommendation.channel}.`,
      action: item.recommendation.action,
      priorityScore: item.priorityScore,
    }));
  return {
    greeting: "Bom dia, Evandro.",
    immediateActions: active.filter((item) => item.recommendation.urgency === "now" || item.recommendation.urgency === "today").length,
    highPriority: active.filter((item) => item.priority === "Alta").length,
    operationScore: businessTemperature.score,
    activeCount: active.length,
    proposalCount: active.filter((item) => item.stage === "proposal").length,
    tradeInCount: active.filter((item) => item.offered && !item.offered.toLowerCase().includes("sem troca")).length,
    activeValue,
    capitalNeeded: Math.round(activeValue * 0.36),
    projectedMargin,
    conversion: opportunities.length ? Math.round((closed / opportunities.length) * 100) : 0,
    averageTicket: opportunities.length ? Math.round(totalValue / opportunities.length) : 0,
    businessTemperature,
    flow,
    recommendations,
    opportunities,
    recentEvents: eventRows.slice(0, 8).map((event) => ({
      id: event.id,
      opportunityId: event.opportunityId,
      title: event.title,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
