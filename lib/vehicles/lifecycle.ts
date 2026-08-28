export const VEHICLE_ORIGINS = ["purchase", "trade_in", "consignment", "other"] as const;
export type VehicleOrigin = typeof VEHICLE_ORIGINS[number];

export const VEHICLE_LIFECYCLE_STATES = [
  "PENDING_ENTRY", "IN_STOCK", "PREPARATION", "READY", "PUBLISHED",
  "AVAILABLE", "RESERVED", "SOLD", "DELIVERED",
] as const;
export type VehicleLifecycleState = typeof VEHICLE_LIFECYCLE_STATES[number];

export const VEHICLE_BLOCKERS = ["DOCUMENT_BLOCKED", "MAINTENANCE_BLOCKED", "VQI_PENDING"] as const;
export type VehicleBlocker = typeof VEHICLE_BLOCKERS[number];

const nextStates: Record<VehicleLifecycleState, readonly VehicleLifecycleState[]> = {
  PENDING_ENTRY: ["IN_STOCK"],
  IN_STOCK: ["PREPARATION", "READY"],
  PREPARATION: ["READY"],
  READY: ["PUBLISHED", "AVAILABLE"],
  PUBLISHED: ["AVAILABLE"],
  AVAILABLE: ["RESERVED"],
  RESERVED: ["AVAILABLE", "SOLD"],
  SOLD: ["DELIVERED"],
  DELIVERED: [],
};

export function assertVehicleLifecycleTransition(from: VehicleLifecycleState, to: VehicleLifecycleState) {
  if (from === to) return;
  if (!nextStates[from].includes(to)) throw new Error(`Transição de ciclo de vida inválida: ${from} → ${to}.`);
}

export function assertVehicleLifecycleConsistency(state: VehicleLifecycleState, blockers: readonly VehicleBlocker[]) {
  if ((state === "SOLD" || state === "DELIVERED") && blockers.length) {
    throw new Error(`${state} não pode manter bloqueios operacionais ativos.`);
  }
  if (["PUBLISHED", "AVAILABLE", "RESERVED", "SOLD", "DELIVERED"].includes(state) && blockers.includes("VQI_PENDING")) {
    throw new Error(`${state} exige VQI concluído.`);
  }
}

export function legacyStatusToLifecycle(status: string): VehicleLifecycleState {
  return ({ evaluation: "PENDING_ENTRY", available: "AVAILABLE", reserved: "RESERVED", sold: "SOLD", unavailable: "PREPARATION" } as Record<string, VehicleLifecycleState>)[status] ?? "IN_STOCK";
}
