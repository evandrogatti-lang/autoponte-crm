export const SCORE_CALCULATOR_VERSION = "vehicle-intelligence-4a.1";

export type ScoreType = "DCI" | "DCQ" | "VQI" | "CVI";
export type ScoreStatus = "INSUFFICIENT_DATA" | "PROVISIONAL" | "RELIABLE" | "VERIFIED";
export type EvidenceSource = "manual" | "fipe" | "manufacturer" | "document" | "inspection" | "partner" | "ai_inferred" | "photo_ai" | "legacy_migration" | "system";

export type FieldEvidence = {
  source: EvidenceSource;
  confidence: number;
  verified?: boolean;
  verifiedAt?: string;
};

export type VehicleIntelligenceInput = {
  id: string;
  sourceType?: string;
  plate?: string;
  chassis?: string;
  stockCode?: string;
  brand?: string;
  model?: string;
  modelYear?: number;
  fuel?: string;
  mileage?: number;
  color?: string;
  transmission?: string;
  bodyType?: string;
  doors?: number;
  engine?: string;
  power?: string;
  renavam?: string;
  registrationState?: string;
  documentStatus?: string;
  vehicleCondition?: string;
  inspectionStatus?: string;
  acquisitionDate?: string;
  listingDate?: string;
  optionalItems?: string;
  city?: string;
  ownerName?: string;
  askingPrice?: number;
  acquisitionCost?: number;
  additionalCosts?: number;
  fipeValue?: number;
  calculatedAt?: string;
  provenance?: Record<string, FieldEvidence>;
};

export type ScoreComponent = {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  available: boolean;
  earned?: number;
  maximum?: number;
  evidenceCoverage?: number;
  verifiedEvidenceCoverage?: number;
};

export type VehicleScore = {
  vehicleId: string;
  scoreType: ScoreType;
  score: number;
  confidence: number;
  status: ScoreStatus;
  version: string;
  calculatorVersion: string;
  components: ScoreComponent[];
  reasonCodes: string[];
  missingEvidence: string[];
  calculatedAt: string;
  inputSnapshot: Record<string, unknown>;
};

export type VehicleIntelligenceResult = Record<ScoreType, VehicleScore>;

const DCI_COMPONENTS = [
  ["identification", "Identificação", 20, ["plate", "chassis", "renavam", "stockCode"]],
  ["specifications", "Especificações", 15, ["brand", "model", "modelYear", "fuel", "mileage", "color", "transmission", "bodyType", "doors", "engine", "power"]],
  ["origin", "Origem/proveniência", 10, ["sourceType", "ownerName", "city", "registrationState", "acquisitionDate"]],
  ["inspection", "Avaliação técnica", 15, ["inspectionStatus", "vehicleCondition"]],
  ["documentation", "Documentação", 10, ["renavam", "documentStatus"]],
  ["features", "Opcionais", 10, ["optionalItems"]],
  ["media", "Fotos/mídia", 10, []],
  ["commercial", "Custos/preço", 10, ["askingPrice", "acquisitionCost", "fipeValue"]],
] as const;

const VQI_WEIGHTS = [
  ["mechanical", "Mecânica", 25],
  ["structural", "Estrutura", 20],
  ["documentation_history", "Documentação/histórico", 15],
  ["exterior", "Conservação externa", 10],
  ["interior", "Conservação interna", 10],
  ["wear", "Pneus/freios/desgaste", 10],
  ["provenance_maintenance", "Proveniência/manutenção", 10],
] as const;

const CVI_WEIGHTS = [
  ["price_vs_market", "Preço vs mercado", 25],
  ["potential_margin", "Margem potencial", 20],
  ["liquidity", "Liquidez estimada", 20],
  ["demand_match", "Demanda/Match", 15],
  ["aging", "Aging", 10],
  ["listing_quality", "Qualidade do anúncio", 5],
  ["configuration_attractiveness", "Atratividade da configuração", 5],
] as const;

const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)));
const isText = (value: unknown) => typeof value === "string" && value.trim() !== "" && value.trim().toLowerCase() !== "unknown";
const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;

function hasField(input: VehicleIntelligenceInput, field: string): boolean {
  const value = input[field as keyof VehicleIntelligenceInput];
  if (field === "inspectionStatus" && ["pending", "unknown"].includes(String(value ?? "").trim().toLowerCase())) return false;
  if (field === "mileage" && input.sourceType === "new_vehicle") return typeof value === "number" && value >= 0;
  if (field === "doors") return typeof value === "number" && value > 0;
  return isText(value) || isNumber(value);
}

function evidenceFor(input: VehicleIntelligenceInput, field: string): FieldEvidence | undefined {
  const explicit = input.provenance?.[field];
  if (explicit) {
    const sourceConfidence = clamp(explicit.confidence);
    const confidence = explicit.source === "legacy_migration" ? Math.min(sourceConfidence, 35) : sourceConfidence;
    return { ...explicit, confidence };
  }
  if (!hasField(input, field)) return undefined;
  if (field === "fipeValue") return { source: "fipe", confidence: 70 };
  return { source: "manual", confidence: 45 };
}

function statusFor(confidence: number): ScoreStatus {
  if (confidence < 50) return "INSUFFICIENT_DATA";
  if (confidence < 75) return "PROVISIONAL";
  if (confidence < 90) return "RELIABLE";
  return "VERIFIED";
}

function scoreFromAvailable(components: ScoreComponent[]): number {
  const availableWeight = components.reduce((total, component) => total + (component.available ? component.weight : 0), 0);
  if (!availableWeight) return 0;
  return clamp(components.reduce((total, component) => total + (component.available ? component.weight * (component.score ?? 0) : 0), 0) / availableWeight);
}

function confidenceFromCoverage(components: ScoreComponent[]): number {
  return clamp(components.reduce((total, component) => total + (component.available ? component.weight : 0), 0));
}

function baseScore(input: VehicleIntelligenceInput, scoreType: ScoreType, components: ScoreComponent[], reasonCodes: string[], missingEvidence: string[]): VehicleScore {
  const confidence = confidenceFromCoverage(components);
  return {
    vehicleId: input.id,
    scoreType,
    score: scoreFromAvailable(components),
    confidence,
    status: statusFor(confidence),
    version: `${scoreType.toLowerCase()}-v${scoreType === "DCI" ? "2" : "1"}`,
    calculatorVersion: SCORE_CALCULATOR_VERSION,
    components,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    missingEvidence: [...new Set(missingEvidence)].sort(),
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
    inputSnapshot: { vehicleId: input.id, sourceType: input.sourceType ?? "", evidenceFields: Object.keys(input.provenance ?? {}).sort() },
  };
}

export function calculateDci(input: VehicleIntelligenceInput): VehicleScore {
  const reasonCodes: string[] = [];
  const missingEvidence: string[] = [];
  const components = DCI_COMPONENTS.map(([key, label, weight, fields]) => {
    const confirmedFields = fields.filter((field) => hasField(input, field));
    const available = fields.length > 0 && confirmedFields.length > 0;
    if (!available) missingEvidence.push(`DCI_${key.toUpperCase()}_MISSING`);
    if (key === "media") missingEvidence.push("DCI_MEDIA_UNAVAILABLE");
    const earned = fields.length ? Math.round((weight * confirmedFields.length) / fields.length) : 0;
    return { key, label, weight, score: available ? clamp((confirmedFields.length * 100) / fields.length) : null, available, earned, maximum: weight };
  });
  const score = clamp(components.reduce((total, component) => total + (component.earned ?? 0), 0));
  if (score >= 80) reasonCodes.push("DCI_RECORD_SUBSTANTIALLY_COMPLETE");
  if (components.some((component) => !component.available)) reasonCodes.push("DCI_EVIDENCE_INCOMPLETE");
  const result = baseScore(input, "DCI", components, reasonCodes, missingEvidence);
  return { ...result, score, confidence: score, status: statusFor(score) };
}

export function calculateDcq(input: VehicleIntelligenceInput): VehicleScore {
  const reasonCodes: string[] = [];
  const missingEvidence: string[] = [];
  const components = DCI_COMPONENTS.map(([key, label, weight, fields]) => {
    const evidenceByField = fields.flatMap((field) => {
      const evidence = evidenceFor(input, field);
      return evidence ? [{ field, evidence }] : [];
    });
    const evidence = evidenceByField.map((item) => item.evidence);
    const explicitEvidence = evidenceByField.filter((item) => Boolean(input.provenance?.[item.field]));
    const verified = explicitEvidence.filter((item) => item.evidence.verified).length;
    const available = evidence.length > 0;
    if (!available || evidence.some((item) => item.confidence < 50)) missingEvidence.push(`DCQ_${key.toUpperCase()}_WEAK_EVIDENCE`);
    const quality = available ? clamp(evidence.reduce((total, item) => total + item.confidence, 0) / evidence.length) : null;
    if (verified > 0) reasonCodes.push(`DCQ_${key.toUpperCase()}_VERIFIED`);
    return {
      key,
      label,
      weight,
      score: quality,
      available,
      evidenceCoverage: fields.length ? clamp((explicitEvidence.length * 100) / fields.length) : 0,
      verifiedEvidenceCoverage: fields.length ? clamp((verified * 100) / fields.length) : 0,
    };
  });
  const result = baseScore(input, "DCQ", components, reasonCodes, missingEvidence);
  const evidenceCoverage = components.reduce((total, component) => total + component.weight * (component.evidenceCoverage ?? 0), 0) / 100;
  const verifiedEvidenceCoverage = components.reduce((total, component) => total + component.weight * (component.verifiedEvidenceCoverage ?? 0), 0) / 100;
  const confidence = clamp(result.score * (0.25 + (evidenceCoverage / 400) + (verifiedEvidenceCoverage / 200)));
  if (confidence < 50) reasonCodes.push("DCQ_INSUFFICIENT_VERIFIED_EVIDENCE");
  return { ...result, confidence, status: statusFor(confidence), reasonCodes: [...new Set(reasonCodes)].sort() };
}

function conditionScore(input: VehicleIntelligenceInput, field: "vehicleCondition" | "documentStatus"): number | null {
  const evidence = input.provenance?.[field];
  if (!evidence) return null;
  const normalized = String(input[field] ?? "").trim().toLowerCase();
  if (["critical", "rejected", "irregular", "bad"].includes(normalized)) return 20;
  if (["attention", "fair", "pending"].includes(normalized)) return 55;
  if (["good", "regular", "approved", "excellent"].includes(normalized)) return normalized === "excellent" ? 90 : normalized === "approved" ? 85 : 75;
  return null;
}

export function calculateVqi(input: VehicleIntelligenceInput): VehicleScore {
  const reasonCodes: string[] = [];
  const missingEvidence: string[] = [];
  const inspectionEvidence = evidenceFor(input, "inspectionStatus");
  const completedInspection = inspectionEvidence && ["completed", "approved"].includes(String(input.inspectionStatus ?? "").toLowerCase());
  const documentation = conditionScore(input, "documentStatus");
  const condition = conditionScore(input, "vehicleCondition");
  const components = VQI_WEIGHTS.map(([key, label, weight]) => {
    let score: number | null = null;
    if (key === "documentation_history") score = documentation;
    if (key === "exterior" || key === "interior") score = condition;
    if (key === "mechanical" || key === "structural" || key === "wear") {
      score = completedInspection && input.provenance?.[key] ? clamp(input.provenance[key].confidence) : null;
    }
    if (key === "provenance_maintenance") score = input.provenance?.[key] ? clamp(input.provenance[key].confidence) : null;
    const available = score !== null;
    if (!available) missingEvidence.push(`VQI_${key.toUpperCase()}_UNAVAILABLE`);
    return { key, label, weight, score, available };
  });
  if (components.find((component) => component.key === "documentation_history")?.score === 75) reasonCodes.push("VQI_DOCUMENTATION_REPORTED");
  if (components.some((component) => !component.available)) reasonCodes.push("VQI_INCOMPLETE_INSPECTION_EVIDENCE");
  return baseScore(input, "VQI", components, reasonCodes, missingEvidence);
}

export function calculateCvi(input: VehicleIntelligenceInput): VehicleScore {
  const reasonCodes: string[] = [];
  const missingEvidence: string[] = [];
  const asking = input.askingPrice ?? 0;
  const fipe = input.fipeValue ?? 0;
  const cost = (input.acquisitionCost ?? 0) + (input.additionalCosts ?? 0);
  const listingDateValue = input.listingDate;
  const listingDate = typeof listingDateValue === "string" && listingDateValue.trim() !== "" && listingDateValue.trim().toLowerCase() !== "unknown"
    ? new Date(listingDateValue).getTime()
    : Number.NaN;
  const calculationInstant = input.calculatedAt ?? new Date().toISOString();
  const calculatedAt = new Date(calculationInstant).getTime();
  const components = CVI_WEIGHTS.map(([key, label, weight]) => {
    let score: number | null = null;
    if (key === "price_vs_market" && isNumber(asking) && isNumber(fipe)) score = clamp(100 - Math.abs(((asking - fipe) / fipe) * 100) * 2);
    if (key === "potential_margin" && isNumber(asking) && isNumber(cost) && asking > cost) score = clamp(((asking - cost) / asking) * 500);
    if (key === "aging" && Number.isFinite(listingDate) && Number.isFinite(calculatedAt)) score = clamp(100 - ((calculatedAt - listingDate) / 86400000) * 1.5);
    const available = score !== null;
    if (!available) missingEvidence.push(`CVI_${key.toUpperCase()}_UNAVAILABLE`);
    return { key, label, weight, score, available };
  });
  if (components.some((component) => !component.available)) reasonCodes.push("CVI_PARTIAL_COMMERCIAL_EVIDENCE");
  if (components.find((component) => component.key === "price_vs_market")?.available) reasonCodes.push("CVI_MARKET_PRICE_AVAILABLE");
  return baseScore(input, "CVI", components, reasonCodes, missingEvidence);
}

export function calculateVehicleIntelligence(input: VehicleIntelligenceInput): VehicleIntelligenceResult {
  return { DCI: calculateDci(input), DCQ: calculateDcq(input), VQI: calculateVqi(input), CVI: calculateCvi(input) };
}

export function vqiClassification(score: number): string {
  if (score >= 90) return "Excelente";
  if (score >= 80) return "Muito bom";
  if (score >= 70) return "Bom";
  if (score >= 60) return "Atenção";
  if (score >= 40) return "Risco";
  return "Crítico";
}
