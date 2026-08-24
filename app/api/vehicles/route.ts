import { and, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { vehicleDataProvenance } from "../../../db/vehicle-intelligence-schema";
import { vehicles } from "../../../db/vehicle-schema";
import { partners } from "../../../db/partner-schema";
import {
  attachVehicleProvenance,
  buildAutomaticVehicleProvenance,
  filterChangedVehicleProvenance,
  hasVehicleIntelligenceDataChanges,
  mergeVehicleProvenance,
} from "../../../lib/vehicle-intelligence/provenance";
import { persistVehicleDataProvenance } from "../../../lib/vehicle-intelligence/provenance-service";
import { calculateVehicleIntelligence } from "../../../lib/vehicle-intelligence/scoring";
import { persistVehicleIntelligenceSnapshot } from "../../../lib/vehicle-intelligence/service";
import { parseVehicleRegistrationInput, resolveVehicleRegistration } from "../../../lib/vehicles/vehicle-registration";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });
  return Response.json(await getDb().select().from(vehicles).orderBy(desc(vehicles.updatedAt)).limit(500));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const raw = await request.json() as Record<string, unknown>;
    const input = parseVehicleRegistrationInput(raw);
    const resolved = await resolveVehicleRegistration(input);
    const db = getDb();

    if (input.plate) {
      const duplicate = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.plate, input.plate)).limit(1);
      if (duplicate.length) return Response.json({ error: "Esta placa já está cadastrada." }, { status: 409 });
    }
    if (input.partnerId) {
      const [partner] = await db.select({ id: partners.id, status: partners.status }).from(partners).where(eq(partners.id, input.partnerId)).limit(1);
      if (!partner || partner.status !== "active") throw new Error("Parceiro inválido ou inativo.");
    }

    const id = crypto.randomUUID();
    const capturedAt = new Date();
    const vehicle = {
      id,
      inventoryScope: input.inventoryScope,
      partnerId: input.partnerId,
      sourceType: input.sourceType,
      status: input.status,
      plate: input.plate,
      chassis: input.chassis,
      stockCode: input.stockCode,
      brandCode: input.brandCode,
      modelCode: input.modelCode,
      yearCode: input.yearCode,
      brand: resolved.quote.brand,
      model: resolved.quote.model,
      modelYear: resolved.quote.modelYear,
      fuel: resolved.quote.fuel,
      fipeCode: resolved.quote.fipeCode,
      fipeReferenceMonth: resolved.quote.referenceMonth,
      fipeValue: resolved.quote.price,
      mileage: input.mileage,
      color: input.color,
      transmission: input.transmission,
      bodyType: input.bodyType,
      doors: input.doors,
      engine: input.engine,
      power: input.power,
      renavam: input.renavam,
      registrationState: input.registrationState,
      documentStatus: input.documentStatus,
      vehicleCondition: input.vehicleCondition,
      inspectionStatus: input.inspectionStatus,
      acquisitionDate: input.acquisitionDate,
      listingDate: input.listingDate,
      optionalItems: input.optionalItems,
      city: input.city,
      ownerName: input.ownerName,
      askingPrice: input.askingPrice,
      acquisitionCost: input.acquisitionCost,
      additionalCosts: input.additionalCosts,
      notes: input.notes,
      updatedAt: capturedAt,
    };
    const provenance = buildAutomaticVehicleProvenance({
      vehicleId: id,
      vehicle,
      submittedFields: new Set(Object.keys(raw)),
      fipeQuote: resolved.quote,
      capturedAt,
    });

    await db.transaction(async (tx) => {
      await tx.insert(vehicles).values(vehicle);
      await persistVehicleDataProvenance(tx, provenance);
      const scores = calculateVehicleIntelligence({
        ...attachVehicleProvenance(vehicle, provenance),
        calculatedAt: capturedAt.toISOString(),
      });
      await persistVehicleIntelligenceSnapshot({ vehicleId: id, scores, transactionDb: tx });
    });

    revalidatePath("/veiculos");
    revalidatePath("/parceiros");
    return Response.json({ id, href: `/veiculos/${id}` }, { status: 201 });
  } catch (error) {
    console.error("vehicle registration failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar o veículo." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return Response.json({ error: "Informe o veículo a ser atualizado." }, { status: 400 });

  try {
    const db = getDb();
    const [existing] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    if (!existing) return Response.json({ error: "Veículo não encontrado." }, { status: 404 });

    const raw = await request.json() as Record<string, unknown>;
    const rawBrandCode = String(raw.brandCode ?? "").trim();
    const rawModelCode = String(raw.modelCode ?? "").trim();
    const rawYearCode = String(raw.yearCode ?? "").trim();
    const isKeepingExistingFipeSelection =
      rawBrandCode === existing.brandCode &&
      rawModelCode === existing.modelCode &&
      rawYearCode === existing.yearCode;
    const input = parseVehicleRegistrationInput(
      raw,
      isKeepingExistingFipeSelection
        ? {
            allowedLegacyFipe: {
              brandCode: existing.brandCode,
              modelCode: existing.modelCode,
              yearCode: existing.yearCode,
            },
          }
        : undefined,
    );
    const resolved = isKeepingExistingFipeSelection ? null : await resolveVehicleRegistration(input);

    if (input.plate) {
      const duplicate = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.plate, input.plate), ne(vehicles.id, id)))
        .limit(1);
      if (duplicate.length) {
        return Response.json({ error: "Esta placa já está cadastrada em outro veículo." }, { status: 409 });
      }
    }
    if (input.partnerId) {
      const [partner] = await db.select({ id: partners.id, status: partners.status }).from(partners).where(eq(partners.id, input.partnerId)).limit(1);
      if (!partner || partner.status !== "active") throw new Error("Parceiro inválido ou inativo.");
    }

    const capturedAt = new Date();
    const update = {
      inventoryScope: input.inventoryScope,
      partnerId: input.partnerId,
      sourceType: input.sourceType,
      status: input.status,
      plate: input.plate,
      chassis: input.chassis,
      stockCode: input.stockCode,
      brandCode: input.brandCode,
      modelCode: input.modelCode,
      yearCode: input.yearCode,
      brand: resolved?.quote.brand ?? existing.brand,
      model: resolved?.quote.model ?? existing.model,
      modelYear: resolved?.quote.modelYear ?? existing.modelYear,
      fuel: resolved?.quote.fuel ?? existing.fuel,
      fipeCode: resolved?.quote.fipeCode ?? existing.fipeCode,
      fipeReferenceMonth: resolved?.quote.referenceMonth ?? existing.fipeReferenceMonth,
      fipeValue: resolved?.quote.price ?? existing.fipeValue,
      mileage: input.mileage,
      color: input.color,
      transmission: input.transmission,
      bodyType: input.bodyType,
      doors: input.doors,
      engine: input.engine,
      power: input.power,
      renavam: input.renavam,
      registrationState: input.registrationState,
      documentStatus: input.documentStatus,
      vehicleCondition: input.vehicleCondition,
      inspectionStatus: input.inspectionStatus,
      acquisitionDate: input.acquisitionDate,
      listingDate: input.listingDate,
      optionalItems: input.optionalItems,
      city: input.city,
      ownerName: input.ownerName,
      askingPrice: input.askingPrice,
      acquisitionCost: input.acquisitionCost,
      additionalCosts: input.additionalCosts,
      notes: input.notes,
      updatedAt: capturedAt,
    };
    await db.transaction(async (tx) => {
      const [lockedVehicle] = await tx
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, id), eq(vehicles.updatedAt, existing.updatedAt)))
        .for("update")
        .limit(1);
      if (!lockedVehicle) {
        throw new Error("O veículo foi alterado por outra operação. Recarregue os dados e tente novamente.");
      }
      const existingProvenance = await tx
        .select()
        .from(vehicleDataProvenance)
        .where(eq(vehicleDataProvenance.vehicleId, id));
      const current = { ...lockedVehicle, ...update };
      const provenance = buildAutomaticVehicleProvenance({
        vehicleId: id,
        vehicle: current,
        previousVehicle: lockedVehicle,
        submittedFields: new Set(Object.keys(raw)),
        fipeQuote: resolved?.quote,
        capturedAt,
      });
      const changedProvenance = filterChangedVehicleProvenance(existingProvenance, provenance);
      const shouldRecalculate =
        changedProvenance.length > 0 ||
        hasVehicleIntelligenceDataChanges(lockedVehicle, current);

      await tx.update(vehicles).set(update).where(eq(vehicles.id, id));
      await persistVehicleDataProvenance(tx, changedProvenance);
      if (shouldRecalculate) {
        const scores = calculateVehicleIntelligence({
          ...attachVehicleProvenance(current, mergeVehicleProvenance(existingProvenance, changedProvenance)),
          calculatedAt: capturedAt.toISOString(),
        });
        await persistVehicleIntelligenceSnapshot({ vehicleId: id, scores, transactionDb: tx });
      }
    });

    revalidatePath("/veiculos");
    revalidatePath(`/veiculos/${id}`);
    revalidatePath("/parceiros");
    return Response.json({ id, href: `/veiculos/${id}` });
  } catch (error) {
    console.error("vehicle update failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o veículo." }, { status: 400 });
  }
}
