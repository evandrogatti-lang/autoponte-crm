import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { vehicleScores } from "../../db/vehicle-intelligence-schema.ts";
import { vehicleMedia, vehiclePublications, vehicleWorkOrders } from "../../db/pilot-schema.ts";
import { vehicles } from "../../db/vehicle-schema.ts";
import type { VehicleBlocker, VehicleLifecycleState } from "./lifecycle.ts";

export type InventoryReadiness = {
  documentationReady: boolean; maintenanceReady: boolean; vqiRequired: boolean; vqiReady: boolean;
  mediaReady: boolean; pricingReady: boolean; publicationReady: boolean;
  approvedPhotos: number; openWorkOrders: number; publicationStatus: string;
  publicationStartedAt: Date | null; publicationEndedAt: Date | null;
  blockers: VehicleBlocker[]; nextAction: string;
};

export async function getInventoryReadiness(vehicleId: string): Promise<InventoryReadiness> {
  const db = getDb();
  const [[vehicle], work, media, publication, scores] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1),
    db.select({ id: vehicleWorkOrders.id }).from(vehicleWorkOrders).where(and(eq(vehicleWorkOrders.vehicleId, vehicleId), inArray(vehicleWorkOrders.status, ["open", "in_progress"]))),
    db.select({ id: vehicleMedia.id }).from(vehicleMedia).where(and(eq(vehicleMedia.vehicleId, vehicleId), eq(vehicleMedia.mediaType, "photo"), eq(vehicleMedia.status, "approved"))),
    db.select().from(vehiclePublications).where(eq(vehiclePublications.vehicleId, vehicleId)).orderBy(desc(vehiclePublications.createdAt)).limit(1),
    db.select().from(vehicleScores).where(and(eq(vehicleScores.vehicleId, vehicleId), eq(vehicleScores.scoreType, "VQI"))).orderBy(desc(vehicleScores.calculatedAt)).limit(1),
  ]);
  if (!vehicle) throw new Error("Veículo não encontrado.");
  const currentPublication = publication[0];
  const currentVqi = scores[0];
  const documentationReady = ["regular", "approved"].includes(vehicle.documentStatus);
  const maintenanceReady = work.length === 0;
  const vqiRequired = vehicle.vqiRequired;
  const vqiReady = !vqiRequired || Boolean(currentVqi && currentVqi.status !== "INSUFFICIENT_DATA");
  const mediaReady = media.length >= 4;
  const pricingReady = vehicle.askingPrice > 0;
  const publicationReady = currentPublication?.status === "published" && Boolean(currentPublication.publishedAt) && !currentPublication.endedAt;
  const blockers: VehicleBlocker[] = [];
  if (!documentationReady) blockers.push("DOCUMENT_BLOCKED");
  if (!maintenanceReady) blockers.push("MAINTENANCE_BLOCKED");
  if (!vqiReady) blockers.push("VQI_PENDING");
  const nextAction = !documentationReady ? "Regularizar documentação" : !maintenanceReady ? "Concluir manutenção" : !vqiReady ? "Concluir VQI" : !mediaReady ? `Aprovar ${4 - media.length} foto(s)` : !pricingReady ? "Definir preço de anúncio" : !publicationReady ? "Publicar veículo" : vehicle.lifecycleStatus !== "AVAILABLE" ? "Disponibilizar para Matches" : "Monitorar demanda e aging";
  return { documentationReady, maintenanceReady, vqiRequired, vqiReady, mediaReady, pricingReady, publicationReady, approvedPhotos: media.length, openWorkOrders: work.length, publicationStatus: currentPublication?.status || "not_started", publicationStartedAt: currentPublication?.publishedAt || null, publicationEndedAt: currentPublication?.endedAt || null, blockers, nextAction };
}

export function assertReadinessForState(state: VehicleLifecycleState, readiness: InventoryReadiness) {
  if (["READY", "PUBLISHED", "AVAILABLE"].includes(state) && !readiness.maintenanceReady) throw new Error("Manutenção pendente bloqueia READY.");
  if (["PUBLISHED", "AVAILABLE"].includes(state)) {
    if (!readiness.documentationReady) throw new Error("Documentação pendente bloqueia publicação.");
    if (!readiness.vqiReady) throw new Error("VQI pendente bloqueia publicação.");
    if (!readiness.mediaReady) throw new Error("São necessárias ao menos 4 fotos aprovadas.");
    if (!readiness.pricingReady) throw new Error("Preço de anúncio não definido.");
  }
  if (state === "AVAILABLE" && !readiness.publicationReady) throw new Error("Somente veículo publicado pode ficar AVAILABLE.");
}
