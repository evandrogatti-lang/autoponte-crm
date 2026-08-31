import { requireChatGPTUser } from "../chatgpt-auth";
import { CoreShell } from "../../components/crm/CoreShell";
import { getCasesMissionControl } from "../../lib/commercial-cases/service";
import { CasesMissionControl } from "../../features/mission-control";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  await requireChatGPTUser("/crm");
  let model=null;
  try{model=await getCasesMissionControl();}catch(error){console.error("cases mission control unavailable",error);}
  return <CoreShell activeHref="/crm" title="Mission Control" subtitle="Casos que pedem atenção operacional agora."><CasesMissionControl model={model}/></CoreShell>;
}
