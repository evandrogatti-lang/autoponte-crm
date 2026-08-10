import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { opportunityEvents, tradeIns } from "../../db/schema";
import { buildMissionControl } from "../../lib/mission-control/mapper";
import type { MissionEventRow, TradeInRow } from "../../lib/mission-control/model";
import styles from "./recommendations.module.css";

export const dynamic = "force-dynamic";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function urgencyLabel(value: string) {
  const labels: Record<string, string> = {
    now: "Agora",
    today: "Hoje",
    soon: "Em breve",
    monitor: "Monitorar",
  };
  return labels[value] ?? value;
}

export default async function RecommendationsPage() {
  await requireChatGPTUser("/recomendacoes");

  const [liveRows, liveEvents] = await Promise.all([
    getDb().select().from(tradeIns).orderBy(desc(tradeIns.updatedAt)).limit(500),
    getDb().select().from(opportunityEvents).orderBy(desc(opportunityEvents.createdAt)).limit(100),
  ]);

  const rows: TradeInRow[] = liveRows.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    brand: row.brand,
    model: row.model,
    year: row.year,
    desiredVehicle: row.desiredVehicle,
    estimatedMin: row.estimatedMin,
    estimatedMax: row.estimatedMax,
    referencePrice: row.referencePrice,
    mileage: row.mileage,
    condition: row.condition,
    status: row.status,
    leadCategory: row.leadCategory,
    nextFollowUp: row.nextFollowUp,
    lastContactAt: row.lastContactAt,
    notes: row.notes,
    createdAt: row.createdAt,
  }));

  const events: MissionEventRow[] = liveEvents.map((event) => ({
    id: event.id,
    opportunityId: event.opportunityId,
    title: event.title,
    description: event.description,
    createdAt: event.createdAt,
  }));

  const model = buildMissionControl(rows, new Date(), events);
  const opportunities = [...model.opportunities]
    .filter((item) => item.status !== "closed" && item.status !== "lost")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <nav className={styles.breadcrumb}>
            <a href="/crm">Mission Control</a><span>›</span><strong>Recomendações da IA</strong>
          </nav>
          <h1>Recomendações da IA</h1>
          <p>Cada recomendação abre a oportunidade correspondente e preserva o contexto específico do cliente.</p>
        </div>
        <a className={styles.back} href="/crm">Voltar ao Mission Control</a>
      </header>

      <section className={styles.metrics}>
        <article><span>Recomendações ativas</span><strong>{opportunities.length}</strong></article>
        <article><span>Ação imediata</span><strong>{opportunities.filter((item) => item.recommendation.urgency === "now").length}</strong></article>
        <article><span>Prioridade alta</span><strong>{opportunities.filter((item) => item.priority === "Alta").length}</strong></article>
        <article><span>Margem potencial</span><strong>{brl.format(opportunities.reduce((sum, item) => sum + item.marginPotential, 0))}</strong></article>
      </section>

      <section className={styles.list}>
        {opportunities.length === 0 && (
          <div className={styles.empty}>Sem recomendações acionáveis enquanto não houver oportunidades ativas.</div>
        )}

        {opportunities.map((item, index) => {
          const evidence = [...item.explanations, ...item.warnings].filter(Boolean).slice(0, 4);
          return (
            <article className={styles.card} key={item.id}>
              <div className={styles.rank}>{index + 1}</div>
              <div className={styles.content}>
                <header>
                  <div>
                    <span className={styles.eyebrow}>{item.interest}</span>
                    <h2>{item.name}</h2>
                    <p>{item.city} · Etapa {item.stage} · Probabilidade {item.probability}%</p>
                  </div>
                  <span className={styles.urgency}>{urgencyLabel(item.recommendation.urgency)}</span>
                </header>

                <div className={styles.grid}>
                  <section>
                    <span>Ação recomendada</span>
                    <strong>{item.recommendation.action}</strong>
                    <p>Canal sugerido: {item.recommendation.channel}</p>
                  </section>
                  <section>
                    <span>Por que agora?</span>
                    <strong>{item.recommendation.rationale || "Oportunidade priorizada pelo score operacional."}</strong>
                    <p>Temperatura {item.temperature.label.toLowerCase()} · Momentum {item.momentum}</p>
                  </section>
                  <section>
                    <span>Impacto esperado</span>
                    <strong>{item.marginPotential > 0 ? `${brl.format(item.marginPotential)} de margem potencial` : "Avançar a próxima etapa comercial"}</strong>
                    <p>Score de prioridade {item.priorityScore}</p>
                  </section>
                </div>

                <div className={styles.evidence}>
                  <strong>Evidências utilizadas</strong>
                  {evidence.length > 0 ? (
                    <ul>{evidence.map((line) => <li key={line}>{line}</li>)}</ul>
                  ) : (
                    <p>Dados insuficientes para uma justificativa mais específica.</p>
                  )}
                </div>

                <footer>
                  <a href={`/oportunidades/${item.id}`}>Abrir oportunidade de {item.name}</a>
                </footer>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
