import { rankMarketplaceVehicles, type BuyerProfile } from "../../../lib/match-engine";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const budgetMax = number(body.budgetMax);
    const vehicleTypes = Array.isArray(body.vehicleTypes)
      ? body.vehicleTypes.map(clean).filter(Boolean)
      : [];

    if (budgetMax > 0 && budgetMax < 10000) {
      return Response.json(
        { error: "Informe um orçamento válido ou deixe o campo em aberto." },
        { status: 400 },
      );
    }

    const profile: BuyerProfile = {
      id: "anonymous",
      name: "",
      whatsapp: "",
      email: "",
      city: clean(body.city),
      budget_max: budgetMax || Number.MAX_SAFE_INTEGER,
      vehicle_types: JSON.stringify(vehicleTypes),
      preferred_models: clean(body.preferredModels),
      min_year: number(body.minYear),
      max_mileage: number(body.maxMileage) || 999999,
      transmission: clean(body.transmission) || "Indiferente",
      fuel: clean(body.fuel) || "Indiferente",
      use_case: clean(body.useCase),
      purchase_timeline: "Exploração",
      alerts_consent: 0,
    };

    const recommendations = await rankMarketplaceVehicles(profile, 60);

    return Response.json({
      recommendations,
      count: recommendations.length,
      maxMatches: 70,
      profilePersisted: false,
    });
  } catch (error) {
    console.error("anonymous match failed", error);
    return Response.json(
      { error: "Não foi possível calcular seus Matches agora." },
      { status: 500 },
    );
  }
}
