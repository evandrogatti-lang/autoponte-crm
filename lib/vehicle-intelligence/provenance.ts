import { createHash } from "node:crypto";
import type { FipeQuote } from "../fipe.ts";
import { normalizeVehicleDate, type EvidenceSource, type FieldEvidence } from "./scoring.ts";
import { COMPONENT_OBSERVATION_TYPES, isTrustedVqiEvidenceSource, isVqiEvidenceType } from "./evidence.ts";

export const MANUAL_PROVENANCE_FIELDS = [
  "sourceType",
  "plate",
  "chassis",
  "stockCode",
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
] as const;

export const FIPE_PROVENANCE_FIELDS = [
  "brandCode",
  "modelCode",
  "yearCode",
  "brand",
  "model",
  "modelYear",
  "fuel",
  "fipeCode",
  "fipeReferenceMonth",
  "fipeValue",
] as const;

export const VEHICLE_INTELLIGENCE_DATA_FIELDS = [
  ...MANUAL_PROVENANCE_FIELDS,
  "brand",
  "model",
  "modelYear",
  "fuel",
  "fipeValue",
] as const;

type VehicleValues = Record<string, unknown>;
const VEHICLE_DATE_FIELDS = new Set(["acquisitionDate", "listingDate"]);

export type VehicleProvenanceEntry = {
  id: string;
  vehicleId: string;
  fieldName: string;
  valueHash: string;
  source: EvidenceSource;
  confidence: number;
  verified: boolean;
  verifiedAt: Date | null;
  observationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredVehicleProvenance = {
  vehicleId?: string;
  fieldName: string;
  valueHash: string;
  source: string;
  confidence: number;
  verified: boolean;
  verifiedAt: Date | string | null;
  observationId?: string | null;
};

export type StoredVehicleEvidenceObservation = {
  id: string;
  vehicleId: string;
  evidenceType: string;
  value: unknown;
  valueHash: string;
  source: string;
  confidence: number;
  verified: boolean;
  verifiedAt: Date | string | null;
  supersedesObservationId: string | null;
};

function canonicalizeValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalizeValue(nested)}`)
      .join(",")}}`;
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "null";
}

export function calculateProvenanceValueHash(value: unknown): string {
  return createHash("sha256").update(canonicalizeValue(value)).digest("hex");
}

function calculateFieldValueHash(fieldName: string, value: unknown): string {
  const normalized = VEHICLE_DATE_FIELDS.has(fieldName)
    ? normalizeVehicleDate(value as Date | string | null | undefined)
    : value;
  return calculateProvenanceValueHash(normalized);
}

function provenanceId(vehicleId: string, fieldName: string): string {
  const identity = createHash("sha256").update(`${vehicleId}\0${fieldName}`).digest("hex");
  return `vehicle-provenance:${identity}`;
}

function hasEvidenceValue(fieldName: string, value: unknown, vehicle: VehicleValues): boolean {
  if (VEHICLE_DATE_FIELDS.has(fieldName)) return normalizeVehicleDate(value as Date | string | null | undefined) !== null;
  if (typeof value === "string") return value.trim() !== "" && value.trim().toLowerCase() !== "unknown";
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (fieldName === "mileage" && vehicle.sourceType === "new_vehicle") return value >= 0;
  return value > 0;
}

function entryFor({
  vehicleId,
  fieldName,
  value,
  source,
  confidence,
  verified,
  capturedAt,
}: {
  vehicleId: string;
  fieldName: string;
  value: unknown;
  source: EvidenceSource;
  confidence: number;
  verified: boolean;
  capturedAt: Date;
}): VehicleProvenanceEntry {
  return {
    id: provenanceId(vehicleId, fieldName),
    vehicleId,
    fieldName,
    valueHash: calculateFieldValueHash(fieldName, value),
    source,
    confidence,
    verified,
    verifiedAt: verified ? capturedAt : null,
    createdAt: capturedAt,
    updatedAt: capturedAt,
  };
}

function fipeValues(vehicle: VehicleValues, quote: FipeQuote): VehicleValues {
  return {
    brandCode: vehicle.brandCode,
    modelCode: vehicle.modelCode,
    yearCode: vehicle.yearCode,
    brand: quote.brand,
    model: quote.model,
    modelYear: quote.modelYear,
    fuel: quote.fuel,
    fipeCode: quote.fipeCode,
    fipeReferenceMonth: quote.referenceMonth,
    fipeValue: quote.price,
  };
}

function buildFipeEntries(vehicleId: string, vehicle: VehicleValues, quote: FipeQuote, capturedAt: Date): VehicleProvenanceEntry[] {
  const values = fipeValues(vehicle, quote);
  return FIPE_PROVENANCE_FIELDS.map((fieldName) =>
    entryFor({
      vehicleId,
      fieldName,
      value: values[fieldName],
      source: "fipe",
      confidence: 95,
      verified: true,
      capturedAt,
    }),
  );
}

export function buildAutomaticVehicleProvenance({
  vehicleId,
  vehicle,
  previousVehicle,
  submittedFields,
  fipeQuote,
  capturedAt = new Date(),
}: {
  vehicleId: string;
  vehicle: VehicleValues;
  previousVehicle?: VehicleValues;
  submittedFields: ReadonlySet<string>;
  fipeQuote?: FipeQuote | null;
  capturedAt?: Date;
}): VehicleProvenanceEntry[] {
  const entries = MANUAL_PROVENANCE_FIELDS.flatMap((fieldName) => {
    const value = vehicle[fieldName];
    if (!submittedFields.has(fieldName) || !hasEvidenceValue(fieldName, value, vehicle)) return [];
    if (previousVehicle && calculateFieldValueHash(fieldName, previousVehicle[fieldName]) === calculateFieldValueHash(fieldName, value)) return [];
    return [
      entryFor({
        vehicleId,
        fieldName,
        value,
        source: "manual",
        confidence: 55,
        verified: false,
        capturedAt,
      }),
    ];
  });

  if (fipeQuote) entries.push(...buildFipeEntries(vehicleId, vehicle, fipeQuote, capturedAt));
  return entries.sort((left, right) => left.fieldName.localeCompare(right.fieldName));
}

function normalized(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

export function buildVerifiedFipeBackfill({
  vehicleId,
  vehicle,
  quote,
  verifiedAt = new Date(),
}: {
  vehicleId: string;
  vehicle: VehicleValues;
  quote: FipeQuote;
  verifiedAt?: Date;
}): VehicleProvenanceEntry[] {
  const validSelection =
    /^\d+$/.test(String(vehicle.brandCode ?? "")) &&
    /^\d+$/.test(String(vehicle.modelCode ?? "")) &&
    /^\d{4,5}-\d+$/.test(String(vehicle.yearCode ?? ""));
  const exactMatch =
    normalized(vehicle.brand) === normalized(quote.brand) &&
    normalized(vehicle.model) === normalized(quote.model) &&
    vehicle.modelYear === quote.modelYear &&
    normalized(vehicle.fuel) === normalized(quote.fuel) &&
    vehicle.fipeCode === quote.fipeCode &&
    normalized(vehicle.fipeReferenceMonth) === normalized(quote.referenceMonth) &&
    vehicle.fipeValue === quote.price;

  return validSelection && exactMatch ? buildFipeEntries(vehicleId, vehicle, quote, verifiedAt) : [];
}

export function mergeVehicleProvenance(
  existing: readonly StoredVehicleProvenance[],
  replacements: readonly VehicleProvenanceEntry[],
): StoredVehicleProvenance[] {
  const byField = new Map(existing.map((entry) => [entry.fieldName, entry]));
  for (const entry of replacements) byField.set(entry.fieldName, entry);
  return [...byField.values()];
}

export function filterChangedVehicleProvenance(
  existing: readonly StoredVehicleProvenance[],
  candidates: readonly VehicleProvenanceEntry[],
): VehicleProvenanceEntry[] {
  const byField = new Map(existing.map((entry) => [entry.fieldName, entry]));
  return candidates.filter((candidate) => {
    const current = byField.get(candidate.fieldName);
    return !current ||
      current.valueHash !== candidate.valueHash ||
      current.source !== candidate.source ||
      current.confidence !== candidate.confidence ||
      current.verified !== candidate.verified;
  });
}

export function attachVehicleProvenance<T extends VehicleValues>(
  vehicle: T,
  rows: readonly StoredVehicleProvenance[],
  observations: readonly StoredVehicleEvidenceObservation[] = [],
): T & { provenance: Record<string, FieldEvidence> } {
  const provenance: Record<string, FieldEvidence> = {};
  const observationById = new Map(observations.map((observation) => [observation.id, observation]));
  const supersededIds = new Set(observations.flatMap((observation) => observation.supersedesObservationId ? [observation.supersedesObservationId] : []));
  for (const row of rows) {
    if (row.observationId) {
      const observation = observationById.get(row.observationId);
      if (!observation || supersededIds.has(observation.id)) continue;
      if (observation.vehicleId !== vehicle.id || (row.vehicleId && row.vehicleId !== vehicle.id)) continue;
      if (observation.evidenceType !== row.fieldName || !isVqiEvidenceType(observation.evidenceType)) continue;
      if (!observation.verified || !row.verified || !observation.verifiedAt || !row.verifiedAt) continue;
      if (!isTrustedVqiEvidenceSource(observation.evidenceType, observation.source)) continue;
      if (observation.source !== row.source || observation.confidence !== row.confidence) continue;
      if (!row.valueHash || row.valueHash !== observation.valueHash || observation.valueHash !== calculateProvenanceValueHash(observation.value)) continue;
      if (!COMPONENT_OBSERVATION_TYPES.has(observation.evidenceType) && row.valueHash !== calculateFieldValueHash(row.fieldName, vehicle[row.fieldName])) continue;
    } else if (!row.valueHash || row.valueHash !== calculateFieldValueHash(row.fieldName, vehicle[row.fieldName])) {
      continue;
    }
    provenance[row.fieldName] = {
      source: row.source as EvidenceSource,
      confidence: Math.max(0, Math.min(100, row.confidence)),
      verified: row.verified,
    };
  }
  return { ...vehicle, provenance };
}

export function hasVehicleIntelligenceDataChanges(previous: VehicleValues, current: VehicleValues): boolean {
  return VEHICLE_INTELLIGENCE_DATA_FIELDS.some(
    (fieldName) => calculateFieldValueHash(fieldName, previous[fieldName]) !== calculateFieldValueHash(fieldName, current[fieldName]),
  );
}
