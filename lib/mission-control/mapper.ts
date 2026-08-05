import type { MissionControlViewModel, MissionOpportunity, TradeInRow } from "./model";

function relativeFollowUp(value?: string) {
  if (!value) return "Definir retorno";
  const due = new Date(value);
  const today = new Date();
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `Atrasado ${Math.abs(days)}d`;
  if (days === 0) return "Retorno hoje";
  return `Em ${days} dia${days === 1 ? "" : "s"}`;
}

function mapTradeIn(row: TradeInRow): MissionOpportunity {
  const stageMap: Record<string, MissionOpportunity["stage"]> = {
    new: "new", received: "new", pre_evaluated: "new", contacted: "contacted",
    qualified: "qualified", sent_to_store: "store", proposal: "proposal",
    closed: "closed", lost: "closed",
  };
  const priority: MissionOpportunity["priority"] = row.leadCategory === "hot" ? "Alta" : row.leadCategory === "warm" ? "Média" : "Normal";
  const probability = priority === "Alta" ? 91 : priority === "Média" ? 76 : 58;
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    interest: row.desiredVehicle || "Veículo a definir",
    offered: `${row.brand} ${row.model} ${row.year}`,
    value: row.estimatedMax || 0,
    priority,
    next: relativeFollowUp(row.nextFollowUp),
    stage: stageMap[row.status] ?? "new",
    source: "Avaliação online",
    probability,
    marginPotential: Math.round((row.estimatedMax || 0) * .086),
    risk: probability >= 85 ? "baixo" : probability >= 70 ? "médio" : "alto",
  };
}

export const demoOpportunities: MissionOpportunity[] = [
  { id: "1", name: "Mariana Souza", city: "São Bernardo do Campo", interest: "Jeep Compass", offered: "Honda City 2020", value: 119900, priority: "Alta", next: "Retorno hoje", stage: "qualified", source: "Instagram", probability: 94, marginPotential: 10300, risk: "baixo" },
  { id: "2", name: "Carlos Henrique", city: "Santo André", interest: "Hatch automático", offered: "Toyota Corolla 2018", value: 89900, priority: "Média", next: "Fotos pendentes", stage: "contacted", source: "Portal", probability: 78, marginPotential: 7700, risk: "médio" },
  { id: "3", name: "Renata Lima", city: "São Paulo", interest: "Consignar SUV", offered: "Hyundai Creta 2021", value: 104900, priority: "Normal", next: "Em 2 dias", stage: "store", source: "Indicação", probability: 64, marginPotential: 9000, risk: "alto" },
  { id: "4", name: "Lucas Martins", city: "Diadema", interest: "Sedan até R$ 90 mil", offered: "Sem troca", value: 89900, priority: "Alta", next: "Proposta enviada", stage: "proposal", source: "Meta Ads", probability: 91, marginPotential: 7700, risk: "baixo" },
  { id: "5", name: "Paulo Ferreira", city: "São Caetano", interest: "SUV compacto", offered: "VW T-Cross 2020", value: 112900, priority: "Alta", next: "Atrasado 1d", stage: "new", source: "WhatsApp", probability: 88, marginPotential: 9700, risk: "médio" },
  { id: "6", name: "Fernanda Alves", city: "São Paulo", interest: "Toyota Corolla", offered: "Chevrolet Onix 2019", value: 128900, priority: "Média", next: "Retorno hoje", stage: "closed", source: "Portal", probability: 100, marginPotential: 11100, risk: "baixo" },
];

export function buildMissionControl(rows: TradeInRow[]): MissionControlViewModel {
  const opportunities = rows.length ? rows.map(mapTradeIn) : demoOpportunities;
  const highPriority = opportunities.filter((item) => item.priority === "Alta").length;
  const immediateActions = opportunities.filter((item) => item.next.includes("hoje") || item.next.includes("Atrasado")).length;
  const proposalCount = opportunities.filter((item) => item.stage === "proposal").length;
  const active = opportunities.filter((item) => item.stage !== "closed");
  const closed = opportunities.filter((item) => item.stage === "closed").length;
  const totalValue = opportunities.reduce((sum, item) => sum + item.value, 0);
  const activeValue = active.reduce((sum, item) => sum + item.value, 0);
  const projectedMargin = active.reduce((sum, item) => sum + item.marginPotential, 0);
  return {
    greeting: "Bom dia, Evandro.",
    immediateActions,
    highPriority,
    operationScore: Math.min(99, Math.max(72, 88 + closed - immediateActions)),
    activeCount: active.length,
    proposalCount,
    activeValue,
    capitalNeeded: Math.round(activeValue * .36),
    projectedMargin,
    conversion: opportunities.length ? Math.round((closed / opportunities.length) * 100) : 0,
    averageTicket: opportunities.length ? Math.round(totalValue / opportunities.length) : 0,
    opportunities,
  };
}
