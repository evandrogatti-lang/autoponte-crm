import type { EvidenceSource } from "./scoring.ts";

export const VQI_EVIDENCE_TYPES = [
  "inspectionStatus",
  "documentStatus",
  "vehicleCondition",
  "mechanical",
  "structural",
  "wear",
  "provenance_maintenance",
] as const;

export type VqiEvidenceType = typeof VQI_EVIDENCE_TYPES[number];
export type TrustedVqiEvidenceSource = Extract<EvidenceSource, "document" | "inspection" | "manufacturer" | "photo_ai">;
export const VQI_EVIDENCE_PERMISSION = "vehicles.manage";
export const FORGED_TRUST_FIELDS = ["source", "verified", "verifiedAt", "verifiedBy", "confidence"] as const;

const TRUSTED_SOURCES: Record<VqiEvidenceType, readonly TrustedVqiEvidenceSource[]> = {
  inspectionStatus: ["inspection"],
  documentStatus: ["document"],
  vehicleCondition: ["inspection", "photo_ai"],
  mechanical: ["inspection"],
  structural: ["inspection"],
  wear: ["inspection"],
  provenance_maintenance: ["document", "manufacturer"],
};

export const COMPONENT_OBSERVATION_TYPES = new Set<VqiEvidenceType>([
  "mechanical",
  "structural",
  "wear",
  "provenance_maintenance",
]);

export function isVqiEvidenceType(value: string): value is VqiEvidenceType {
  return (VQI_EVIDENCE_TYPES as readonly string[]).includes(value);
}

export function isTrustedVqiEvidenceSource(evidenceType: VqiEvidenceType, source: string): source is TrustedVqiEvidenceSource {
  return (TRUSTED_SOURCES[evidenceType] as readonly string[]).includes(source);
}

export function endpointSourceForEvidenceType(evidenceType: VqiEvidenceType): TrustedVqiEvidenceSource {
  return evidenceType === "documentStatus" || evidenceType === "provenance_maintenance" ? "document" : "inspection";
}

export function hasForgedTrustFields(input: Record<string, unknown>): boolean {
  return FORGED_TRUST_FIELDS.some((field) => Object.hasOwn(input, field));
}
