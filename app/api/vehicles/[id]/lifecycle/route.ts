import { parseVehicleLifecycleCommand, transitionVehicleLifecycle, VehicleLifecycleOperationError } from "../../../../../lib/vehicles/lifecycle-service";
import { authorizeApi } from "../../../_access";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authorizeApi(["vehicles.manage"]);
  if (user instanceof Response) return user;
  const { id } = await params;
  try {
    const command = parseVehicleLifecycleCommand(await request.json());
    return Response.json(await transitionVehicleLifecycle(id, command, user));
  } catch (error) {
    const status = error instanceof VehicleLifecycleOperationError ? error.status : 409;
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao atualizar ciclo de vida." }, { status });
  }
}
