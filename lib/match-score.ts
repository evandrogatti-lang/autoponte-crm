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
export function scoreBuyerVehicle(profile: BuyerProfile, vehicle: MatchableVehicle) {
  let score = 0; const reasons: string[] = []; const types = parseTypes(profile.vehicle_types).map(normalize);
  const vehicleType = normalize(vehicle.type || guessedType(vehicle.label)); const preferred = normalize(profile.preferred_models); const label = normalize(vehicle.label);
  if (vehicle.price <= profile.budget_max) { score += 25; reasons.push("dentro do orçamento"); } else if (vehicle.price <= profile.budget_max * 1.08) { score += 12; reasons.push("próximo do orçamento"); }
  if (preferred && preferred.split(/[,;/]+/).some((term) => term.trim().length >= 3 && label.includes(term.trim()))) { score += 25; reasons.push("modelo solicitado"); } else if (!types.length || types.includes(vehicleType)) { score += 20; reasons.push("categoria preferida"); }
  if (!profile.min_year || vehicle.year >= profile.min_year) { score += 15; reasons.push("ano compatível"); }
  if (!profile.max_mileage || vehicle.mileage <= profile.max_mileage) { score += 12; reasons.push("quilometragem compatível"); }
  if (normalize(profile.city) === normalize(vehicle.city)) { score += 8; reasons.push("na mesma cidade"); }
  if (profile.transmission === "Indiferente" || !vehicle.transmission || normalize(profile.transmission) === normalize(vehicle.transmission)) { score += 8; if (profile.transmission !== "Indiferente") reasons.push("câmbio desejado"); }
  if (profile.use_case && vehicle.useCases?.some((item) => normalize(item) === normalize(profile.use_case))) { score += 7; reasons.push("adequado ao uso informado"); }
  return { score: Math.min(100, score), reasons };
}
