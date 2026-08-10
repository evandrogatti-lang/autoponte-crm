import type { OpportunitySignals, OpportunityStage } from "../ade";
import { cleanContactText, normalizeInternationalPhone, normalizeEmail } from "../contact";
import { opportunityStatuses } from "./types";
import { parseDesiredVehicleProfileInput } from "../vehicles/fipe-validation";
import type { OpportunityCommand, OpportunityStatus } from "./types";

export const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  pre_evaluated: "Pré-avaliação",
  new: "Novo",
  contacted: "Contato",
  qualified: "Qualificação",
  sent_to_store: "Loja",
  proposal: "Proposta",
  closed: "Fechado",
  lost: "Perdido",
};

export const opportunityStageLabels: Record<OpportunityStage, string> = {
  new: "Lead",
  contacted: "Contato",
  qualified: "Qualificação",
  store: "Loja",
  proposal: "Proposta",
  closed: "Fechado",
};

export function normalizeOpportunityStatus(value: string): OpportunityStatus {
  if (isOpportunityStatus(value)) return value;
  if (value === "received") return "new";
  if (value === "store") return "sent_to_store";
  return "new";
}

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return typeof value === "string" && opportunityStatuses.includes(value as OpportunityStatus);
}

export function statusToStage(status: string): OpportunityStage {
  const stageMap: Record<string, OpportunityStage> = {
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

export function isTerminalStatus(status: string) {
  return status === "closed" || status === "lost";
}

export function calculateEstimatedMidpoint(estimatedMin: number, estimatedMax: number) {
  return Math.round((Math.max(0, estimatedMin) + Math.max(0, estimatedMax)) / 2);
}

export function calculateMarginPotential(
  referencePrice: number | undefined,
  estimatedMin: number,
  estimatedMax: number,
) {
  const midpoint = calculateEstimatedMidpoint(estimatedMin, estimatedMax);
  return Math.max(0, Math.round((referencePrice ?? 0) - midpoint));
}

export function opportunitySignalsFromRow(row: {
  id: string;
  status: string;
  leadCategory: string;
  estimatedMin: number;
  estimatedMax: number;
  referencePrice?: number;
  createdAt: Date | string;
  nextFollowUp?: string;
  lastContactAt?: string;
  desiredVehicle?: string;
  condition?: string;
  mileage?: number;
  notes?: string;
}): OpportunitySignals {
  return {
    id: row.id,
    status: row.status,
    stage: statusToStage(row.status),
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
  };
}

function requiredString(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} é obrigatório.`);
  }
  const clean = value.trim();
  if (clean.length > maxLength) throw new Error(`${field} excede o limite permitido.`);
  return clean;
}

export function parseOpportunityCommand(input: unknown): OpportunityCommand {
  if (!input || typeof input !== "object") throw new Error("Ação inválida.");
  const payload = input as Record<string, unknown>;

  if (payload.action === "stage") {
    if (!isOpportunityStatus(payload.status)) throw new Error("Etapa inválida.");
    return { action: "stage", status: payload.status };
  }

  if (payload.action === "edit_client") {
    const rawWhatsapp = cleanContactText(payload.whatsapp);
    const whatsapp = normalizeInternationalPhone(rawWhatsapp, payload.whatsappDdi);
    if (rawWhatsapp && !whatsapp) throw new Error("WhatsApp inválido. Informe DDI e número local.");

    const rawEmail = cleanContactText(payload.email);
    const email = normalizeEmail(rawEmail);
    if (rawEmail && !email) throw new Error("E-mail inválido.");
    if (!whatsapp && !email) throw new Error("Informe ao menos um canal de contato válido.");

    return {
      action: "edit_client",
      name: requiredString(payload.name, "Nome", 160),
      whatsapp,
      email,
      city: requiredString(payload.city, "Cidade", 120),
    };
  }


  if (payload.action === "edit_demand") {
    return {
      action: "edit_demand",
      desiredVehicle: parseDesiredVehicleProfileInput(payload.desiredVehicle),
    };
  }

  if (payload.action === "contact") {
    return {
      action: "contact",
      channel: requiredString(payload.channel, "Canal", 40),
      summary: typeof payload.summary === "string" ? payload.summary.trim().slice(0, 1500) : "",
    };
  }

  if (payload.action === "note") {
    return { action: "note", note: requiredString(payload.note, "Observação", 4000) };
  }

  if (payload.action === "next_action") {
    const dueAt = requiredString(payload.dueAt, "Data da próxima ação", 80);
    const parsed = new Date(dueAt);
    if (Number.isNaN(parsed.getTime())) throw new Error("Data da próxima ação inválida.");
    return {
      action: "next_action",
      label: requiredString(payload.label, "Próxima ação", 240),
      dueAt: parsed.toISOString(),
    };
  }

  throw new Error("Ação não suportada.");
}
