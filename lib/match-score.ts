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

type LegacyMatchRuleResult = {
  ruleId: MatchRuleId;
  // Eligibility means the legacy scoring condition passed, including missing-value fallbacks.
  // It does not establish availability, provenance, freshness, or hard-constraint suitability.
  eligible: boolean;
  points: number;
  // Legacy explanation text; an eligible rule may intentionally have no reason.
  reason?: string;
  budgetFit?: "within_budget" | "near_budget" | "outside_budget";
};

export type MatchRuleOutcome = "matched" | "not_matched" | "no_preference" | "missing_buyer_data" | "missing_vehicle_data" | "not_applicable";
export type MatchRuleResult = LegacyMatchRuleResult & {
  outcome: MatchRuleOutcome;
  vehicleDataSource?: "explicit" | "inferred" | "unavailable";
};
export type MatchCoverage = {
  totalRules: number;
  evaluatedRules: number;
  matchedRules: number;
  notMatchedRules: number;
  neutralRules: number;
  missingBuyerDataRules: number;
  missingVehicleDataRules: number;
  notApplicableRules: number;
  inferredDataRules: number;
};

export type MatchExplanationItem = {
  ruleId: MatchRuleId;
  outcome: MatchRuleOutcome;
  text: string;
};
export type MatchExplanation = {
  summary: string;
  positives: MatchExplanationItem[];
  negatives: MatchExplanationItem[];
  neutral: MatchExplanationItem[];
  missingData: MatchExplanationItem[];
  inferredData: MatchExplanationItem[];
  notApplicable: MatchExplanationItem[];
  coverage: MatchCoverage;
};

// Semantic descriptions are independent of legacy points and reason wording.
// Coverage is supplied by aggregateMatchCoverage for the same ordered results.
export function explainMatchRules(results: readonly MatchRuleResult[], coverage: MatchCoverage): MatchExplanation {
  const explanation: MatchExplanation = {
    summary: `${coverage.matchedRules} regras compatíveis; ${coverage.notMatchedRules} regras não compatíveis; ${coverage.evaluatedRules} de ${coverage.totalRules} regras avaliadas com dados disponíveis.`,
    positives: [], negatives: [], neutral: [], missingData: [], inferredData: [], notApplicable: [],
    coverage: { ...coverage },
  };
  const labels = {
    budget: "Orçamento", model_category: "Modelo/categoria", year: "Ano mínimo",
    mileage: "Quilometragem máxima", city: "Cidade", transmission: "Câmbio", use_case: "Uso informado",
  };
  for (const result of results) {
    const label = labels[result.ruleId];
    const item = (text: string): MatchExplanationItem => ({ ruleId: result.ruleId, outcome: result.outcome, text: `${label}: ${text}` });
    switch (result.outcome) {
      case "matched": explanation.positives.push(item(result.ruleId === "budget" && result.budgetFit === "within_budget"
        ? "dentro do orçamento informado." : result.ruleId === "budget" && result.budgetFit === "near_budget"
          ? "acima do valor informado, mas próximo do orçamento." : "compatível com a preferência informada.")); break;
      case "not_matched": explanation.negatives.push(item(result.ruleId === "budget" && result.budgetFit === "outside_budget"
        ? "acima do orçamento informado." : "não compatível com a preferência informada.")); break;
      case "no_preference": explanation.neutral.push(item("sem preferência do comprador.")); break;
      case "missing_buyer_data": explanation.missingData.push(item("dados do comprador ausentes ou inválidos.")); break;
      case "missing_vehicle_data": explanation.missingData.push(item("dados do veículo indisponíveis.")); break;
      case "not_applicable": explanation.notApplicable.push(item("regra não aplicável.")); break;
    }
    if (result.vehicleDataSource === "inferred") explanation.inferredData.push(item("dados do veículo inferidos do rótulo."));
  }
  return explanation;
}

function usableText(value: string | undefined) { return typeof value === "string" && value.trim().length > 0; }
function usableNumber(value: number, allowZero = false) { return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0); }
function semanticResult(result: LegacyMatchRuleResult, noPreference: boolean, buyerAvailable: boolean, vehicleAvailable: boolean, matched = result.eligible): MatchRuleResult {
  const outcome: MatchRuleOutcome = noPreference ? "no_preference" : !buyerAvailable ? "missing_buyer_data" : !vehicleAvailable ? "missing_vehicle_data" : matched ? "matched" : "not_matched";
  return { ...result, outcome };
}
function validCategoryInput(value: string) {
  if (value === "") return true;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string" && usableText(item));
  } catch { return false; }
}

// Descriptive counts only: inferred values count as evaluated but retain their source.
// No confidence percentage, score weighting, or ranking adjustment is derived here.
export function aggregateMatchCoverage(results: readonly MatchRuleResult[]): MatchCoverage {
  const coverage: MatchCoverage = { totalRules: results.length, evaluatedRules: 0, matchedRules: 0, notMatchedRules: 0, neutralRules: 0, missingBuyerDataRules: 0, missingVehicleDataRules: 0, notApplicableRules: 0, inferredDataRules: 0 };
  for (const result of results) {
    switch (result.outcome) {
      case "matched": coverage.matchedRules += 1; coverage.evaluatedRules += 1; break;
      case "not_matched": coverage.notMatchedRules += 1; coverage.evaluatedRules += 1; break;
      case "no_preference": coverage.neutralRules += 1; break;
      case "missing_buyer_data": coverage.missingBuyerDataRules += 1; break;
      case "missing_vehicle_data": coverage.missingVehicleDataRules += 1; break;
      case "not_applicable": coverage.notApplicableRules += 1; break;
    }
    if ((result.outcome === "matched" || result.outcome === "not_matched") && result.vehicleDataSource === "inferred") coverage.inferredDataRules += 1;
  }
  return coverage;
}

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function parseTypes(value: string) { try { return JSON.parse(value || "[]") as string[]; } catch { return []; } }
function guessedType(label: string) { const name = normalize(label); if (name.includes("suv")) return "SUV"; if (name.includes("sedan") || name.includes("civic") || name.includes("corolla")) return "Sedan"; if (name.includes("hatch")) return "Hatch"; if (name.includes("pickup") || name.includes("picape")) return "Picape"; return "Outro"; }
function evaluateBudget(price: number, budgetMax: number): LegacyMatchRuleResult {
  if (price <= budgetMax) return { ruleId: "budget", eligible: true, points: 25, reason: "dentro do orçamento", budgetFit: "within_budget" };
  if (price <= budgetMax * 1.08) return { ruleId: "budget", eligible: true, points: 12, reason: "próximo do orçamento", budgetFit: "near_budget" };
  return { ruleId: "budget", eligible: false, points: 0, budgetFit: "outside_budget" };
}
function evaluateYear(year: number, minYear: number): LegacyMatchRuleResult {
  if (!minYear || year >= minYear) return { ruleId: "year", eligible: true, points: 15, reason: "ano compatível" };
  return { ruleId: "year", eligible: false, points: 0 };
}
function evaluateMileage(mileage: number, maxMileage: number): LegacyMatchRuleResult {
  if (!maxMileage || mileage <= maxMileage) return { ruleId: "mileage", eligible: true, points: 12, reason: "quilometragem compatível" };
  return { ruleId: "mileage", eligible: false, points: 0 };
}
function evaluateCity(profileCity: string, vehicleCity: string): LegacyMatchRuleResult {
  if (normalize(profileCity) === normalize(vehicleCity)) return { ruleId: "city", eligible: true, points: 8, reason: "na mesma cidade" };
  return { ruleId: "city", eligible: false, points: 0 };
}
function evaluateUseCase(useCase: string, vehicleUseCases?: readonly string[]): LegacyMatchRuleResult {
  if (useCase && vehicleUseCases?.some((item) => normalize(item) === normalize(useCase))) return { ruleId: "use_case", eligible: true, points: 7, reason: "adequado ao uso informado" };
  return { ruleId: "use_case", eligible: false, points: 0 };
}
function evaluateTransmission(profileTransmission: string, vehicleTransmission?: string): LegacyMatchRuleResult {
  if (profileTransmission === "Indiferente" || !vehicleTransmission || normalize(profileTransmission) === normalize(vehicleTransmission)) {
    if (profileTransmission !== "Indiferente") return { ruleId: "transmission", eligible: true, points: 8, reason: "câmbio desejado" };
    return { ruleId: "transmission", eligible: true, points: 8 };
  }
  return { ruleId: "transmission", eligible: false, points: 0 };
}
function evaluateModelCategory(preferred: string, label: string, types: readonly string[], vehicleType: string): LegacyMatchRuleResult {
  if (preferred && preferred.split(/[,;/]+/).some((term) => term.trim().length >= 3 && label.includes(term.trim()))) return { ruleId: "model_category", eligible: true, points: 25, reason: "modelo solicitado" };
  else if (!types.length || types.includes(vehicleType)) return { ruleId: "model_category", eligible: true, points: 20, reason: "categoria preferida" };
  return { ruleId: "model_category", eligible: false, points: 0 };
}
// Results retain legacy evaluation/explanation order and raw, uncapped contributions.
export function evaluateBuyerVehicleRules(profile: BuyerProfile, vehicle: MatchableVehicle): MatchRuleResult[] {
  const types = parseTypes(profile.vehicle_types).map(normalize);
  const vehicleType = normalize(vehicle.type || guessedType(vehicle.label)); const preferred = normalize(profile.preferred_models); const label = normalize(vehicle.label);
  const legacyResults = [
    evaluateBudget(vehicle.price, profile.budget_max),
    evaluateModelCategory(preferred, label, types, vehicleType),
    evaluateYear(vehicle.year, profile.min_year),
    evaluateMileage(vehicle.mileage, profile.max_mileage),
    evaluateCity(profile.city, vehicle.city),
    evaluateTransmission(profile.transmission, vehicle.transmission),
    evaluateUseCase(profile.use_case, vehicle.useCases),
  ];
  const validCategories = validCategoryInput(profile.vehicle_types);
  const hasModelPreference = preferred.split(/[,;/]+/).some((term) => term.trim().length >= 3);
  const emptyModelPreference = profile.preferred_models === "";
  const modelMatched = legacyResults[1].reason === "modelo solicitado";
  const categoryAvailable = usableText(vehicle.type) || usableText(vehicle.label);
  const modelOnly = !types.length && hasModelPreference;
  const modelCategory = semanticResult(legacyResults[1], validCategories && !types.length && emptyModelPreference,
    validCategories && (emptyModelPreference || hasModelPreference),
    modelMatched || (modelOnly ? usableText(vehicle.label) : categoryAvailable),
    modelMatched || (types.length > 0 && types.includes(vehicleType)));
  // Model matching and guessed categories use label inference, never explicit provenance.
  modelCategory.vehicleDataSource = modelMatched || modelOnly
    ? usableText(vehicle.label) ? "inferred" : "unavailable"
    : usableText(vehicle.type) ? "explicit" : usableText(vehicle.label) ? "inferred" : "unavailable";
  return [
    semanticResult(legacyResults[0], false, usableNumber(profile.budget_max), usableNumber(vehicle.price)),
    modelCategory,
    semanticResult(legacyResults[2], profile.min_year === 0, usableNumber(profile.min_year), usableNumber(vehicle.year)),
    semanticResult(legacyResults[3], profile.max_mileage === 0 || profile.max_mileage === 999999, usableNumber(profile.max_mileage), usableNumber(vehicle.mileage, true)),
    semanticResult(legacyResults[4], false, usableText(profile.city), usableText(vehicle.city)),
    semanticResult(legacyResults[5], profile.transmission === "Indiferente", usableText(profile.transmission), usableText(vehicle.transmission)),
    semanticResult(legacyResults[6], profile.use_case === "", usableText(profile.use_case),
      profile.use_case === "" || !usableText(profile.use_case) || legacyResults[6].eligible
        || !!vehicle.useCases?.some((item) => usableText(item))),
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
