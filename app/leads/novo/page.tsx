import Link from "next/link";
import { requireSellerOperations } from "../../app-auth";
import { OpportunityCreateForm } from "../../../features/opportunity-create";
import { commercialRoutes } from "../../../lib/commercial-navigation";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireSellerOperations(commercialRoutes.newLead);
  return <main className="crm-page operational-create-page">
    <header className="crm-header">
      <Link className="brand" href={commercialRoutes.missionControl}><span>AutoPonte</span> Veículos</Link>
      <div><Link href={commercialRoutes.leads}>Leads</Link><Link href={commercialRoutes.match}>Match</Link><Link href={commercialRoutes.missionControl}>Mission Control</Link></div>
    </header>
    <section className="operational-create-shell">
      <div className="crm-title">
        <div><p className="eyebrow dark">ENTRADA COMERCIAL</p><h1>Novo lead</h1></div>
        <p>Registre a intenção do cliente e inicie a qualificação com dados persistidos.</p>
      </div>
      <OpportunityCreateForm />
    </section>
  </main>;
}
