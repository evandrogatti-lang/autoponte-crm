export type TradeInDecisionInput = {
  appraisalValue: number; creditedValue: number; projectedAcquisitionCost: number;
  askingPrice: number; existingMatches: number; openOpportunities: number;
  inventoryAgeDays: number; likelyNextSale: string | null;
  lifecycleState?: string; lifecycleBlockers?: string[]; operationalNextAction?: string;
};

export type ManagerialDecision = {
  recommendation: string; risk: string; financialImpact: string; futureOpportunity: string;
  confidence: number; reasons: string[]; alternativeAction?: string;
};

export function buildTradeInDecision(input: TradeInDecisionInput): ManagerialDecision {
  const expectedMargin = input.askingPrice - input.projectedAcquisitionCost;
  const demand = input.existingMatches + input.openOpportunities;
  const lifecycleBlocked = Boolean(input.lifecycleState && input.lifecycleState !== "AVAILABLE");
  const risky = lifecycleBlocked || expectedMargin <= 0 || input.inventoryAgeDays > 90 || demand === 0;
  return {
    recommendation: lifecycleBlocked ? `Concluir prontidão operacional: ${input.operationalNextAction || "avançar ciclo de estoque"}` : risky ? "Revisar crédito e custo antes de aceitar a troca" : "Prosseguir com a troca dentro dos valores avaliados",
    risk: lifecycleBlocked ? `Veículo ${input.lifecycleState}; indisponível para Match normal${input.lifecycleBlockers?.length ? ` (${input.lifecycleBlockers.join(", ")})` : ""}` : expectedMargin <= 0 ? "Margem projetada não positiva" : input.inventoryAgeDays > 90 ? "Risco elevado de imobilização e aging" : demand === 0 ? "Liquidez ainda não comprovada" : "Risco controlado pelos sinais atuais de demanda",
    financialImpact: `Margem bruta projetada de R$ ${expectedMargin.toLocaleString("pt-BR")} e diferença crédito/avaliação de R$ ${(input.creditedValue - input.appraisalValue).toLocaleString("pt-BR")}.`,
    futureOpportunity: input.likelyNextSale || (demand ? `${demand} sinal(is) comercial(is) ativo(s) para a próxima venda.` : "Nenhuma próxima venda provável identificada."),
    confidence: Math.max(25, Math.min(95, 45 + (demand * 10) - (input.inventoryAgeDays > 90 ? 20 : 0))),
    reasons: [`Lifecycle: ${input.lifecycleState || "não informado"}${input.lifecycleBlockers?.length ? ` · ${input.lifecycleBlockers.join(", ")}` : ""}`, `Avaliação: R$ ${input.appraisalValue.toLocaleString("pt-BR")}`, `Crédito: R$ ${input.creditedValue.toLocaleString("pt-BR")}`, `Custo projetado: R$ ${input.projectedAcquisitionCost.toLocaleString("pt-BR")}`, `${input.existingMatches} Match(es) e ${input.openOpportunities} oportunidade(s) aberta(s)`, `Aging: ${input.inventoryAgeDays} dia(s)`],
    alternativeAction: risky ? "Reduzir o crédito, condicionar a entrada à preparação ou recusar a aquisição." : "Manter compra direta ou consignação como alternativa se a troca perder margem.",
  };
}
