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
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function parseTypes(value: string) { try { return JSON.parse(value || "[]") as string[]; } catch { return []; } }
function guessedType(label: string) { const name = normalize(label); if (name.includes("suv")) return "SUV"; if (name.includes("sedan") || name.includes("civic") || name.includes("corolla")) return "Sedan"; if (name.includes("hatch")) return "Hatch"; if (name.includes("pickup") || name.includes("picape")) return "Picape"; return "Outro"; }
function evaluateBudget(price: number, budgetMax: number): { points: number; reason?: string } {
  if (price <= budgetMax) return { points: 25, reason: "dentro do orçamento" };
  if (price <= budgetMax * 1.08) return { points: 12, reason: "próximo do orçamento" };
  return { points: 0 };
}
function evaluateYear(year: number, minYear: number): { points: number; reason?: string } {
  if (!minYear || year >= minYear) return { points: 15, reason: "ano compatível" };
  return { points: 0 };
}
function evaluateMileage(mileage: number, maxMileage: number): { points: number; reason?: string } {
  if (!maxMileage || mileage <= maxMileage) return { points: 12, reason: "quilometragem compatível" };
  return { points: 0 };
}
function evaluateCity(profileCity: string, vehicleCity: string): { points: number; reason?: string } {
  if (normalize(profileCity) === normalize(vehicleCity)) return { points: 8, reason: "na mesma cidade" };
  return { points: 0 };
}
function evaluateUseCase(useCase: string, vehicleUseCases?: readonly string[]): { points: number; reason?: string } {
  if (useCase && vehicleUseCases?.some((item) => normalize(item) === normalize(useCase))) return { points: 7, reason: "adequado ao uso informado" };
  return { points: 0 };
}
function evaluateTransmission(profileTransmission: string, vehicleTransmission?: string): { points: number; reason?: string } {
  if (profileTransmission === "Indiferente" || !vehicleTransmission || normalize(profileTransmission) === normalize(vehicleTransmission)) {
    if (profileTransmission !== "Indiferente") return { points: 8, reason: "câmbio desejado" };
    return { points: 8 };
  }
  return { points: 0 };
}
function evaluateModelCategory(preferred: string, label: string, types: readonly string[], vehicleType: string): { points: number; reason?: string } {
  if (preferred && preferred.split(/[,;/]+/).some((term) => term.trim().length >= 3 && label.includes(term.trim()))) return { points: 25, reason: "modelo solicitado" };
  else if (!types.length || types.includes(vehicleType)) return { points: 20, reason: "categoria preferida" };
  return { points: 0 };
}
export function scoreBuyerVehicle(profile: BuyerProfile, vehicle: MatchableVehicle) {
  let score = 0; const reasons: string[] = []; const types = parseTypes(profile.vehicle_types).map(normalize);
  const vehicleType = normalize(vehicle.type || guessedType(vehicle.label)); const preferred = normalize(profile.preferred_models); const label = normalize(vehicle.label);
  const budget = evaluateBudget(vehicle.price, profile.budget_max);
  score += budget.points;
  if (budget.reason !== undefined) reasons.push(budget.reason);
  const modelCategory = evaluateModelCategory(preferred, label, types, vehicleType);
  score += modelCategory.points;
  if (modelCategory.reason !== undefined) reasons.push(modelCategory.reason);
  const year = evaluateYear(vehicle.year, profile.min_year);
  score += year.points;
  if (year.reason !== undefined) reasons.push(year.reason);
  const mileage = evaluateMileage(vehicle.mileage, profile.max_mileage);
  score += mileage.points;
  if (mileage.reason !== undefined) reasons.push(mileage.reason);
  const city = evaluateCity(profile.city, vehicle.city);
  score += city.points;
  if (city.reason !== undefined) reasons.push(city.reason);
  const transmission = evaluateTransmission(profile.transmission, vehicle.transmission);
  score += transmission.points;
  if (transmission.reason !== undefined) reasons.push(transmission.reason);
  const useCase = evaluateUseCase(profile.use_case, vehicle.useCases);
  score += useCase.points;
  if (useCase.reason !== undefined) reasons.push(useCase.reason);
  return { score: Math.min(100, score), reasons };
}
