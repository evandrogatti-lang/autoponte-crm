import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";
import { opportunityStageLabels, statusToStage } from "../../lib/opportunities";
import type { OpportunityStage } from "../../lib/ade";

export const dynamic = "force-dynamic";

type OpportunitiesPageProps = {
  searchParams: Promise<{ stage?: string }>;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const labels: Record<string, string> = { hot: "Alta prioridade", warm: "Em negociação", review: "Requer análise", new: "Novo cadastro" };
const validStages = new Set<OpportunityStage>(["new", "contacted", "qualified", "store", "proposal", "closed"]);

function safePhotos(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function matchesStage(status: string, stage?: OpportunityStage) {
  if (!stage) return true;
  if (stage === "closed") return status === "closed";
  return status !== "lost" && statusToStage(status) === stage;
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  await requireChatGPTUser("/oportunidades");
  const query = await searchParams;
  const selectedStage = validStages.has(query.stage as OpportunityStage) ? query.stage as OpportunityStage : undefined;
  const allRows = await getDb().select().from(tradeIns).orderBy(desc(tradeIns.createdAt)).limit(200);
  const rows = allRows.filter((row) => matchesStage(row.status, selectedStage));

  return <main className="crm-page">
    <header className="crm-header"><a className="brand" href="/"><span>AutoPonte</span> Veículos</a><div><strong>Carteira de oportunidades</strong><a href="/crm">Mission Control</a><a href="/matches">AutoPonte Match</a><a href="/">Voltar ao site</a></div></header>
    <section className="crm-summary">
      <div><span>Cadastros reais</span><strong>{allRows.length}</strong></div>
      <div><span>Alta prioridade</span><strong>{allRows.filter((row) => row.leadCategory === "hot" && row.status !== "lost" && row.status !== "closed").length}</strong></div>
      <div><span>Retornos pendentes</span><strong>{allRows.filter((row) => row.nextFollowUp && new Date(row.nextFollowUp) <= new Date() && row.status !== "lost" && row.status !== "closed").length}</strong></div>
    </section>
    <section className="crm-content">
      <div className="crm-title"><div><p className="eyebrow dark">OPPORTUNITY WORKSPACE</p><h1>{selectedStage ? `${opportunityStageLabels[selectedStage]} · ${rows.length}` : "Oportunidades operacionais"}</h1></div><p>Clique em qualquer card para abrir dados, inteligência, ações e histórico persistente.</p></div>
      <nav className="opportunity-filters" aria-label="Filtrar por etapa">
        <a className={!selectedStage ? "active" : ""} href="/oportunidades">Todas</a>
        {Array.from(validStages).map((stage) => <a className={selectedStage === stage ? "active" : ""} href={`/oportunidades?stage=${stage}`} key={stage}>{opportunityStageLabels[stage]}</a>)}
      </nav>
      {rows.length === 0 ? <div className="crm-empty">Nenhuma oportunidade real nesta etapa.</div> : <div className="opportunity-grid">{rows.map((item) => {
        const photos = safePhotos(item.photoKeys);
        return <a className="opportunity-card opportunity-card-link" href={`/oportunidades/${item.id}`} key={item.id}>
          {photos[0] ? <img src={`/api/opportunities/photo?key=${encodeURIComponent(photos[0])}`} alt={`${item.brand} ${item.model}`} /> : <div className="opportunity-placeholder">Sem foto</div>}
          <div className="opportunity-body">
            <div className="opportunity-tags"><span className={`lead-${item.leadCategory}`}>{labels[item.leadCategory] ?? labels.new}</span><span>{item.status.replaceAll("_", " ")}</span></div>
            <h2>{item.brand} {item.model}</h2><p>{item.year} • {item.mileage.toLocaleString("pt-BR")} km • {item.city}</p>
            <dl><div><dt>FIPE</dt><dd>{brl.format(item.referencePrice)}</dd></div><div><dt>Faixa de troca</dt><dd>{brl.format(item.estimatedMin)}–{brl.format(item.estimatedMax)}</dd></div></dl>
            <p className="desired"><strong>Interesse:</strong> {item.desiredVehicle || "A definir"}</p>
            <p className="contact-name">{item.name}</p><p className="contact-date">Recebido em {item.createdAt.toLocaleDateString("pt-BR")} • próximo retorno {item.nextFollowUp ? new Date(item.nextFollowUp).toLocaleDateString("pt-BR") : "a definir"}</p>
            <span className="open-workspace">Abrir oportunidade →</span>
          </div>
        </a>;
      })}</div>}
    </section>
  </main>;
}
