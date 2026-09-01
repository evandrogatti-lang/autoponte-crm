import { desc } from "drizzle-orm";
import { requireSellerOperations } from "../app-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";
import { opportunityStageLabels, statusToStage } from "../../lib/opportunities";
import type { OpportunityStage } from "../../lib/ade";
import Link from "next/link";
import { OpportunityViewList } from "../../components/crm/OpportunityViewToggle";

export const dynamic = "force-dynamic";

type OpportunitiesPageProps = {
  searchParams: Promise<{ stage?: string }>;
};

const validStages = new Set<OpportunityStage>(["new", "contacted", "qualified", "store", "proposal", "closed"]);

function matchesStage(status: string, stage?: OpportunityStage) {
  if (!stage) return true;
  if (stage === "closed") return status === "closed";
  return status !== "lost" && statusToStage(status) === stage;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  await requireSellerOperations("/oportunidades");
  const query = await searchParams;
  const selectedStage = validStages.has(query.stage as OpportunityStage) ? query.stage as OpportunityStage : undefined;
  const allRows = await getDb().select().from(tradeIns).orderBy(desc(tradeIns.createdAt)).limit(200);
  const rows = allRows.filter((row) => matchesStage(row.status, selectedStage));

  return <main className="crm-page">
    <header className="crm-header"><Link className="brand" href="/crm"><span>AutoPonte</span> Veículos</Link><div><strong>Carteira de oportunidades</strong><Link href="/clientes">Clientes</Link><Link href="/crm">Mission Control</Link><Link className="crm-header-cta" href="/oportunidades/nova">+ Nova oportunidade</Link></div></header>
    <section className="crm-summary">
      <div><span>Cadastros reais</span><strong>{allRows.length}</strong></div>
      <div><span>Alta prioridade</span><strong>{allRows.filter((row) => row.leadCategory === "hot" && row.status !== "lost" && row.status !== "closed").length}</strong></div>
      <div><span>Retornos pendentes</span><strong>{allRows.filter((row) => row.nextFollowUp && new Date(row.nextFollowUp) <= new Date() && row.status !== "lost" && row.status !== "closed").length}</strong></div>
    </section>
    <section className="crm-content">
      <div className="crm-title"><div><h1>{selectedStage ? `${opportunityStageLabels[selectedStage]} · ${rows.length}` : "Oportunidades operacionais"}</h1></div><p>Clique em qualquer card para abrir dados, inteligência, ações e histórico persistente.</p></div>
      <nav className="opportunity-filters" aria-label="Filtrar por etapa">
        <Link className={!selectedStage ? "active" : ""} href="/oportunidades">Todas</Link>
        {Array.from(validStages).map((stage) => <Link className={selectedStage === stage ? "active" : ""} href={`/oportunidades?stage=${stage}`} key={stage}>{opportunityStageLabels[stage]}</Link>)}
      </nav>
      {rows.length === 0 ? <div className="crm-empty client-empty"><strong>Nenhuma oportunidade real nesta etapa.</strong><span>Cadastre uma oportunidade para iniciar o fluxo operacional.</span><Link href="/oportunidades/nova">+ Nova oportunidade</Link></div> : <OpportunityViewList rows={rows.map((row) => ({ ...row, year: Number(row.year) || null }))} />}
    </section>
  </main>;
}




