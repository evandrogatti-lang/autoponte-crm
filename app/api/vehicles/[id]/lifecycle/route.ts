import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { vehicleLifecycleEvents } from "../../../../../db/pilot-schema";
import { vehicles } from "../../../../../db/vehicle-schema";
import { assertVehicleLifecycleConsistency, assertVehicleLifecycleTransition, VEHICLE_BLOCKERS, VEHICLE_LIFECYCLE_STATES, type VehicleBlocker, type VehicleLifecycleState } from "../../../../../lib/vehicles/lifecycle";
import { assertReadinessForState, getInventoryReadiness } from "../../../../../lib/vehicles/inventory-readiness";
import { getChatGPTUser } from "../../../../chatgpt-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json() as { status?: string; blockers?: string[]; reason?: string; caseId?: string };
    if (!VEHICLE_LIFECYCLE_STATES.includes(body.status as VehicleLifecycleState)) throw new Error("Status de ciclo de vida inválido.");
    if (!Array.isArray(body.blockers) || body.blockers.some((value) => !VEHICLE_BLOCKERS.includes(value as VehicleBlocker))) throw new Error("Bloqueador de ciclo de vida inválido.");
    const next = body.status as VehicleLifecycleState;
    const blockers = body.blockers as VehicleBlocker[];
    const readiness = await getInventoryReadiness(id);
    assertReadinessForState(next, readiness);
    const requiredBlockers = readiness.blockers;
    if (requiredBlockers.some((blocker) => !blockers.includes(blocker))) throw new Error(`Bloqueadores obrigatórios ausentes: ${requiredBlockers.join(", ")}.`);
    await getDb().transaction(async (tx) => {
      const [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, id)).for("update").limit(1);
      if (!vehicle) throw new Error("Veículo não encontrado.");
      assertVehicleLifecycleTransition(vehicle.lifecycleStatus as VehicleLifecycleState, next);
      assertVehicleLifecycleConsistency(next, blockers);
      const now = new Date();
      await tx.update(vehicles).set({ lifecycleStatus: next, lifecycleBlockers: blockers, updatedAt: now }).where(eq(vehicles.id, id));
      await tx.insert(vehicleLifecycleEvents).values({ id: crypto.randomUUID(), caseId: body.caseId || null, vehicleId: id, eventType: "LIFECYCLE_TRANSITION", status: next, occurredAt: now, description: body.reason || "Transição de ciclo de vida", metadata: { from: vehicle.lifecycleStatus, to: next, blockers, actor: user.email } });
    });
    return Response.json({ id, lifecycleStatus: next, blockers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao atualizar ciclo de vida." }, { status: 409 });
  }
}
