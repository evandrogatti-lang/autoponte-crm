import { getCurrentAppUser } from "../../app-auth";
import { requirePermission } from "../../../lib/access-control";
import { listCommercialCases } from "../../../lib/commercial-cases/service";

export async function GET(){
  const user=await getCurrentAppUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});
  const actor={email:user.email,displayName:user.displayName};
  try{
    await requirePermission(actor,"seller_operations.manage");
    return Response.json({cases:await listCommercialCases()});
  }catch(error){
    const message=error instanceof Error?error.message:"Não foi possível carregar os casos.";
    const forbidden=message.includes("permissão")||message.includes("Perfil de acesso");
    return Response.json({error:message},{status:forbidden?403:500});
  }
}
