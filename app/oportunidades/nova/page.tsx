import { requireChatGPTUser } from "../../chatgpt-auth";
import { OpportunityCreateForm } from "../../../features/opportunity-create";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  await requireChatGPTUser("/oportunidades/nova");
  return <main className="crm-page operational-create-page">
    <header className="crm-header">
      <a className="brand" href="/crm"><span>AutoPonte</span> Veículos</a>
      <div><a href="/clientes">Clientes</a><a href="/oportunidades">Oportunidades</a><a href="/crm">Mission Control</a></div>
    </header>
    <section className="operational-create-shell">
      <div className="crm-title">
        <div><p className="eyebrow dark">CAMADA OPERACIONAL</p><h1>Nova oportunidade</h1></div>
        <p>Cadastre o cliente e abra imediatamente o workspace operacional conectado ao Supabase.</p>
      </div>
      <OpportunityCreateForm />
    </section>
  </main>;
}
