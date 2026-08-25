import { revalidatePath } from "next/cache";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { recordAudit, requirePermission } from "../../../../lib/access-control";
import { CaseOperationError, parseCaseAction } from "../../../../lib/commercial-cases/contracts";
import { getCommercialCase, operateCommercialCase } from "../../../../lib/commercial-cases/service";

type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});
  try{return Response.json(await getCommercialCase((await params).id));}
  catch(error){const status=error instanceof CaseOperationError?error.status:500;return Response.json({error:error instanceof Error?error.message:"Não foi possível carregar o caso."},{status});}
}
export async function POST(request:Request,{params}:Context){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});
  const actor={email:user.email,displayName:user.displayName};
  try{
    await requirePermission(actor,"seller_operations.manage");
    const id=(await params).id,action=parseCaseAction(await request.json() as Record<string,unknown>);
    const result=await operateCommercialCase(id,action,{name:user.displayName,email:user.email});
    await recordAudit(actor,action.type,"commercial_case",id,{entityId:result.entityId});
    revalidatePath("/casos");revalidatePath(`/casos/${id}`);revalidatePath(`/veiculos`);
    return Response.json(result,{status:201});
  }catch(error){const status=error instanceof CaseOperationError?error.status:400;return Response.json({error:error instanceof Error?error.message:"Não foi possível executar a operação."},{status});}
}
