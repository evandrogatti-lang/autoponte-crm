export type BuyerProfile = {
  id: string; name: string; whatsapp: string; email: string; city: string;
  budget_max: number; vehicle_types: string; preferred_models: string;
  min_year: number; max_mileage: number; transmission: string; fuel: string;
  use_case: string; purchase_timeline: string; alerts_consent: number;
};
export type MatchableVehicle = {
  sourceType: "catalog" | "consignment" | "trade_in"; sourceId: string; label: string;
  price: number; city: string; year: number; mileage: number; type?: string;
  transmission?: string; fuel?: string; useCases?: readonly string[];
};
export type MatchRuleId = "budget" | "model_category" | "year" | "mileage" | "city" | "transmission" | "use_case";

export type MatchRuleResult = {
  ruleId: MatchRuleId;
  // Eligibility means the legacy scoring condition passed, including missing-value fallbacks.
  // It does not establish availability, provenance, freshness, or hard-constraint suitability.
  eligible: boolean;
  points: number;
  // Legacy explanation text; an eligible rule may intentionally have no reason.
  reason?: string;
};

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function parseTypes(value: string) { try { return JSON.parse(value || "[]") as string[]; } catch { return []; } }
function guessedType(label: string) { const name = normalize(label); if (name.includes("suv")) return "SUV"; if (name.includes("sedan") || name.includes("civic") || name.includes("corolla")) return "Sedan"; if (name.includes("hatch")) return "Hatch"; if (name.includes("pickup") || name.includes("picape")) return "Picape"; return "Outro"; }
function evaluateBudget(price: number, budgetMax: number): MatchRuleResult {
  if (price <= budgetMax) return { ruleId: "budget", eligible: true, points: 25, reason: "dentro do orçamento" };
  if (price <= budgetMax * 1.08) return { ruleId: "budget", eligible: true, points: 12, reason: "próximo do orçamento" };
  return { ruleId: "budget", eligible: false, points: 0 };
}
function evaluateYear(year: number, minYear: number): MatchRuleResult {
  if (!minYear || year >= minYear) return { ruleId: "year", eligible: true, points: 15, reason: "ano compatível" };
  return { ruleId: "year", eligible: false, points: 0 };
}
function evaluateMileage(mileage: number, maxMileage: number): MatchRuleResult {
  if (!maxMileage || mileage <= maxMileage) return { ruleId: "mileage", eligible: true, points: 12, reason: "quilometragem compatível" };
  return { ruleId: "mileage", eligible: false, points: 0 };
}
function evaluateCity(profileCity: string, vehicleCity: string): MatchRuleResult {
  if (normalize(profileCity) === normalize(vehicleCity)) return { ruleId: "city", eligible: true, points: 8, reason: "na mesma cidade" };
  return { ruleId: "city", eligible: false, points: 0 };
}
function evaluateUseCase(useCase: string, vehicleUseCases?: readonly string[]): MatchRuleResult {
  if (useCase && vehicleUseCases?.some((item) => normalize(item) === normalize(useCase))) return { ruleId: "use_case", eligible: true, points: 7, reason: "adequado ao uso informado" };
  return { ruleId: "use_case", eligible: false, points: 0 };
}
function evaluateTransmission(profileTransmission: string, vehicleTransmission?: string): MatchRuleResult {
  if (profileTransmission === "Indiferente" || !vehicleTransmission || normalize(profileTransmission) === normalize(vehicleTransmission)) {
    if (profileTransmission !== "Indiferente") return { ruleId: "transmission", eligible: true, points: 8, reason: "câmbio desejado" };
    return { ruleId: "transmission", eligible: true, points: 8 };
  }
  return { ruleId: "transmission", eligible: false, points: 0 };
}
function evaluateModelCategory(preferred: string, label: string, types: readonly string[], vehicleType: string): MatchRuleResult {
  if (preferred && preferred.split(/[,;/]+/).some((term) => term.trim().length >= 3 && label.includes(term.trim()))) return { ruleId: "model_category", eligible: true, points: 25, reason: "modelo solicitado" };
  else if (!types.length || types.includes(vehicleType)) return { ruleId: "model_category", eligible: true, points: 20, reason: "categoria preferida" };
  return { ruleId: "model_category", eligible: false, points: 0 };
}
// Results retain legacy evaluation/explanation order and raw, uncapped contributions.
export function evaluateBuyerVehicleRules(profile: BuyerProfile, vehicle: MatchableVehicle): MatchRuleResult[] {
  const types = parseTypes(profile.vehicle_types).map(normalize);
  const vehicleType = normalize(vehicle.type || guessedType(vehicle.label)); const preferred = normalize(profile.preferred_models); const label = normalize(vehicle.label);
  return [
    evaluateBudget(vehicle.price, profile.budget_max),
    evaluateModelCategory(preferred, label, types, vehicleType),
    evaluateYear(vehicle.year, profile.min_year),
    evaluateMileage(vehicle.mileage, profile.max_mileage),
    evaluateCity(profile.city, vehicle.city),
    evaluateTransmission(profile.transmission, vehicle.transmission),
    evaluateUseCase(profile.use_case, vehicle.useCases),
  ];
}

// Compatibility boundary: callers continue receiving exactly { score, reasons }.
export function scoreBuyerVehicle(profile: BuyerProfile, vehicle: MatchableVehicle) {
  let score = 0; const reasons: string[] = [];
  for (const result of evaluateBuyerVehicleRules(profile, vehicle)) {
    score += result.points;
    if (result.reason !== undefined) reasons.push(result.reason);
  }
  return { score: Math.min(100, score), reasons };
}
