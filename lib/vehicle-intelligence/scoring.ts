import { createHash } from "node:crypto";

export const SCORE_CALCULATOR_VERSION = "vehicle-intelligence-4b.1";

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
  acquisitionDate?: Date | string | null;
  listingDate?: Date | string | null;
  optionalItems?: string;
  city?: string;
  ownerName?: string;
  askingPrice?: number;
  acquisitionCost?: number;
  additionalCosts?: number;
  fipeValue?: number;
  calculatedAt?: string;
  referenceDate?: Date | string | null;
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
  inputSnapshotHash: string;
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

const SNAPSHOT_FIELDS = [
  "id",
  "sourceType",
  "plate",
  "chassis",
  "stockCode",
  "brand",
  "model",
  "modelYear",
  "fuel",
  "mileage",
  "color",
  "transmission",
  "bodyType",
  "doors",
  "engine",
  "power",
  "renavam",
  "registrationState",
  "documentStatus",
  "vehicleCondition",
  "inspectionStatus",
  "acquisitionDate",
  "listingDate",
  "optionalItems",
  "city",
  "ownerName",
  "askingPrice",
  "acquisitionCost",
  "additionalCosts",
  "fipeValue",
] as const;

const SNAPSHOT_PROVENANCE_FIELDS = new Set([
  ...DCI_COMPONENTS.flatMap(([, , , fields]) => fields),
  "mechanical",
  "structural",
  "wear",
  "provenance_maintenance",
]);

const SNAPSHOT_DATE_FIELDS = new Set(["acquisitionDate", "listingDate"]);

const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)));
const isText = (value: unknown) => typeof value === "string" && value.trim() !== "" && value.trim().toLowerCase() !== "unknown";
const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;

export function normalizeVehicleDate(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const calendarDate = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (calendarDate) {
      const [, year, month, day] = calendarDate;
      const calendarCheck = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (
        calendarCheck.getUTCFullYear() !== Number(year) ||
        calendarCheck.getUTCMonth() !== Number(month) - 1 ||
        calendarCheck.getUTCDate() !== Number(day)
      ) {
        return null;
      }
    }
  }
  const parsed = value instanceof Date ? value : new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function resolveVehicleReferenceDate(input: Record<string, unknown> | VehicleIntelligenceInput): string | null {
  const record = input as Record<string, unknown>;
  if (record.referenceDate !== undefined) {
    return normalizeVehicleDate(record.referenceDate as Date | string | null);
  }
  if (record.calculatedAt !== undefined) {
    return normalizeVehicleDate(record.calculatedAt as string);
  }
  return normalizeVehicleDate(new Date());
}

function canonicalizeJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalizeJson(entry)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, nestedValue]) => `${JSON.stringify(key)}:${canonicalizeJson(nestedValue)}`).join(",")}}`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return "null";
}

export function calculateInputSnapshotHash(inputSnapshot: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalizeJson(inputSnapshot)).digest("hex");
}

export function buildVehicleInputSnapshot(input: Record<string, unknown> | VehicleIntelligenceInput): Record<string, unknown> {
  const record = input as Record<string, unknown>;
  const snapshot = Object.fromEntries(
    SNAPSHOT_FIELDS.flatMap((field) => {
      if (SNAPSHOT_DATE_FIELDS.has(field)) {
        return [[field, normalizeVehicleDate(record[field] as Date | string | null | undefined)]];
      }
      return record[field] === undefined ? [] : [[field, record[field]]];
    }),
  );
  const provenance = record.provenance && typeof record.provenance === "object"
    ? Object.entries(record.provenance as Record<string, unknown>)
        .filter(([field]) => SNAPSHOT_PROVENANCE_FIELDS.has(field))
        .sort(([left], [right]) => left.localeCompare(right))
    : [];
  return {
    ...snapshot,
    referenceDate: resolveVehicleReferenceDate(record),
    provenance: Object.fromEntries(provenance),
  };
}

export function createVehicleScoreSnapshotIdentity({
  vehicleId,
  scoreType,
  version,
  calculatorVersion,
  inputSnapshot,
}: {
  vehicleId: string;
  scoreType: string;
  version: string;
  calculatorVersion: string;
  inputSnapshot: Record<string, unknown>;
}): { vehicleId: string; scoreType: string; version: string; calculatorVersion: string; inputSnapshotHash: string } {
  return {
    vehicleId,
    scoreType,
    version,
    calculatorVersion,
    inputSnapshotHash: calculateInputSnapshotHash(inputSnapshot),
  };
}

function hasField(input: VehicleIntelligenceInput, field: string): boolean {
  const value = input[field as keyof VehicleIntelligenceInput];
  if (field === "acquisitionDate" || field === "listingDate") return normalizeVehicleDate(value as Date | string | null | undefined) !== null;
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
  const version = `${scoreType.toLowerCase()}-v${scoreType === "DCI" ? "2" : "1"}`;
  const inputSnapshot = buildVehicleInputSnapshot(input);
  const inputSnapshotHash = calculateInputSnapshotHash(inputSnapshot);
  return {
    vehicleId: input.id,
    scoreType,
    score: scoreFromAvailable(components),
    confidence,
    status: statusFor(confidence),
    version,
    calculatorVersion: SCORE_CALCULATOR_VERSION,
    components,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    missingEvidence: [...new Set(missingEvidence)].sort(),
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
    inputSnapshot,
    inputSnapshotHash,
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
  const trustedSource = field === "documentStatus"
    ? evidence?.source === "document"
    : evidence?.source === "inspection" || evidence?.source === "photo_ai";
  if (!evidence?.verified || !trustedSource) return null;
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
      const evidence = input.provenance?.[key];
      score = completedInspection && evidence?.verified && evidence.source === "inspection" ? clamp(evidence.confidence) : null;
    }
    if (key === "provenance_maintenance") {
      const evidence = input.provenance?.[key];
      score = evidence?.verified && ["document", "manufacturer"].includes(evidence.source) ? clamp(evidence.confidence) : null;
    }
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
  const referenceDate = resolveVehicleReferenceDate(input);
  const scoringInput = { ...input, referenceDate };
  const asking = input.askingPrice ?? 0;
  const fipe = input.fipeValue ?? 0;
  const cost = (input.acquisitionCost ?? 0) + (input.additionalCosts ?? 0);
  const normalizedListingDate = normalizeVehicleDate(input.listingDate);
  const listingDate = normalizedListingDate ? new Date(`${normalizedListingDate}T00:00:00.000Z`).getTime() : Number.NaN;
  const referenceTime = referenceDate ? new Date(`${referenceDate}T00:00:00.000Z`).getTime() : Number.NaN;
  const components = CVI_WEIGHTS.map(([key, label, weight]) => {
    let score: number | null = null;
    if (key === "price_vs_market" && isNumber(asking) && isNumber(fipe)) score = clamp(100 - Math.abs(((asking - fipe) / fipe) * 100) * 2);
    if (key === "potential_margin" && isNumber(asking) && isNumber(cost) && asking > cost) score = clamp(((asking - cost) / asking) * 500);
    if (key === "aging" && Number.isFinite(listingDate) && Number.isFinite(referenceTime)) score = clamp(100 - ((referenceTime - listingDate) / 86400000) * 1.5);
    const available = score !== null;
    if (!available) missingEvidence.push(`CVI_${key.toUpperCase()}_UNAVAILABLE`);
    return { key, label, weight, score, available };
  });
  if (components.some((component) => !component.available)) reasonCodes.push("CVI_PARTIAL_COMMERCIAL_EVIDENCE");
  if (components.find((component) => component.key === "price_vs_market")?.available) reasonCodes.push("CVI_MARKET_PRICE_AVAILABLE");
  return baseScore(scoringInput, "CVI", components, reasonCodes, missingEvidence);
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
