import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { opportunityEvents, tradeIns } from "../../db/schema";
import { evaluateOpportunity } from "../ade";
import { cleanContactText } from "../contact";
import {
  calculateEstimatedMidpoint,
  calculateMarginPotential,
  assertOpportunityTransition,
  normalizeOpportunityStatus,
  opportunitySignalsFromRow,
  opportunityStageLabels,
  opportunityStatusLabels,
  statusToStage,
} from "./domain";
import type { OpportunityCommand, OpportunityEventView, OpportunityWorkspaceData } from "./types";
import { resolveDesiredVehicleProfile } from "../vehicles/fipe-validation";

type TradeInRecord = typeof tradeIns.$inferSelect;
type EventRecord = typeof opportunityEvents.$inferSelect;
type Actor = { displayName: string; email: string };

function safePhotoKeys(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function eventView(event: EventRecord): OpportunityEventView {
  return {
    id: event.id,
    eventType: event.eventType,
    title: event.title,
    description: event.description,
    actorName: event.actorName,
    actorEmail: event.actorEmail,
    createdAt: event.createdAt.toISOString(),
  };
}

export function buildOpportunityWorkspace(
  row: TradeInRecord,
  events: EventRecord[],
  now = new Date(),
): OpportunityWorkspaceData {
  const status = normalizeOpportunityStatus(row.status);
  const stage = statusToStage(status);
  const assessment = evaluateOpportunity(opportunitySignalsFromRow({ ...row, status }), now);
  return {
    id: row.id,
    status,
    stage,
    stageLabel: opportunityStageLabels[stage],
    statusLabel: opportunityStatusLabels[status],
    leadCategory: row.leadCategory,
    client: {
      name: row.name,
      whatsapp: cleanContactText(row.whatsapp),
      email: cleanContactText(row.email),
      city: row.city,
    },
    desiredVehicle: row.desiredVehicle,
    desiredVehicleProfile: {
      brandCode: row.desiredBrandCode,
      brand: row.desiredBrand,
      modelKey: row.desiredModelKey,
      model: row.desiredModel,
      versionCode: row.desiredVersionCode,
      version: row.desiredVersion,
      yearMin: row.desiredYearMin,
      yearMax: row.desiredYearMax,
      priceMin: row.desiredPriceMin,
      priceMax: row.desiredPriceMax,
      searchScope: row.desiredSearchScope === "brand" || row.desiredSearchScope === "model" || row.desiredSearchScope === "version" ? row.desiredSearchScope : "legacy",
    },
    tradeIn: {
      brand: row.brand,
      model: row.model,
      version: row.version,
      year: row.year,
      mileage: row.mileage,
      condition: row.condition,
      referencePrice: row.referencePrice,
      fipeCode: row.fipeCode,
      fipeMonth: row.fipeMonth,
      estimatedMin: row.estimatedMin,
      estimatedMax: row.estimatedMax,
      estimatedMidpoint: calculateEstimatedMidpoint(row.estimatedMin, row.estimatedMax),
      photoKeys: safePhotoKeys(row.photoKeys),
    },
    commercial: {
      marginPotential: calculateMarginPotential(row.referencePrice, row.estimatedMin, row.estimatedMax),
      nextAction: row.nextAction,
      nextFollowUp: row.nextFollowUp,
      lastContactAt: row.lastContactAt,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    assessment,
    events: events.map(eventView),
  };
}

export async function getOpportunityWorkspace(id: string) {
  const db = getDb();
  const [row] = await db.select().from(tradeIns).where(eq(tradeIns.id, id)).limit(1);
  if (!row) return null;
  const events = await db
    .select()
    .from(opportunityEvents)
    .where(eq(opportunityEvents.opportunityId, id))
    .orderBy(desc(opportunityEvents.createdAt))
    .limit(200);
  return buildOpportunityWorkspace(row, events);
}

function snapshotValues(row: TradeInRecord, now: Date) {
  const assessment = evaluateOpportunity(opportunitySignalsFromRow(row), now);
  return {
    probability: assessment.dna.chance,
    confidenceScore: assessment.confidence.score,
    temperatureScore: assessment.temperature.score,
    momentum: assessment.momentum,
    priorityScore: assessment.dna.priorityScore,
    recommendationAction: assessment.recommendation.action,
    recommendationChannel: assessment.recommendation.channel,
    recommendationUrgency: assessment.recommendation.urgency,
    recommendationRationale: assessment.recommendation.rationale,
  };
}

export async function refreshOpportunityIntelligence(id: string) {
  const db = getDb();
  const [row] = await db.select().from(tradeIns).where(eq(tradeIns.id, id)).limit(1);
  if (!row) return null;
  const now = new Date();
  const snapshot = snapshotValues(row, now);
  await db.update(tradeIns).set({ ...snapshot, updatedAt: now }).where(eq(tradeIns.id, id));
  return snapshot;
}

function appendNote(existing: string, note: string, now: Date, actorName: string) {
  const entry = `[${now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${actorName}] ${note}`;
  return existing.trim() ? `${existing.trim()}\n\n${entry}` : entry;
}

export async function recordOpportunityEvent(
  opportunityId: string,
  event: { eventType: string; title: string; description?: string; metadata?: Record<string, unknown> },
  actor: Actor = { displayName: "Sistema AutoPonte", email: "" },
) {
  await getDb().insert(opportunityEvents).values({
    id: crypto.randomUUID(),
    opportunityId,
    eventType: event.eventType,
    title: event.title,
    description: event.description ?? "",
    metadata: JSON.stringify(event.metadata ?? {}),
    actorName: actor.displayName,
    actorEmail: actor.email,
  });
}

export async function applyOpportunityCommand(id: string, command: OpportunityCommand, actor: Actor) {
  const resolvedDemand = command.action === "edit_demand"
    ? await resolveDesiredVehicleProfile(command.desiredVehicle)
    : null;
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(tradeIns).where(eq(tradeIns.id, id)).limit(1);
    if (!current) throw new Error("OPPORTUNITY_NOT_FOUND");

    let updates: Partial<typeof tradeIns.$inferInsert> = { updatedAt: now };
    let eventType = command.action;
    let title = "Oportunidade atualizada";
    let description = "";
    let metadata: Record<string, unknown> = {};

    if (command.action === "stage") {
      assertOpportunityTransition(current.status, command.status);
      updates = {
        ...updates,
        status: command.status,
        nextFollowUp: command.status === "closed" || command.status === "lost" ? "" : current.nextFollowUp,
        nextAction: command.status === "closed"
          ? "Negócio concluído"
          : command.status === "lost" ? "Revisar motivo da perda" : current.nextAction,
      };
      title = `Etapa alterada para ${opportunityStatusLabels[command.status]}`;
      description = `${opportunityStatusLabels[normalizeOpportunityStatus(current.status)]} → ${opportunityStatusLabels[command.status]}`;
      metadata = { from: current.status, to: command.status };
    }

    if (command.action === "edit_client") {
      updates = {
        ...updates,
        name: command.name,
        whatsapp: command.whatsapp,
        email: command.email,
        city: command.city,
      };
      title = "Dados do cliente atualizados";
      description = `${command.name} · ${command.city}`;
      metadata = {
        previous: { name: current.name, whatsapp: current.whatsapp, email: current.email, city: current.city },
        current: { name: command.name, whatsapp: command.whatsapp, email: command.email, city: command.city },
      };
    }


    if (command.action === "edit_demand" && resolvedDemand) {
      updates = {
        ...updates,
        desiredVehicle: resolvedDemand.label,
        desiredBrandCode: resolvedDemand.brandCode,
        desiredBrand: resolvedDemand.brand,
        desiredModelKey: resolvedDemand.modelKey,
        desiredModel: resolvedDemand.model,
        desiredVersionCode: resolvedDemand.versionCode,
        desiredVersion: resolvedDemand.version,
        desiredYearMin: resolvedDemand.yearMin,
        desiredYearMax: resolvedDemand.yearMax,
        desiredPriceMin: resolvedDemand.priceMin,
        desiredPriceMax: resolvedDemand.priceMax,
        desiredSearchScope: resolvedDemand.searchScope,
      };
      title = "Demanda de veículo atualizada";
      description = resolvedDemand.label;
      metadata = {
        previous: {
          label: current.desiredVehicle,
          brand: current.desiredBrand,
          model: current.desiredModel,
          version: current.desiredVersion,
          yearMin: current.desiredYearMin,
          yearMax: current.desiredYearMax,
          priceMin: current.desiredPriceMin,
          priceMax: current.desiredPriceMax,
          searchScope: current.desiredSearchScope,
        },
        current: resolvedDemand,
      };
    }

    if (command.action === "contact") {
      const shouldAdvance = ["pre_evaluated", "new", "received"].includes(current.status);
      updates = {
        ...updates,
        lastContactAt: now.toISOString(),
        status: shouldAdvance ? "contacted" : current.status,
      };
      title = `Contato registrado via ${command.channel}`;
      description = command.summary || "Contato realizado sem resumo adicional.";
      metadata = { channel: command.channel, advancedToContacted: shouldAdvance };
    }

    if (command.action === "note") {
      updates = { ...updates, notes: appendNote(current.notes, command.note, now, actor.displayName) };
      title = "Observação adicionada";
      description = command.note;
    }

    if (command.action === "next_action") {
      updates = { ...updates, nextAction: command.label, nextFollowUp: command.dueAt };
      title = "Próxima ação definida";
      description = `${command.label} · ${new Date(command.dueAt).toLocaleString("pt-BR")}`;
      metadata = { dueAt: command.dueAt, label: command.label };
    }

    const merged = { ...current, ...updates, updatedAt: now } as TradeInRecord;
    const snapshot = snapshotValues(merged, now);
    await tx.update(tradeIns).set({ ...updates, ...snapshot }).where(eq(tradeIns.id, id));
    await tx.insert(opportunityEvents).values({
      id: crypto.randomUUID(),
      opportunityId: id,
      eventType,
      title,
      description,
      metadata: JSON.stringify({ ...metadata, intelligence: snapshot }),
      actorName: actor.displayName,
      actorEmail: actor.email,
      createdAt: now,
    });
  });

  return getOpportunityWorkspace(id);
}
