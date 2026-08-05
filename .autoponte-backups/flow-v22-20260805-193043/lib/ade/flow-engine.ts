import type {
  BusinessTemperature,
  FlowEngineView,
  FlowOpportunityInput,
  FlowStage,
  OpportunityStage,
} from "./types";
import { average, clamp, stageLabels, stageOrder, temperatureLabel } from "./utils";

const stallThresholdDays: Record<OpportunityStage, number> = {
  new: 2,
  contacted: 3,
  qualified: 4,
  store: 5,
  proposal: 2,
  closed: Number.POSITIVE_INFINITY,
};

const nextActions: Record<OpportunityStage, string> = {
  new: "Distribuir os leads novos e definir o primeiro contato.",
  contacted: "Priorizar retornos sem resposta e confirmar interesse.",
  qualified: "Fechar dados pendentes e avançar as melhores oportunidades.",
  store: "Cobrar decisão da loja e reservar os veículos aderentes.",
  proposal: "Retomar propostas abertas e tratar as objeções hoje.",
  closed: "Revisar perdas e registrar os aprendizados do fechamento.",
};

function aggregateTemperature(items: FlowOpportunityInput[]): BusinessTemperature {
  const score = clamp(average(items.map((item) => item.temperature.score)));
  const level = score >= 86 ? "critical" : score >= 72 ? "hot" : score >= 50 ? "warm" : "cold";
  return { score, level, label: temperatureLabel(level) };
}

function isStalled(item: FlowOpportunityInput) {
  return item.stage !== "closed"
    && (item.momentum === "decelerating" || item.ageDays > stallThresholdDays[item.stage]);
}

function stageView(
  stage: OpportunityStage,
  opportunities: FlowOpportunityInput[],
  activeValue: number,
): FlowStage {
  const items = opportunities.filter((item) => item.stage === stage);
  const value = items.reduce((sum, item) => sum + item.value, 0);
  const stalled = items.filter(isStalled).length;
  const averageProbability = clamp(average(items.map((item) => item.probability)));
  const averagePriority = clamp(average(items.map((item) => item.priorityScore)));
  const maxAgeDays = items.reduce((max, item) => Math.max(max, item.ageDays), 0);
  const pressure = clamp(
    stalled * 23
      + items.filter((item) => item.momentum === "decelerating").length * 11
      + Math.max(0, 66 - averageProbability) * 0.62
      + Math.min(18, maxAgeDays * 1.4)
      + items.length * 2.5,
  );

  return {
    key: stage,
    label: stageLabels[stage],
    count: items.length,
    value,
    averageProbability,
    averagePriority,
    accelerating: items.filter((item) => item.momentum === "accelerating").length,
    decelerating: items.filter((item) => item.momentum === "decelerating").length,
    stalled,
    highPriority: items.filter((item) => item.priorityScore >= 72).length,
    maxAgeDays,
    pressure,
    valueShare: activeValue > 0 ? clamp((value / activeValue) * 100) : 0,
    temperature: aggregateTemperature(items),
  };
}

export function buildFlowEngine(opportunities: FlowOpportunityInput[]): FlowEngineView {
  const active = opportunities.filter((item) => item.stage !== "closed");
  const activeValue = active.reduce((sum, item) => sum + item.value, 0);
  const stages = stageOrder.map((stage) => stageView(stage, opportunities, activeValue));
  const weightedProbability = activeValue > 0
    ? clamp(active.reduce((sum, item) => sum + item.probability * item.value, 0) / activeValue)
    : clamp(average(active.map((item) => item.probability)));

  const atRisk = active.filter(isStalled);
  const atRiskValue = atRisk.reduce((sum, item) => sum + item.value, 0);
  const acceleratingCount = active.filter((item) => item.momentum === "accelerating").length;
  const atRiskValueRatio = activeValue > 0 ? atRiskValue / activeValue : 0;

  const bottleneckCandidates = stages
    .filter((stage) => stage.key !== "closed" && stage.count > 0)
    .sort((a, b) => b.pressure - a.pressure);
  const bottleneck = bottleneckCandidates[0];

  const averageTemperature = average(active.map((item) => item.temperature.score));
  const score = clamp(
    weightedProbability * 0.42
      + averageTemperature * 0.34
      + 24
      + acceleratingCount * 1.8
      - atRisk.length * 4.2
      - atRiskValueRatio * 18,
  );
  const label = score >= 86 ? "Excelente" : score >= 70 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";

  const summary = bottleneck
    ? bottleneck.stalled > 0
      ? `${bottleneck.label} concentra ${bottleneck.stalled} oportunidade(s) travada(s).`
      : `${bottleneck.label} concentra a maior pressão do fluxo.`
    : "Nenhum gargalo operacional relevante detectado.";

  return {
    health: { score, label, summary },
    bottleneck: bottleneck
      ? {
          stage: bottleneck.key,
          label: bottleneck.label,
          reason: bottleneck.stalled > 0
            ? `${bottleneck.stalled} travada(s) · até ${bottleneck.maxAgeDays} dias na operação`
            : "Volume acima da velocidade de avanço",
          nextAction: nextActions[bottleneck.key],
        }
      : {
          stage: null,
          label: "Sem gargalo",
          reason: "Fluxo equilibrado",
          nextAction: "Manter a cadência de contatos e propostas.",
        },
    stages,
    activeValue,
    weightedProbability,
    atRiskCount: atRisk.length,
    atRiskValue,
    acceleratingCount,
  };
}
