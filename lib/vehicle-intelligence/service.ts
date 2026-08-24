import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { vehicles } from "../../db/vehicle-schema";
import { calculateVehicleIntelligence, type VehicleIntelligenceResult } from "./scoring";

export async function calculateVehicleIntelligenceByVehicleId(vehicleId: string): Promise<VehicleIntelligenceResult> {
  const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
  if (!vehicle) throw new Error(`Veículo ${vehicleId} não encontrado para recalcular inteligência.`);
  return calculateVehicleIntelligence(vehicle);
}
