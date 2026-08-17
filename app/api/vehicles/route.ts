import { and, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { vehicles } from "../../../db/vehicle-schema";
import { partners } from "../../../db/partner-schema";
import { parseVehicleRegistrationInput, resolveVehicleRegistration } from "../../../lib/vehicles/vehicle-registration";
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});return Response.json(await getDb().select().from(vehicles).orderBy(desc(vehicles.updatedAt)).limit(500));}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});
 try{const input=parseVehicleRegistrationInput(await request.json() as Record<string,unknown>);const resolved=await resolveVehicleRegistration(input);
 if(input.plate){const duplicate=await getDb().select({id:vehicles.id}).from(vehicles).where(eq(vehicles.plate,input.plate)).limit(1);if(duplicate.length)return Response.json({error:"Esta placa já está cadastrada."},{status:409});}
 if(input.partnerId){const [partner]=await getDb().select({id:partners.id,status:partners.status}).from(partners).where(eq(partners.id,input.partnerId)).limit(1);if(!partner||partner.status!=="active")throw new Error("Parceiro inválido ou inativo.");}
 const id=crypto.randomUUID();await getDb().insert(vehicles).values({id,inventoryScope:input.inventoryScope,partnerId:input.partnerId,sourceType:input.sourceType,status:input.status,plate:input.plate,chassis:input.chassis,stockCode:input.stockCode,brandCode:input.brandCode,modelCode:input.modelCode,yearCode:input.yearCode,brand:resolved.quote.brand,model:resolved.quote.model,modelYear:resolved.quote.modelYear,fuel:resolved.quote.fuel,fipeCode:resolved.quote.fipeCode,fipeReferenceMonth:resolved.quote.referenceMonth,fipeValue:resolved.quote.price,mileage:input.mileage,color:input.color,transmission:input.transmission,bodyType:input.bodyType,doors:input.doors,engine:input.engine,power:input.power,renavam:input.renavam,registrationState:input.registrationState,documentStatus:input.documentStatus,vehicleCondition:input.vehicleCondition,inspectionStatus:input.inspectionStatus,acquisitionDate:input.acquisitionDate||undefined,listingDate:input.listingDate||undefined,optionalItems:input.optionalItems,city:input.city,ownerName:input.ownerName,askingPrice:input.askingPrice,acquisitionCost:input.acquisitionCost,additionalCosts:input.additionalCosts,notes:input.notes,updatedAt:new Date()});
 revalidatePath("/veiculos");revalidatePath("/parceiros");return Response.json({id,href:`/veiculos/${id}`},{status:201});
 }catch(error){console.error("vehicle registration failed",error);return Response.json({error:error instanceof Error?error.message:"Não foi possível cadastrar o veículo."},{status:400});}
}

export async function PUT(request: Request) {
 const user = await getChatGPTUser();
 if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });

 const url = new URL(request.url);
 const id = url.searchParams.get("id") || "";
 if (!id) return Response.json({ error: "Informe o veículo a ser atualizado." }, { status: 400 });

 try {
  const [existing] = await getDb()
   .select({
    id: vehicles.id,
    brandCode: vehicles.brandCode,
    modelCode: vehicles.modelCode,
    yearCode: vehicles.yearCode,
    brand: vehicles.brand,
    model: vehicles.model,
    modelYear: vehicles.modelYear,
    fuel: vehicles.fuel,
    fipeCode: vehicles.fipeCode,
    fipeReferenceMonth: vehicles.fipeReferenceMonth,
    fipeValue: vehicles.fipeValue,
   })
   .from(vehicles)
   .where(eq(vehicles.id, id))
   .limit(1);
  if (!existing) return Response.json({ error: "Veículo não encontrado." }, { status: 404 });

  const raw = await request.json() as Record<string, unknown>;
  const rawBrandCode = typeof raw.brandCode === "string" ? raw.brandCode.trim() : String(raw.brandCode ?? "").trim();
  const rawModelCode = typeof raw.modelCode === "string" ? raw.modelCode.trim() : String(raw.modelCode ?? "").trim();
  const rawYearCode = typeof raw.yearCode === "string" ? raw.yearCode.trim() : String(raw.yearCode ?? "").trim();
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
    : undefined
  );
  const resolved = isKeepingExistingFipeSelection ? null : await resolveVehicleRegistration(input);

  if (input.plate) {
   const duplicate = await getDb()
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(and(eq(vehicles.plate, input.plate), ne(vehicles.id, id)))
    .limit(1);
   if (duplicate.length) {
    return Response.json({ error: "Esta placa já está cadastrada em outro veículo." }, { status: 409 });
   }
  }

  if (input.partnerId) {
   const [partner] = await getDb()
    .select({ id: partners.id, status: partners.status })
    .from(partners)
    .where(eq(partners.id, input.partnerId))
    .limit(1);
   if (!partner || partner.status !== "active") {
    throw new Error("Parceiro inválido ou inativo.");
   }
  }

  await getDb()
   .update(vehicles)
   .set({
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
    brand: resolved ? resolved.quote.brand : existing.brand,
    model: resolved ? resolved.quote.model : existing.model,
    modelYear: resolved ? resolved.quote.modelYear : existing.modelYear,
    fuel: resolved ? resolved.quote.fuel : existing.fuel,
    fipeCode: resolved ? resolved.quote.fipeCode : existing.fipeCode,
    fipeReferenceMonth: resolved ? resolved.quote.referenceMonth : existing.fipeReferenceMonth,
    fipeValue: resolved ? resolved.quote.price : existing.fipeValue,
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
    acquisitionDate: input.acquisitionDate || undefined,
    listingDate: input.listingDate || undefined,
    optionalItems: input.optionalItems,
    city: input.city,
    ownerName: input.ownerName,
    askingPrice: input.askingPrice,
    acquisitionCost: input.acquisitionCost,
    additionalCosts: input.additionalCosts,
    notes: input.notes,
    updatedAt: new Date(),
   })
   .where(eq(vehicles.id, id));

  revalidatePath("/veiculos");
  revalidatePath(`/veiculos/${id}`);
  revalidatePath("/parceiros");
  return Response.json({ id, href: `/veiculos/${id}` });
 } catch (error) {
  console.error("vehicle update failed", error);
  return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o veículo." }, { status: 400 });
 }
}
