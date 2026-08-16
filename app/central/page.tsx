import { CoreShell } from "../../components/crm/CoreShell";
import OperationsConsole from "./OperationsConsole";

export default function CentralPage() {
  return <CoreShell activeHref="/central" title="Central de Atendimento" subtitle="Distribua oportunidades com contexto, capacidade e histórico auditável.">
    <OperationsConsole />
  </CoreShell>;
}
