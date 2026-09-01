import { requireSellerOperations } from "../../app-auth";
import { OpportunityCreateForm } from "../../../features/opportunity-create";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  await requireSellerOperations("/oportunidades/nova");
  return <main className="crm-page operational-create-page">
    <header className="crm-header">
      <Link className="brand" href="/crm"><span>AutoPonte</span> Veículos</Link>
      <div><Link href="/clientes">Clientes</Link><Link href="/oportunidades">Oportunidades</Link><Link href="/crm">Mission Control</Link></div>
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
