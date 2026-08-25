import { getChatGPTUser } from "../../chatgpt-auth";
import { listCommercialCases } from "../../../lib/commercial-cases/service";

export async function GET(){
  const user=await getChatGPTUser();if(!user)return Response.json({error:"Não autorizado."},{status:401});
  try{return Response.json({cases:await listCommercialCases()});}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Não foi possível carregar os casos."},{status:500});}
}
