import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { authorizeApi } from "../_access";
import { getDb } from "../../../db";
import { partners } from "../../../db/partner-schema";

const clean=(value:unknown,max=180)=>typeof value==="string"?value.trim().slice(0,max):"";
const phoneDigits=(value:unknown,max=20)=>clean(value,max).replace(/\D/g,"");
export async function GET(){const access=await authorizeApi();if(access instanceof Response)return access;return Response.json(await getDb().select().from(partners).orderBy(desc(partners.updatedAt)).limit(500));}
export async function POST(request:Request){
  const access=await authorizeApi(["vehicles.manage"]);if(access instanceof Response)return access;
  try{
    const raw=await request.json() as Record<string,unknown>;
    const name=clean(raw.name,160);if(!name)throw new Error("Informe o nome do parceiro.");
    const document=phoneDigits(raw.document,20);
    if(document){const duplicate=await getDb().select({id:partners.id}).from(partners).where(eq(partners.document,document)).limit(1);if(duplicate.length)return Response.json({error:"Já existe um parceiro com este documento."},{status:409});}
    const ddi=phoneDigits(raw.phoneDdi,3)||"55",local=phoneDigits(raw.phoneLocal,15);const id=crypto.randomUUID();
    await getDb().insert(partners).values({id,name,legalName:clean(raw.legalName,180),document,partnerType:clean(raw.partnerType,40)||"dealer",status:clean(raw.status,40)||"active",contactName:clean(raw.contactName,160),phoneDdi:ddi,phoneLocal:local,phoneE164:local?`${ddi}${local}`:"",email:clean(raw.email,180).toLowerCase(),city:clean(raw.city,100),state:clean(raw.state,2).toUpperCase(),integrationMode:clean(raw.integrationMode,40)||"manual",externalSystem:clean(raw.externalSystem,120),notes:clean(raw.notes,2000),updatedAt:new Date()});
    revalidatePath("/parceiros");return Response.json({id,href:`/parceiros/${id}`},{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Não foi possível cadastrar o parceiro."},{status:400});}
}
