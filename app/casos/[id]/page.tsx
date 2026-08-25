import { notFound } from "next/navigation";
import { CoreShell } from "../../../components/crm/CoreShell";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { CaseOperationError } from "../../../lib/commercial-cases/contracts";
import { getCommercialCase } from "../../../lib/commercial-cases/service";
import CaseWorkspace from "./CaseWorkspace";

export const dynamic="force-dynamic";
export default async function CasePage({params}:{params:Promise<{id:string}>}){const {id}=await params;await requireChatGPTUser(`/casos/${id}`);let data;try{data=await getCommercialCase(id)}catch(error){if(error instanceof CaseOperationError&&error.status===404)notFound();throw error}return <CoreShell activeHref="/casos" title={`${data.case.pilotCode||"Caso"} · ${data.vehicle?.brand} ${data.vehicle?.model}`} subtitle={`${data.customer?.name} · ${data.sellerName||"Sem vendedor"}`}><CaseWorkspace initialData={JSON.parse(JSON.stringify(data))}/></CoreShell>}
