import type { CSSProperties } from "react";
import Link from "next/link";
import type { MissionControlViewModel, MissionOpportunity } from "../../../lib/mission-control/model";
import { Icons } from "./icons";
import styles from "./MissionControl.module.css";
import { FlowEngineV2 } from "./FlowEngineV2";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const nav = [
  ["Mission Control", "/crm", Icons.Grid],
  ["Clientes", "/clientes", Icons.Users],
  ["Leads", "/oportunidades", Icons.Target],
  ["Oportunidades", "/oportunidades", Icons.Target],
  ["Estoque", "/veiculos", Icons.Car],
  ["Trocas", "/oportunidades", Icons.Swap],
  ["Propostas", "/propostas", Icons.File],
  ["Parceiros", "/parceiros", Icons.Store],
  ["Financeiro", "/financeiro", Icons.Wallet],
  ["Relatórios", "/relatorios", Icons.Chart],
  ["Configurações", "/configuracoes", Icons.Settings],
] as const;

function priority(model: MissionControlViewModel) {
  return [...model.opportunities]
    .filter((item) => item.status !== "closed" && item.status !== "lost")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);
}

function dayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function actionLabel(item: MissionOpportunity, index: number) {
  if (index === 0 && item.recommendation.urgency === "now") return item.recommendation.action;
  return item.recommendation.action;
}

function opportunityTitle(item: MissionOpportunity) {
  return item.name;
}

function opportunityTag(item: MissionOpportunity, index: number) {
  if (item.momentum === "decelerating") return "Perdendo forca";
  if (item.temperature.level === "critical") return "Critica";
  if (item.temperature.level === "hot") return "Quente";
  return item.temperature.label;
}

function reasonLines(item: MissionOpportunity, index: number) {
  const reasons = [...item.explanations];
  if (item.warnings[0]) reasons.push(item.warnings[0]);
  if (item.marginPotential > 0) reasons.unshift(`Margem potencial de ${brl.format(item.marginPotential)}`);
  return reasons.slice(0, 3);
}

export function MissionControl({ model }: { model: MissionControlViewModel }) {
  const priorities = priority(model);
  const primary = priorities[0] ?? model.opportunities[0];
  const pulseStyle = {
    "--pulse": `${Math.max(0, Math.min(100, model.operationScore)) * 3.6}deg`,
  } as CSSProperties;

  return (
    <main className={styles.shell}>
      

      <section className={styles.stage}>
       

        <div className={styles.content}>
          <section className={styles.summaryRow} aria-label="Resumo da operação">
            <div className={styles.pulseSummary}>
              <div className={styles.pulse} style={pulseStyle}>
                <div>
                  <strong>{model.operationScore}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className={styles.pulseCopy}>
                <span className={styles.eyebrow}>Operação</span>
                <strong>{model.businessTemperature.label.toUpperCase()}</strong>
                <small>Saúde do fluxo {model.flow.health.score}/100</small>
              </div>
            </div>

            <div className={styles.potential}>
              <span className={styles.eyebrow}>Valor ativo priorizado</span>
              <strong>{brl.format(model.activeValue)}</strong>
              <span className={styles.positive}>em negócios potenciais</span>
            </div>

            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span>Negociações</span>
                <strong>{model.activeCount}</strong>
                <small>ativas</small>
              </div>
              <div className={styles.metric}>
                <span>Conversão</span>
                <strong>{model.conversion}%</strong>
                <small>base real</small>
              </div>
              <div className={styles.metric}>
                <span>Margem prevista</span>
                <strong>{brl.format(model.projectedMargin)}</strong>
                <small>projetada</small>
              </div>
              <div className={styles.metric}>
                <span>Trocas</span>
                <strong>{model.tradeInCount}</strong>
                <small>em atenção</small>
              </div>
            </div>
          </section>

          <div className={styles.workspace}>
            <div className={styles.centerColumn}>
              <section className={styles.mission}>
                <header className={styles.sectionTitle}>
                  <div>
                    <Icons.Target />
                    <h1>MISSÃO DO DIA</h1>
                    <span>As 3 decisões que mais impactam hoje</span>
                  </div>
                </header>

                <div className={styles.missionGrid}>
                  {priorities.length === 0 && <div className={styles.emptyState}>Nenhuma oportunidade ativa. Novos dados reais aparecerão aqui.</div>}
                  {priorities.map((item, index) => {
                    const reasons = reasonLines(item, index);
                    return (
                      <Link
                        className={`${styles.missionCard} ${index === 0 ? styles.primaryMission : ""}`}
                        href={`/oportunidades/${item.id}`}
                        key={item.id}
                      >
                        <header>
                          <div className={styles.priorityLabel}>
                            <b>{index + 1}</b>
                            <span>PRIORIDADE</span>
                          </div>
                          <em className={styles.statusTag}>{opportunityTag(item, index)}</em>
                        </header>

                        <div className={styles.identity}>
                          <span className={styles.initials}>{item.name.slice(0, 2).toUpperCase()}</span>
                          <div>
                            <h2>{opportunityTitle(item)}</h2>
                            <p>{item.interest} · {item.city}</p>
                          </div>
                        </div>

                        <div className={styles.missionBody}>
                          <div className={styles.decisionValue}>
                            <strong>{index === 1 ? brl.format(item.marginPotential) : `${item.probability}%`}</strong>
                            <span>{index === 1 ? "margem prevista" : "chance estimada"}</span>
                          </div>

                          <div className={styles.reasonBox}>
                            <span>POR QUE AGORA?</span>
                            <ul>
                              {reasons.map((reason) => <li key={reason}>{reason}</li>)}
                            </ul>
                          </div>
                        </div>

                        <span className={styles.missionAction}>
                          {index === 0 ? <Icons.Phone /> : <Icons.Arrow />}
                          {actionLabel(item, index)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className={styles.lowerGrid}>
                <article className={styles.panel}>
                  <header className={styles.panelHeader}>
                    <div>
                      <Icons.Clock />
                      <span>
                        <h2>DECISION FEED</h2>
                        <small>O que aconteceu agora</small>
                      </span>
                    </div>
                    <Link href="/oportunidades">Ver tudo</Link>
                  </header>
                  <div className={styles.feed}>
                    {model.recentEvents.length === 0 && <div className={styles.emptyState}>O histórico operacional aparecerá após a primeira ação.</div>}
                    {model.recentEvents.slice(0, 5).map((event, index) => (
                      <Link className={styles.feedRow} href={`/oportunidades/${event.opportunityId}`} key={event.id}>
                        <time>{new Date(event.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
                        <i data-index={index} />
                        <p>{event.title}{event.description ? ` · ${event.description}` : ""}</p>
                      </Link>
                    ))}
                  </div>
                </article>

                <FlowEngineV2 flow={model.flow} opportunities={model.opportunities} />
              </section>
            </div>

            <aside className={styles.rail}>
              <section className={styles.advisor}>
                <header className={styles.advisorHeader}>
                  <div>
                    <Icons.Spark />
                    <span>CONSELHEIRO AUTOPONTE</span>
                  </div>
                  <b>IA</b>
                </header>
                <div className={styles.advisorBody}>
                  <h2>Bom dia, Evandro.</h2>
                  <p>Minha análise aponta onde você pode ganhar mais hoje:</p>
                  <div className={styles.insightList}>
                    {model.recommendations.length === 0 && <div className={styles.emptyState}>Sem recomendações enquanto não houver oportunidades ativas.</div>}
                    {model.recommendations.slice(0, 3).map((recommendation, index) => (
                      <Link href={`/oportunidades/${recommendation.opportunityId}`} className={styles.insight} key={recommendation.opportunityId}>
                        <b>{index + 1}</b>
                        <p>{recommendation.text}</p>
                        <Icons.Arrow />
                      </Link>
                    ))}
                  </div>
                  <Link className={styles.advisorAction} href="/recomendacoes">
                    <Icons.Spark />
                    Ver todas as recomendações
                  </Link>
                </div>
              </section>

              <section id="agenda" className={styles.panel}>
                <header className={styles.panelHeader}>
                  <div>
                    <Icons.Clock />
                    <span><h2>AGENDA DE HOJE</h2></span>
                  </div>
                  <a href="/crm#agenda">Ver agenda</a>
                </header>
                <div className={styles.agenda}>
                  {priorities.length === 0 && <div className={styles.emptyState}>Nenhuma ação agendada.</div>}
                  {priorities.map((item) => (
                    <Link className={styles.agendaRow} href={`/oportunidades/${item.id}`} key={item.id}>
                      <time>{item.nextFollowUp ? new Date(item.nextFollowUp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</time>
                      <strong>{item.recommendation.action}</strong>
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className={styles.panel}>
                <header className={styles.panelHeader}>
                  <div>
                    <Icons.Plus />
          <span><h2>AÇÕES RÁPIDAS</h2></span>
                  </div>
                </header>
                <div className={styles.quick}>
                  <Link href="/oportunidades"><Icons.Target />Novo lead</Link>
                  <Link href="/oportunidades"><Icons.Swap />Avaliar troca</Link>
                  <Link href="/matches"><Icons.Search />Buscar veículo</Link>
                  <Link href="/propostas"><Icons.File />Nova proposta</Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>

      
    </main>
  );
}




