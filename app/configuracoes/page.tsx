import { CoreShell } from "../../components/crm/CoreShell";
import SettingsConsole from "./SettingsConsole";
import { requireCurrentAppUser } from "../app-auth";
import { requireSystemAdmin } from "../../lib/access-control";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await requireCurrentAppUser("/configuracoes");
  await requireSystemAdmin(user);
  return <CoreShell activeHref="/configuracoes" title="Configurações" subtitle="Administre usuários, acessos e controles operacionais do AutoPonte CRM.">
    <SettingsConsole />
  </CoreShell>;
}
