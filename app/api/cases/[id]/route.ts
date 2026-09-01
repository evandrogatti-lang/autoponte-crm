import { revalidatePath } from "next/cache";
import { getCurrentAppUser } from "../../../app-auth";
import { recordAudit, requirePermission } from "../../../../lib/access-control";
import { CaseOperationError, parseCaseAction } from "../../../../lib/commercial-cases/contracts";
import { getCommercialCase, operateCommercialCase } from "../../../../lib/commercial-cases/service";

type Context={params:Promise<{id:string}>};
function responseStatus(error:unknown,fallback:number){
  if(error instanceof CaseOperationError)return error.status;
  const message=error instanceof Error?error.message:"";
  return message.includes("permissão")||message.includes("Perfil de acesso")?403:fallback;
}
export async function GET(_request:Request,{params}:Context){
  const user=await getCurrentAppUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});
  const actor={email:user.email,displayName:user.displayName};
  try{
    await requirePermission(actor,"seller_operations.manage");
    return Response.json(await getCommercialCase((await params).id));
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Não foi possível carregar o caso."},{status:responseStatus(error,500)});
  }
}
export async function POST(request:Request,{params}:Context){
  const user=await getCurrentAppUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});
  const actor={email:user.email,displayName:user.displayName};
  try{
    await requirePermission(actor,"seller_operations.manage");
    const id=(await params).id,action=parseCaseAction(await request.json() as Record<string,unknown>);
    const result=await operateCommercialCase(id,action,{name:user.displayName,email:user.email});
    await recordAudit(actor,action.type,"commercial_case",id,{entityId:result.entityId});
    revalidatePath("/casos");revalidatePath(`/casos/${id}`);revalidatePath(`/veiculos`);
    return Response.json(result,{status:201});
  }catch(error){
    return Response.json({error:error instanceof Error?error.message:"Não foi possível executar a operação."},{status:responseStatus(error,400)});
  }
}
