export const VEHICLE_READINESS_STAGES = [
  "draft",
  "evaluation",
  "approved_for_stock",
  "preparation",
  "ready_for_sale",
  "publishable",
  "ai_ready",
] as const;

export type VehicleReadinessStage = typeof VEHICLE_READINESS_STAGES[number];

export type VehicleReadinessInput = {
  hasIdentity: boolean;
  hasOrigin: boolean;
  hasMileage: boolean;
  hasDocumentation: boolean;
  hasInspection: boolean;
  hasAcquisitionCost: boolean;
  hasAskingPrice: boolean;
  requiredFeatureCoveragePct: number;
  requiredMediaCoveragePct: number;
  dataCompletenessPct: number;
};

export function resolveVehicleReadiness(input: VehicleReadinessInput): VehicleReadinessStage {
  if (!input.hasIdentity) return "draft";
  if (!input.hasOrigin || !input.hasMileage) return "evaluation";
  if (!input.hasDocumentation || !input.hasInspection || !input.hasAcquisitionCost) return "approved_for_stock";
  if (!input.hasAskingPrice) return "preparation";
  if (input.requiredFeatureCoveragePct < 70) return "ready_for_sale";
  if (input.requiredMediaCoveragePct < 100 || input.dataCompletenessPct < 85) return "publishable";
  return "ai_ready";
}

export const REQUIRED_MEDIA_CATEGORIES = [
  "exterior_front",
  "exterior_rear",
  "exterior_side_left",
  "exterior_side_right",
  "dashboard",
  "seats_front",
  "seats_rear",
  "trunk",
  "instrument_cluster",
  "infotainment",
  "engine",
  "detail",
] as const;
