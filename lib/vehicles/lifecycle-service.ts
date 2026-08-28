import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { vehicleLifecycleEvents } from "../../db/pilot-schema.ts";
import { vehicles } from "../../db/vehicle-schema.ts";
import { assertReadinessForState, getInventoryReadiness } from "./inventory-readiness.ts";
import {
  assertVehicleLifecycleConsistency,
  assertVehicleLifecycleTransition,
  VEHICLE_BLOCKERS,
  VEHICLE_LIFECYCLE_STATES,
  type VehicleBlocker,
  type VehicleLifecycleState,
} from "./lifecycle.ts";

export type VehicleLifecycleCommand = {
  status: VehicleLifecycleState;
  blockers: VehicleBlocker[];
  reason: string;
  caseId: string | null;
};

export type VehicleLifecycleActor = { email: string };

export class VehicleLifecycleOperationError extends Error {
  readonly status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.name = "VehicleLifecycleOperationError";
    this.status = status;
  }
}

export function parseVehicleLifecycleCommand(raw: unknown): VehicleLifecycleCommand {
  if (!raw || typeof raw !== "object") throw new VehicleLifecycleOperationError("Comando de ciclo de vida inválido.", 400);
  const body = raw as Record<string, unknown>;
  if (!VEHICLE_LIFECYCLE_STATES.includes(body.status as VehicleLifecycleState)) {
    throw new VehicleLifecycleOperationError("Status de ciclo de vida inválido.", 400);
  }
  if (!Array.isArray(body.blockers) || body.blockers.some((value) => !VEHICLE_BLOCKERS.includes(value as VehicleBlocker))) {
    throw new VehicleLifecycleOperationError("Bloqueador de ciclo de vida inválido.", 400);
  }
  return {
    status: body.status as VehicleLifecycleState,
    blockers: [...new Set(body.blockers as VehicleBlocker[])],
    reason: typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "",
    caseId: typeof body.caseId === "string" && body.caseId.trim() ? body.caseId.trim().slice(0, 80) : null,
  };
}

export async function transitionVehicleLifecycle(vehicleId: string, command: VehicleLifecycleCommand, actor: VehicleLifecycleActor) {
  const readiness = await getInventoryReadiness(vehicleId).catch((error) => {
    if (error instanceof Error && error.message === "Veículo não encontrado.") {
      throw new VehicleLifecycleOperationError(error.message, 404);
    }
    throw error;
  });
  assertReadinessForState(command.status, readiness);
  const requiredBlockers = readiness.blockers;
  if (requiredBlockers.some((blocker) => !command.blockers.includes(blocker))) {
    throw new VehicleLifecycleOperationError(`Bloqueadores obrigatórios ausentes: ${requiredBlockers.join(", ")}.`);
  }

  const db = getDb();
  await db.transaction(async (tx) => {
    const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, vehicleId)).for("update").limit(1);
    if (!vehicle) throw new VehicleLifecycleOperationError("Veículo não encontrado.", 404);
    assertVehicleLifecycleTransition(vehicle.lifecycleStatus as VehicleLifecycleState, command.status);
    assertVehicleLifecycleConsistency(command.status, command.blockers);
    const now = new Date();
    await tx.update(vehicles).set({ lifecycleStatus: command.status, lifecycleBlockers: command.blockers, updatedAt: now }).where(eq(vehicles.id, vehicleId));
    await tx.insert(vehicleLifecycleEvents).values({
      id: crypto.randomUUID(),
      caseId: command.caseId,
      vehicleId,
      eventType: "LIFECYCLE_TRANSITION",
      status: command.status,
      occurredAt: now,
      description: command.reason || "Transição de ciclo de vida",
      metadata: { from: vehicle.lifecycleStatus, to: command.status, blockers: command.blockers, actor: actor.email },
    });
  });
  return { id: vehicleId, lifecycleStatus: command.status, blockers: command.blockers };
}
