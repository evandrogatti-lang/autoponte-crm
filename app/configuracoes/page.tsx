import { CoreShell } from "../../components/crm/CoreShell";
import SettingsConsole from "./SettingsConsole";
import { requireCurrentAppUser } from "../app-auth";
import { requireSystemAdmin } from "../../lib/access-control";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await requireCurrentAppUser("/configuracoes");
  try { await requireSystemAdmin(user); } catch { redirect("/acesso-negado"); }
  return <CoreShell activeHref="/configuracoes" title="Configurações" subtitle="Administre usuários, acessos e controles operacionais do AutoPonte CRM.">
    <SettingsConsole />
  </CoreShell>;
}
