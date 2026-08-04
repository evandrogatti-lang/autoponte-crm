import { getDb } from "../../../db";
import { buyerProfiles } from "../../../db/schema";
import { catalogVehicles } from "../../../lib/catalog";
import { createMatchesForBuyer, scoreBuyerVehicle, type BuyerProfile } from "../../../lib/match-engine";

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const required = ["name", "whatsapp", "email", "city"];
    if (required.some((field) => !clean(body[field])) || number(body.budgetMax) < 10000) {
      return Response.json({ error: "Preencha contato, cidade e orçamento para continuar." }, { status: 400 });
    }
    if (body.consent !== true) return Response.json({ error: "O consentimento para tratar os dados é obrigatório." }, { status: 400 });

    const id = crypto.randomUUID();
    const types = Array.isArray(body.vehicleTypes) ? body.vehicleTypes.map(clean).filter(Boolean) : [];
    const consentAt = new Date().toISOString();
    const data = {
      id, name: clean(body.name), whatsapp: clean(body.whatsapp), email: clean(body.email), city: clean(body.city),
      budgetMax: number(body.budgetMax), downPayment: number(body.downPayment), maxMonthlyPayment: number(body.maxMonthlyPayment),
      vehicleTypes: JSON.stringify(types), preferredModels: clean(body.preferredModels), minYear: number(body.minYear),
      maxMileage: number(body.maxMileage) || 999999, transmission: clean(body.transmission) || "Indiferente",
      fuel: clean(body.fuel) || "Indiferente", useCase: clean(body.useCase), purchaseTimeline: clean(body.purchaseTimeline) || "Sem urgência",
      alertsConsent: body.alertsConsent === true, consentAt,
    };
    await getDb().insert(buyerProfiles).values(data);
    const profile: BuyerProfile = {
      id, name: data.name, whatsapp: data.whatsapp, email: data.email, city: data.city,
      budget_max: data.budgetMax, vehicle_types: data.vehicleTypes, preferred_models: data.preferredModels,
      min_year: data.minYear, max_mileage: data.maxMileage, transmission: data.transmission, fuel: data.fuel,
      use_case: data.useCase, purchase_timeline: data.purchaseTimeline, alerts_consent: data.alertsConsent ? 1 : 0,
    };
    const existingMatches = await createMatchesForBuyer(profile);
    const recommendations = catalogVehicles.map((vehicle) => {
      const match = scoreBuyerVehicle(profile, {
        sourceType: "catalog", sourceId: String(vehicle.id), label: vehicle.name, price: vehicle.price,
        city: vehicle.city, year: vehicle.modelYear, mileage: vehicle.mileage, type: vehicle.type,
        transmission: vehicle.transmission, fuel: vehicle.fuel, useCases: vehicle.useCases,
      });
      return { vehicle, ...match };
    }).filter((item) => item.score >= 40).sort((a, b) => b.score - a.score).slice(0, 3);

    return Response.json({ profileId: id, recommendations, existingMatches }, { status: 201 });
  } catch (error) {
    console.error("buyer profile failed", error);
    return Response.json({ error: "Não foi possível concluir a busca agora. Tente novamente." }, { status: 500 });
  }
}
