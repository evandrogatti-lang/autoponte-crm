import type { OpportunityStage, TemperatureLevel } from "./types";

export const DAY_MS = 86_400_000;

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function safeDate(value?: Date | string) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function ageInDays(value: Date | string, now = new Date()) {
  const date = safeDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

export function daysUntil(value?: string, now = new Date()) {
  const date = safeDate(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

export function daysSince(value?: string, now = new Date()) {
  const date = safeDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export const stageOrder: OpportunityStage[] = ["new", "contacted", "qualified", "store", "proposal", "closed"];

export const stageLabels: Record<OpportunityStage, string> = {
  new: "Lead",
  contacted: "Contato",
  qualified: "Qualificação",
  store: "Loja / Estoque",
  proposal: "Proposta",
  closed: "Fechado",
};

export function stageIndex(stage: OpportunityStage) {
  return Math.max(0, stageOrder.indexOf(stage));
}

export function temperatureLabel(level: TemperatureLevel) {
  return {
    cold: "Fria",
    warm: "Morna",
    hot: "Quente",
    critical: "Crítica",
  }[level];
}
