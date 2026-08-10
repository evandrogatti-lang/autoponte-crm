import { getDb } from "../../db";
import { opportunityEvents, tradeIns } from "../../db/schema";
import { evaluateOpportunity } from "../ade";
import { normalizeInternationalPhone, normalizeEmail } from "../contact";
import { isOpportunityStatus, opportunitySignalsFromRow } from "./domain";
import type { OpportunityStatus } from "./types";
import { parseDesiredVehicleProfileInput, resolveDesiredVehicleProfile } from "../vehicles/fipe-validation";
import type { DesiredVehicleProfileInput } from "../vehicles/desired-profile";
import { parseTradeInFipeCodes, resolveTradeInFipe } from "../vehicles/trade-in-fipe-validation";
import type { TradeInFipeCodes } from "../vehicles/trade-in-fipe-validation";

const leadCategories = new Set(["new", "warm", "hot", "review"]);
const allowedCreationStatuses = new Set<OpportunityStatus>([
  "pre_evaluated",
  "new",
  "contacted",
  "qualified",
  "sent_to_store",
  "proposal",
]);

type Actor = { displayName: string; email: string };

export type ManualOpportunityInput = {
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  desiredVehicle: DesiredVehicleProfileInput;
  status: OpportunityStatus;
  leadCategory: string;
  nextAction: string;
  nextFollowUp: string;
  notes: string;
  consentConfirmed: boolean;
  tradeIn: {
    hasTradeIn: boolean;
    fipeCodes: TradeInFipeCodes | null;
    brand: string;
    model: string;
    version: string;
    year: string;
    mileage: number;
    condition: string;
    referencePrice: number;
    estimatedMin: number;
    estimatedMax: number;
    fipeCode: string;
    fipeMonth: string;
  };
};

function text(value: unknown, field: string, maxLength: number, required = false) {
  if (typeof value !== "string") {
    if (required) throw new Error(`${field} é obrigatório.`);
    return "";
  }
  const clean = value.trim();
  if (required && !clean) throw new Error(`${field} é obrigatório.`);
  if (clean.length > maxLength) throw new Error(`${field} excede o limite permitido.`);
  return clean;
}

function money(value: unknown, field: string) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${field} inválido.`);
  return Math.round(parsed);
}

function dateValue(value: unknown) {
  const clean = text(value, "Próximo retorno", 80);
  if (!clean) return "";
  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) throw new Error("Data do próximo retorno inválida.");
  return parsed.toISOString();
}

export function parseManualOpportunityInput(input: unknown): ManualOpportunityInput {
  if (!input || typeof input !== "object") throw new Error("Dados da oportunidade inválidos.");
  const payload = input as Record<string, unknown>;
  const rawTradeIn = payload.tradeIn && typeof payload.tradeIn === "object"
    ? payload.tradeIn as Record<string, unknown>
    : {};
  const hasTradeIn = rawTradeIn.hasTradeIn === true;
  const rawStatus = typeof payload.status === "string" ? payload.status : "new";
  const status = isOpportunityStatus(rawStatus) && allowedCreationStatuses.has(rawStatus)
    ? rawStatus
    : "new";
  const rawCategory = typeof payload.leadCategory === "string" ? payload.leadCategory : "new";
  const leadCategory = leadCategories.has(rawCategory) ? rawCategory : "new";

  if (payload.consentConfirmed !== true) throw new Error("Confirme o consentimento de contato do cliente.");

  const referencePrice = hasTradeIn ? money(rawTradeIn.referencePrice, "Valor FIPE") : 0;
  const estimatedMin = hasTradeIn ? money(rawTradeIn.estimatedMin, "Avaliação mínima") : 0;
  const estimatedMax = hasTradeIn ? money(rawTradeIn.estimatedMax, "Avaliação máxima") : 0;
  if (hasTradeIn && estimatedMin > estimatedMax) {
    throw new Error("A avaliação mínima não pode ser maior que a máxima.");
  }

  const rawWhatsapp = text(payload.whatsapp, "WhatsApp", 60, true);
  const whatsapp = normalizeInternationalPhone(rawWhatsapp, payload.whatsappDdi);
  if (!whatsapp) throw new Error("WhatsApp inválido. Informe DDI e número local.");

  const rawEmail = text(payload.email, "E-mail", 180);
  const email = normalizeEmail(rawEmail);
  if (rawEmail && !email) throw new Error("E-mail inválido.");

  return {
    name: text(payload.name, "Nome", 160, true),
    whatsapp,
    email,
    city: text(payload.city, "Cidade", 120, true),
    desiredVehicle: parseDesiredVehicleProfileInput(payload.desiredVehicle),
    status,
    leadCategory,
    nextAction: text(payload.nextAction, "Próxima ação", 240),
    nextFollowUp: dateValue(payload.nextFollowUp),
    notes: text(payload.notes, "Observações", 4000),
    consentConfirmed: true,
    tradeIn: {
      hasTradeIn,
      fipeCodes: hasTradeIn ? parseTradeInFipeCodes(rawTradeIn) : null,
      brand: hasTradeIn ? text(rawTradeIn.brand, "Marca da troca", 100, true) : "",
      model: hasTradeIn ? text(rawTradeIn.model, "Modelo da troca", 140, true) : "",
      version: hasTradeIn ? text(rawTradeIn.version, "Versão da troca", 160) : "",
      year: hasTradeIn ? text(rawTradeIn.year, "Ano da troca", 20, true) : "",
      mileage: hasTradeIn ? money(rawTradeIn.mileage, "Quilometragem") : 0,
      condition: hasTradeIn ? text(rawTradeIn.condition, "Condição", 40) || "good" : "",
      referencePrice,
      estimatedMin,
      estimatedMax,
      fipeCode: hasTradeIn ? text(rawTradeIn.fipeCode, "Código FIPE", 40) : "",
      fipeMonth: hasTradeIn ? text(rawTradeIn.fipeMonth, "Mês FIPE", 80) : "",
    },
  };
}

export async function createManualOpportunity(input: ManualOpportunityInput, actor: Actor) {
  const desiredProfile = await resolveDesiredVehicleProfile(input.desiredVehicle);
  const tradeInQuote = input.tradeIn.hasTradeIn && input.tradeIn.fipeCodes
    ? await resolveTradeInFipe(input.tradeIn.fipeCodes)
    : null;
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date();
  const base = {
    id,
    name: input.name,
    whatsapp: input.whatsapp,
    email: input.email,
    city: input.city,
    brand: tradeInQuote?.brand ?? input.tradeIn.brand,
    model: tradeInQuote?.model ?? input.tradeIn.model,
    version: input.tradeIn.version,
    year: tradeInQuote ? String(tradeInQuote.modelYear) : input.tradeIn.year,
    mileage: input.tradeIn.mileage,
    condition: input.tradeIn.condition,
    desiredVehicle: desiredProfile.label,
    desiredBrandCode: desiredProfile.brandCode,
    desiredBrand: desiredProfile.brand,
    desiredModelKey: desiredProfile.modelKey,
    desiredModel: desiredProfile.model,
    desiredVersionCode: desiredProfile.versionCode,
    desiredVersion: desiredProfile.version,
    desiredYearMin: desiredProfile.yearMin,
    desiredYearMax: desiredProfile.yearMax,
    desiredPriceMin: desiredProfile.priceMin,
    desiredPriceMax: desiredProfile.priceMax,
    desiredSearchScope: desiredProfile.searchScope,
    referencePrice: tradeInQuote?.price ?? input.tradeIn.referencePrice,
    fipeCode: tradeInQuote?.fipeCode ?? input.tradeIn.fipeCode,
    fipeMonth: tradeInQuote?.referenceMonth ?? input.tradeIn.fipeMonth,
    estimatedMin: input.tradeIn.estimatedMin,
    estimatedMax: input.tradeIn.estimatedMax,
    photoKeys: "[]",
    status: input.status,
    leadCategory: input.leadCategory,
    nextFollowUp: input.nextFollowUp,
    lastContactAt: "",
    notes: input.notes,
    nextAction: input.nextAction,
    consentAt: input.consentConfirmed ? now.toISOString() : "",
    createdAt: now,
    updatedAt: now,
  };
  const assessment = evaluateOpportunity(opportunitySignalsFromRow(base), now);

  await db.transaction(async (tx) => {
    await tx.insert(tradeIns).values({
      ...base,
      probability: assessment.dna.chance,
      confidenceScore: assessment.confidence.score,
      temperatureScore: assessment.temperature.score,
      momentum: assessment.momentum,
      priorityScore: assessment.dna.priorityScore,
      recommendationAction: assessment.recommendation.action,
      recommendationChannel: assessment.recommendation.channel,
      recommendationUrgency: assessment.recommendation.urgency,
      recommendationRationale: assessment.recommendation.rationale,
    });
    await tx.insert(opportunityEvents).values({
      id: crypto.randomUUID(),
      opportunityId: id,
      eventType: "created",
      title: "Oportunidade criada no CRM",
      description: input.tradeIn.hasTradeIn
        ? `${input.name} procura ${desiredProfile.label} e informou ${tradeInQuote?.brand ?? input.tradeIn.brand} ${tradeInQuote?.model ?? input.tradeIn.model} na troca.`
        : `${input.name} procura ${desiredProfile.label}, sem veículo de troca informado.`,
      metadata: JSON.stringify({ source: "manual_crm", hasTradeIn: input.tradeIn.hasTradeIn, desiredVehicle: desiredProfile }),
      actorName: actor.displayName,
      actorEmail: actor.email,
      createdAt: now,
    });
  });

  return { id, assessment };
}
