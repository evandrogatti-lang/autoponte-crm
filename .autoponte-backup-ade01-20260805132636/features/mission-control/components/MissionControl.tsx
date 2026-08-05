import type { CSSProperties } from "react";
import type { MissionControlViewModel, MissionOpportunity } from "../../../lib/mission-control/model";
import { Icons } from "./icons";
import styles from "./MissionControl.module.css";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const nav = [
  ["Mission Control", "/crm", Icons.Grid],
  ["Clientes", "/crm#clientes", Icons.Users],
  ["Leads", "/oportunidades", Icons.Target],
  ["Oportunidades", "/oportunidades", Icons.Target],
  ["Estoque", "/crm#estoque", Icons.Car],
  ["Trocas", "/oportunidades", Icons.Swap],
  ["Propostas", "/crm#propostas", Icons.File],
  ["Parceiros", "/crm#parceiros", Icons.Store],
  ["Financeiro", "/crm#financeiro", Icons.Wallet],
  ["Relatórios", "/crm#relatorios", Icons.Chart],
  ["Configurações", "/crm#configuracoes", Icons.Settings],
] as const;

function priority(model: MissionControlViewModel) {
  return [...model.opportunities]
    .filter((item) => item.stage !== "closed")
    .sort(
      (a, b) =>
        b.probability * 1000 + b.marginPotential -
        (a.probability * 1000 + a.marginPotential),
    )
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
  if (index === 0) return "Ligar agora";
  if (item.stage === "proposal") return "Acompanhar proposta";
  return "Abrir oportunidade";
}

function opportunityTitle(item: MissionOpportunity, index: number) {
  if (index === 1) return `Comprar ${item.offered || item.interest}`;
  return item.name;
}

function opportunityTag(item: MissionOpportunity, index: number) {
  if (index === 0) return "Alta chance";
  if (index === 1) return "Alta margem";
  return item.risk === "alto" ? "Em risco" : "Atenção";
}

function reasonLines(item: MissionOpportunity, index: number) {
  if (index === 0) {
    return [
      "Abriu a proposta novamente",
      item.next || "Próximo passo já definido",
      "Momento ideal para contato",
    ];
  }

  if (index === 1) {
    return [
      "Veículo com demanda acima da média",
      `Margem estimada de ${brl.format(item.marginPotential)}`,
    ];
  }

  return [
    item.next || "Proposta aguardando retorno",
    item.risk === "alto" ? "Risco elevado de perda" : "Atenção necessária hoje",
  ];
}

export function MissionControl({ model }: { model: MissionControlViewModel }) {
  const priorities = priority(model);
  const primary = priorities[0] ?? model.opportunities[0];
  const stages = [
    ["Lead", "new"],
    ["Contato", "contacted"],
    ["Qualificação", "qualified"],
    ["Proposta", "proposal"],
    ["Fechado", "closed"],
  ] as const;
  const pulseStyle = {
    "--pulse": `${Math.max(0, Math.min(100, model.operationScore)) * 3.6}deg`,
  } as CSSProperties;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/crm">
          <span className={styles.mark}>A</span>
          <span className={styles.brandText}>
            <strong>AutoPonte</strong>
            <span>VEÍCULOS</span>
          </span>
        </a>

        <nav className={styles.nav}>
          {nav.map(([label, href, Icon], index) => (
            <a key={label} href={href} className={index === 0 ? styles.active : ""}>
              <Icon />
              {label === "Leads" && <b className={styles.badge}>{model.activeCount}</b>}
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.operation}>
            <small>Operação ativa</small>
            <strong>AutoPonte Motors</strong>
          </div>
          <div className={styles.user}>
            <span className={styles.avatar}>EG</span>
            <div>
              <strong>Evandro Gatti</strong>
              <small>Gestor · online</small>
            </div>
          </div>
        </div>
      </aside>

      <section className={styles.stage}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <Icons.Search />
            <input aria-label="Busca universal" placeholder="Buscar cliente, placa, telefone, veículo..." />
            <kbd>Ctrl K</kbd>
          </label>
          <div className={styles.topActions}>
            <button className={styles.iconButton} aria-label="Notificações">
              <Icons.Bell />
              <b>3</b>
            </button>
            <a className={styles.primary} href="/oportunidades">
              <Icons.Plus />
              <span>Nova oportunidade</span>
            </a>
          </div>
        </header>

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
                <strong>{model.operationScore >= 85 ? "EXCELENTE" : "SAUDÁVEL"}</strong>
                <small>↑ +6 pontos versus ontem</small>
              </div>
            </div>

            <div className={styles.potential}>
              <span className={styles.eyebrow}>Se executar as 3 ações</span>
              <strong>{brl.format(model.activeValue || 517500)}</strong>
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
                <small>30 dias</small>
              </div>
              <div className={styles.metric}>
                <span>Margem prevista</span>
                <strong>{brl.format(model.projectedMargin)}</strong>
                <small>projetada</small>
              </div>
              <div className={styles.metric}>
                <span>Trocas</span>
                <strong>{Math.max(1, model.immediateActions * 3)}</strong>
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
                  {priorities.map((item, index) => {
                    const reasons = reasonLines(item, index);
                    return (
                      <article
                        className={`${styles.missionCard} ${index === 0 ? styles.primaryMission : ""}`}
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
                            <h2>{opportunityTitle(item, index)}</h2>
                            <p>{item.interest} · {item.city}</p>
                          </div>
                        </div>

                        <div className={styles.missionBody}>
                          <div className={styles.decisionValue}>
                            <strong>{index === 1 ? brl.format(item.marginPotential) : `${item.probability}%`}</strong>
                            <span>{index === 1 ? "margem prevista" : "chance de fechamento"}</span>
                          </div>

                          <div className={styles.reasonBox}>
                            <span>POR QUE AGORA?</span>
                            <ul>
                              {reasons.map((reason) => <li key={reason}>{reason}</li>)}
                            </ul>
                          </div>
                        </div>

                        <a className={styles.missionAction} href="/oportunidades">
                          {index === 0 ? <Icons.Phone /> : <Icons.Arrow />}
                          {actionLabel(item, index)}
                        </a>
                      </article>
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
                    <a href="/oportunidades">Ver tudo</a>
                  </header>
                  <div className={styles.feed}>
                    {[
                      ["09:15", `3 compradores encontrados para ${primary?.interest ?? "o veículo prioritário"}`],
                      ["09:32", `${primary?.name ?? "Cliente"} abriu a proposta novamente`],
                      ["09:47", "Crédito aprovado em uma oportunidade ativa"],
                      ["10:12", `${primary?.offered ?? "Veículo"} entrou na lista de compras`],
                      ["10:28", "Um preço saiu da faixa ideal regional"],
                    ].map(([time, text], index) => (
                      <div className={styles.feedRow} key={time}>
                        <time>{time}</time>
                        <i data-index={index} />
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className={styles.panel}>
                  <header className={styles.panelHeader}>
                    <div>
                      <Icons.Chart />
                      <span>
                        <h2>PIPELINE VIVO</h2>
                        <small>Visão geral do funil de vendas</small>
                      </span>
                    </div>
                    <a href="/oportunidades">Abrir pipeline</a>
                  </header>
                  <div className={styles.pipelineStats}>
                    {stages.map(([label, stage], index) => {
                      const items = model.opportunities.filter((item) => item.stage === stage);
                      return (
                        <div className={styles.stageItem} key={stage}>
                          <span>{label}</span>
                          <strong>{items.length}</strong>
                          {index < stages.length - 1 && <b>→</b>}
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.pipelineFooter}>
                    <div>
                      <span>Valor total no pipeline</span>
                      <strong>{brl.format(model.activeValue || 934800)}</strong>
                    </div>
                    <div>
                      <span>Conversão 30 dias</span>
                      <strong>{model.conversion}% <em>↑ +3%</em></strong>
                    </div>
                    <div className={styles.sparkline} aria-label="Tendência positiva">
                      {[12, 18, 17, 24, 31, 29, 38].map((height, index) => (
                        <i key={index} style={{ height }} />
                      ))}
                    </div>
                  </div>
                </article>
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
                    {[
                      `${primary?.name ?? "Mariana"} está no melhor momento para fechar hoje.`,
                      `Um ${primary?.offered ?? "Compass"} entrou na lista de compras com margem alta.`,
                      "Existe uma proposta em risco por falta de retorno.",
                    ].map((text, index) => (
                      <a href="/oportunidades" className={styles.insight} key={text}>
                        <b>{index + 1}</b>
                        <p>{text}</p>
                        <Icons.Arrow />
                      </a>
                    ))}
                  </div>
                  <a className={styles.advisorAction} href="/oportunidades">
                    <Icons.Spark />
                    Ver todas as recomendações
                  </a>
                </div>
              </section>

              <section className={styles.panel}>
                <header className={styles.panelHeader}>
                  <div>
                    <Icons.Clock />
                    <span><h2>AGENDA DE HOJE</h2></span>
                  </div>
                  <a href="/crm#agenda">Ver agenda</a>
                </header>
                <div className={styles.agenda}>
                  {[
                    ["09:30", "Retornar lead prioritário", "WhatsApp"],
                    ["11:00", "Revisar avaliação", "Troca"],
                    ["14:30", "Acompanhar proposta", "Comercial"],
                  ].map(([time, action, category]) => (
                    <div className={styles.agendaRow} key={time}>
                      <time>{time}</time>
                      <strong>{action}</strong>
                      <span>{category}</span>
                    </div>
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
                  <a href="/oportunidades"><Icons.Target />Novo lead</a>
                  <a href="/oportunidades"><Icons.Swap />Avaliar troca</a>
                  <a href="/matches"><Icons.Search />Buscar veículo</a>
                  <a href="/crm#propostas"><Icons.File />Nova proposta</a>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>

      <nav className={styles.mobileNav}>
        <a href="/crm"><Icons.Grid />Início</a>
        <a href="/oportunidades"><Icons.Target />Leads</a>
        <a href="/crm#estoque"><Icons.Car />Estoque</a>
        <a href="/matches"><Icons.Search />Match</a>
        <a href="/crm#configuracoes"><Icons.Settings />Ajustes</a>
      </nav>
    </main>
  );
}
