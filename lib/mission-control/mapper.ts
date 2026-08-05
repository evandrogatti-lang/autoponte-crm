import { aggregateBusinessTemperature, buildFlowEngine, evaluateOpportunity } from "../ade";
import type { MissionControlViewModel, MissionOpportunity, TradeInRow } from "./model";

function relativeFollowUp(value?: string, now = new Date()) {
  if (!value) return "Definir retorno";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "Definir retorno";
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return `Atrasado ${Math.abs(days)}d`;
  if (days === 0) return "Retorno hoje";
  return `Em ${days} dia${days === 1 ? "" : "s"}`;
}

function mapStage(status: string): MissionOpportunity["stage"] {
  const stageMap: Record<string, MissionOpportunity["stage"]> = {
    new: "new",
    received: "new",
    pre_evaluated: "new",
    contacted: "contacted",
    qualified: "qualified",
    sent_to_store: "store",
    store: "store",
    proposal: "proposal",
    closed: "closed",
    lost: "closed",
  };
  return stageMap[status] ?? "new";
}

function mapTradeIn(row: TradeInRow, now = new Date()): MissionOpportunity {
  const stage = mapStage(row.status);
  const marginPotential = Math.round((row.estimatedMax || 0) * 0.086);
  const assessment = evaluateOpportunity({
    id: row.id,
    stage,
    leadCategory: row.leadCategory,
    estimatedMin: row.estimatedMin,
    estimatedMax: row.estimatedMax,
    referencePrice: row.referencePrice,
    createdAt: row.createdAt,
    nextFollowUp: row.nextFollowUp,
    lastContactAt: row.lastContactAt,
    desiredVehicle: row.desiredVehicle,
    condition: row.condition,
    mileage: row.mileage,
    notes: row.notes,
  }, now);
  const priority: MissionOpportunity["priority"] = assessment.temperature.score >= 72
    ? "Alta"
    : assessment.temperature.score >= 52 ? "Média" : "Normal";
  const risk: MissionOpportunity["risk"] = assessment.momentum === "decelerating" || assessment.confidence.score < 55
    ? "alto"
    : assessment.temperature.score >= 72 ? "baixo" : "médio";
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    interest: row.desiredVehicle || "Veículo a definir",
    offered: `${row.brand} ${row.model} ${row.year}`,
    value: row.estimatedMax || 0,
    priority,
    next: relativeFollowUp(row.nextFollowUp, now),
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

function isoFromNow(days: number, hours = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export const demoTradeIns: TradeInRow[] = [
  { id: "1", name: "Mariana Souza", city: "São Bernardo do Campo", brand: "Honda", model: "City", year: "2020", desiredVehicle: "Jeep Compass", estimatedMin: 108000, estimatedMax: 119900, referencePrice: 126000, mileage: 58000, condition: "excellent", status: "qualified", leadCategory: "hot", nextFollowUp: isoFromNow(0, 2), lastContactAt: isoFromNow(0, -1), notes: "Cliente revisitou a proposta", createdAt: new Date(isoFromNow(-2)) },
  { id: "2", name: "Carlos Henrique", city: "Santo André", brand: "Toyota", model: "Corolla", year: "2018", desiredVehicle: "Hatch automático", estimatedMin: 82000, estimatedMax: 89900, referencePrice: 94000, mileage: 81000, condition: "good", status: "contacted", leadCategory: "warm", nextFollowUp: isoFromNow(1), lastContactAt: isoFromNow(-1), createdAt: new Date(isoFromNow(-4)) },
  { id: "3", name: "Renata Lima", city: "São Paulo", brand: "Hyundai", model: "Creta", year: "2021", desiredVehicle: "Consignar SUV", estimatedMin: 98000, estimatedMax: 104900, referencePrice: 111000, mileage: 46000, condition: "good", status: "sent_to_store", leadCategory: "new", nextFollowUp: isoFromNow(2), lastContactAt: isoFromNow(-3), createdAt: new Date(isoFromNow(-6)) },
  { id: "4", name: "Lucas Martins", city: "Diadema", brand: "Sem", model: "troca", year: "", desiredVehicle: "Sedan até R$ 90 mil", estimatedMin: 84000, estimatedMax: 89900, referencePrice: 90000, status: "proposal", leadCategory: "hot", nextFollowUp: isoFromNow(0), lastContactAt: isoFromNow(0, -2), notes: "Proposta enviada", createdAt: new Date(isoFromNow(-3)) },
  { id: "5", name: "Paulo Ferreira", city: "São Caetano", brand: "VW", model: "T-Cross", year: "2020", desiredVehicle: "SUV compacto", estimatedMin: 103000, estimatedMax: 112900, referencePrice: 119000, mileage: 69000, condition: "good", status: "new", leadCategory: "hot", nextFollowUp: isoFromNow(-1), lastContactAt: isoFromNow(-5), createdAt: new Date(isoFromNow(-7)) },
  { id: "6", name: "Fernanda Alves", city: "São Paulo", brand: "Chevrolet", model: "Onix", year: "2019", desiredVehicle: "Toyota Corolla", estimatedMin: 118000, estimatedMax: 128900, referencePrice: 132000, mileage: 72000, condition: "good", status: "closed", leadCategory: "warm", nextFollowUp: isoFromNow(0), lastContactAt: isoFromNow(0), createdAt: new Date(isoFromNow(-10)) },
];

export function buildMissionControl(rows: TradeInRow[], now = new Date()): MissionControlViewModel {
  const opportunities = (rows.length ? rows : demoTradeIns).map((row) => mapTradeIn(row, now));
  const active = opportunities.filter((item) => item.stage !== "closed");
  const closed = opportunities.filter((item) => item.stage === "closed").length;
  const activeValue = active.reduce((sum, item) => sum + item.value, 0);
  const totalValue = opportunities.reduce((sum, item) => sum + item.value, 0);
  const projectedMargin = active.reduce((sum, item) => sum + item.marginPotential, 0);
  const flow = buildFlowEngine(opportunities.map((item) => ({
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
    operationScore: flow.health.score,
    activeCount: active.length,
    proposalCount: active.filter((item) => item.stage === "proposal").length,
    activeValue,
    capitalNeeded: Math.round(activeValue * 0.36),
    projectedMargin,
    conversion: opportunities.length ? Math.round((closed / opportunities.length) * 100) : 0,
    averageTicket: opportunities.length ? Math.round(totalValue / opportunities.length) : 0,
    businessTemperature,
    flow,
    recommendations,
    opportunities,
  };
}
