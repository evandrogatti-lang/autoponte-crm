import { CoreShell } from "../../components/crm/CoreShell";
import SettingsConsole from "./SettingsConsole";

export default function ConfiguracoesPage() {
  return <CoreShell activeHref="/configuracoes" title="Configurações" subtitle="Administre usuários, acessos e controles operacionais do AutoPonte CRM.">
    <SettingsConsole />
  </CoreShell>;
}
