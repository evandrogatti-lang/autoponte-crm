import { CoreShell } from "../../components/crm/CoreShell";
import OperationsConsole from "./OperationsConsole";
import { requireSellerOperations } from "../app-auth";

export const dynamic = "force-dynamic";

export default async function CentralPage() {
  await requireSellerOperations("/central");
  return <CoreShell activeHref="/central" title="Central de Atendimento" subtitle="Distribua oportunidades com contexto, capacidade e histórico auditável.">
    <OperationsConsole />
  </CoreShell>;
}
