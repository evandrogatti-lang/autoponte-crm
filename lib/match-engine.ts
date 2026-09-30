import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { buyerProfiles, consignments, tradeIns, vehicleMatches } from "../db/schema";

import { scoreBuyerVehicle, type BuyerProfile, type MatchableVehicle } from "./match-score";
export { scoreBuyerVehicle, type BuyerProfile, type MatchableVehicle } from "./match-score";

function draftMessage(profile: BuyerProfile, vehicle: MatchableVehicle) {
  const stage = vehicle.sourceType === "consignment" ? "entrou em pré-avaliação para consignação" : vehicle.sourceType === "trade_in" ? "pode entrar no estoque por meio de uma troca" : "está disponível no estoque";
  return `Olá, ${profile.name.split(" ")[0]}! Um ${vehicle.label}, compatível com a sua busca, ${stage} na AutoPonte. O veículo ainda depende das validações aplicáveis. Gostaria de receber os detalhes quando estiver aprovado?`;
}
function toLegacyProfile(row: typeof buyerProfiles.$inferSelect): BuyerProfile {
  return { id: row.id, name: row.name, whatsapp: row.whatsapp, email: row.email, city: row.city, budget_max: row.budgetMax, vehicle_types: row.vehicleTypes, preferred_models: row.preferredModels, min_year: row.minYear, max_mileage: row.maxMileage, transmission: row.transmission, fuel: row.fuel, use_case: row.useCase, purchase_timeline: row.purchaseTimeline, alerts_consent: row.alertsConsent ? 1 : 0 };
}
export async function createMatchesForVehicle(vehicle: MatchableVehicle) {
  const db = getDb(); const profiles = await db.select().from(buyerProfiles).where(eq(buyerProfiles.status, "active")); let created = 0;
  for (const row of profiles) { const profile = toLegacyProfile(row); const match = scoreBuyerVehicle(profile, vehicle); if (match.score < 55) continue;
    await db.insert(vehicleMatches).values({ id: crypto.randomUUID(), buyerProfileId: profile.id, sourceType: vehicle.sourceType, sourceId: vehicle.sourceId, vehicleLabel: vehicle.label, vehiclePrice: vehicle.price, score: match.score, reasons: JSON.stringify(match.reasons), messageDraft: draftMessage(profile, vehicle), status: profile.alerts_consent ? "review_pending" : "internal_only" }).onConflictDoNothing(); created += 1; }
  return created;
}
export async function createMatchesForBuyer(profile: BuyerProfile) {
  const db = getDb(); const vehicles: MatchableVehicle[] = [];
  const consignmentRows = await db.select().from(consignments).orderBy(desc(consignments.createdAt)).limit(100);
  for (const item of consignmentRows) vehicles.push({ sourceType: "consignment", sourceId: item.id, label: item.vehicleName, price: item.askingPrice, city: item.city, year: Number(item.year.match(/\d{4}/)?.[0] || 0), mileage: item.mileage });
  const tradeRows = await db.select().from(tradeIns).orderBy(desc(tradeIns.createdAt)).limit(100);
  for (const item of tradeRows) vehicles.push({ sourceType: "trade_in", sourceId: item.id, label: `${item.brand} ${item.model}`, price: item.estimatedMax, city: item.city, year: Number(item.year.match(/\d{4}/)?.[0] || 0), mileage: item.mileage });
  let created = 0;
  for (const vehicle of vehicles) { const match = scoreBuyerVehicle(profile, vehicle); if (match.score < 55) continue;
    await db.insert(vehicleMatches).values({ id: crypto.randomUUID(), buyerProfileId: profile.id, sourceType: vehicle.sourceType, sourceId: vehicle.sourceId, vehicleLabel: vehicle.label, vehiclePrice: vehicle.price, score: match.score, reasons: JSON.stringify(match.reasons), messageDraft: draftMessage(profile, vehicle), status: profile.alerts_consent ? "review_pending" : "internal_only" }).onConflictDoNothing(); created += 1; }
  return created;
}
