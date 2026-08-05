import type { BusinessTemperature, FlowEngineView, FlowOpportunityInput, FlowStage, OpportunityStage } from "./types";
import { average, clamp, stageLabels, stageOrder, temperatureLabel } from "./utils";

function aggregateTemperature(items: FlowOpportunityInput[]): BusinessTemperature {
  const score = clamp(average(items.map((item) => item.temperature.score)));
  const level = score >= 86 ? "critical" : score >= 72 ? "hot" : score >= 50 ? "warm" : "cold";
  return { score, level, label: temperatureLabel(level) };
}

function stageView(stage: OpportunityStage, opportunities: FlowOpportunityInput[]): FlowStage {
  const items = opportunities.filter((item) => item.stage === stage);
  return {
    key: stage,
    label: stageLabels[stage],
    count: items.length,
    value: items.reduce((sum, item) => sum + item.value, 0),
    averageProbability: clamp(average(items.map((item) => item.probability))),
    averagePriority: clamp(average(items.map((item) => item.priorityScore))),
    accelerating: items.filter((item) => item.momentum === "accelerating").length,
    decelerating: items.filter((item) => item.momentum === "decelerating").length,
    temperature: aggregateTemperature(items),
  };
}

export function buildFlowEngine(opportunities: FlowOpportunityInput[]): FlowEngineView {
  const stages = stageOrder.map((stage) => stageView(stage, opportunities));
  const active = opportunities.filter((item) => item.stage !== "closed");
  const activeValue = active.reduce((sum, item) => sum + item.value, 0);
  const weightedProbability = activeValue > 0
    ? clamp(active.reduce((sum, item) => sum + item.probability * item.value, 0) / activeValue)
    : clamp(average(active.map((item) => item.probability)));
  const bottleneckCandidates = stages
    .filter((stage) => stage.key !== "closed" && stage.count > 0)
    .map((stage) => ({
      stage,
      pressure: stage.decelerating * 24 + stage.count * 4 + Math.max(0, 68 - stage.averageProbability),
    }))
    .sort((a, b) => b.pressure - a.pressure);
  const bottleneck = bottleneckCandidates[0]?.stage;
  const decelerating = active.filter((item) => item.momentum === "decelerating").length;
  const accelerating = active.filter((item) => item.momentum === "accelerating").length;
  const averageTemperature = average(active.map((item) => item.temperature.score));
  const score = clamp(weightedProbability * 0.45 + averageTemperature * 0.38 + 20 - decelerating * 4 + accelerating * 2);
  const label = score >= 86 ? "Excelente" : score >= 70 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
  const summary = bottleneck
    ? `${bottleneck.label} concentra o maior atrito do fluxo.`
    : "Nenhum gargalo operacional relevante detectado.";
  return {
    health: { score, label, summary },
    bottleneck: bottleneck
      ? { stage: bottleneck.key, label: bottleneck.label, reason: bottleneck.decelerating > 0 ? `${bottleneck.decelerating} oportunidade(s) perdendo força` : "Volume acima da velocidade de avanço" }
      : { stage: null, label: "Sem gargalo", reason: "Fluxo equilibrado" },
    stages,
    activeValue,
    weightedProbability,
  };
}
