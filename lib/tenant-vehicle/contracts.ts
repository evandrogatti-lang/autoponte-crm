export type VehicleStatus = "qualification" | "available" | "unavailable";
export type VehicleSource = "inventory" | "trade_in" | "consignment";
export type RegisterTenantVehicleInput = {
  tenantId?: string; vehicleSpecificationId?: string | null;
  status?: VehicleStatus; registrationReason: string;
};
export type ConfirmVehicleSourceInput = {
  tenantId?: string; tenantVehicleId: string; sourceType: VehicleSource; sourceId: string; reason: string;
};
export type VehicleResolution =
  | { state: "RESOLVED"; tenantVehicleId: string; vehicleSpecificationId: string | null; actionable: boolean }
  | { state: "UNRESOLVED"; tenantVehicleId: null; actionable: false };

export function validateVehicleInput(input: RegisterTenantVehicleInput | ConfirmVehicleSourceInput, mapping: boolean) {
  const allowed = new Set(mapping ? ["tenantId", "tenantVehicleId", "sourceType", "sourceId", "reason"] : ["tenantId", "vehicleSpecificationId", "status", "registrationReason"]);
  if (!input || typeof input !== "object" || Object.keys(input).some(key => !allowed.has(key))) throw new Error("Unsupported canonical vehicle input.");
  const fields = input as Record<string, unknown>;
  for (const key of mapping ? ["tenantVehicleId", "sourceId", "reason"] : ["registrationReason"]) {
    if (typeof fields[key] !== "string" || !(fields[key] as string).trim()) throw new Error(`${key} is required.`);
  }
  const reason = fields[mapping ? "reason" : "registrationReason"] as string;
  if (reason.length > 1000) throw new Error("Vehicle review reason exceeds its bound.");
  if (fields.tenantId !== undefined && (typeof fields.tenantId !== "string" || !fields.tenantId.trim())) throw new Error("Invalid Tenant selection.");
  if (mapping) {
    if (!["inventory", "trade_in", "consignment"].includes(fields.sourceType as string)) throw new Error("Unsupported vehicle source.");
  } else {
    if (fields.status !== undefined && !["qualification", "available", "unavailable"].includes(fields.status as string)) throw new Error("Invalid vehicle availability.");
    if (fields.vehicleSpecificationId !== undefined && fields.vehicleSpecificationId !== null && (typeof fields.vehicleSpecificationId !== "string" || !fields.vehicleSpecificationId.trim())) throw new Error("Invalid curated specification reference.");
  }
}
