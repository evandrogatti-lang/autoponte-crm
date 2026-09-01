import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { getMissionControl } from "../../lib/commercial-cases/service";
import type { MissionControlCase, MissionControlModel, MissionControlTaskInput } from "../../lib/commercial-cases/mission-control";
import styles from "./mission-control.module.css";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const actionLabels: Record<string, string> = { CONTACT_CUSTOMER: "Contatar cliente", REQUEST_DOCUMENTS: "Solicitar documentos", REVIEW_PROPOSAL: "Revisar proposta", SCHEDULE_FOLLOW_UP: "Fazer acompanhamento", MARK_CASE_LOST: "Registrar perda" };
const attentionLabels: Record<string, string> = { urgent: "Urgente", overdue: "Atrasada", due_today: "Hoje", high: "Alta prioridade", no_next_action: "Sem próxima ação", recently_lost: "Perda recente", active: "Em andamento" };
const roleLabels: Record<MissionControlModel["role"], string> = { seller: "Minha operação", manager: "Operação da equipe", owner: "Visão consolidada" };

function idOf(item: MissionControlCase) { return item.pilotCode || item.id.slice(0, 8).toUpperCase(); }
function customerOf(item?: { customerName: string | null }) { return item?.customerName || "Cliente não informado"; }

function NegotiationCard({ item }: { item: MissionControlCase }) {
  return <article className={styles.negotiationCard} data-attention={item.attention}>
    <div className={styles.cardTop}><span>{idOf(item)}</span><b>{attentionLabels[item.attention]}</b></div>
    <h3>{customerOf(item)}</h3>
    <p>{item.vehicleLabel || "Veículo em definição"}</p>
    <dl><div><dt>Próxima ação</dt><dd>{item.nextAction ? actionLabels[item.nextAction.actionType] || item.nextAction.actionType : "Não definida"}</dd></div><div><dt>Responsável</dt><dd>{item.sellerName || item.nextAction?.ownerName || "Não atribuído"}</dd></div></dl>
    <Link href={`/casos/${item.id}`}>Abrir negociação</Link>
  </article>;
}

function TaskRow({ task, cases }: { task: MissionControlTaskInput; cases: MissionControlCase[] }) {
  const item = cases.find((entry) => entry.id === task.caseId);
  return <Link className={styles.taskRow} href={`/casos/${task.caseId}`}>
    <time>{date.format(task.dueAt)}</time>
    <span><strong>{actionLabels[task.actionType] || task.actionType}</strong><small>{customerOf(item)} · {task.context || "Sem contexto adicional"}</small></span>
    <b data-priority={task.priority}>{task.priority === "URGENT" ? "Urgente" : task.priority === "HIGH" ? "Alta" : "Normal"}</b>
  </Link>;
}

function Empty({ children }: { children: React.ReactNode }) { return <p className={styles.empty}>{children}</p>; }

export default async function CrmPage() {
  const user = await requireCurrentAppUser("/crm");
  const crmUser = await requirePermission(user, "seller_operations.manage");
  const model = await getMissionControl(crmUser.id);
  const managerial = model.role !== "seller";

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div><span>CENTRAL DE OPERAÇÕES · {roleLabels[model.role].toUpperCase()}</span><h1>{model.role === "seller" ? `Olá, ${model.userName.split(" ")[0]}` : "Central de Operações"}</h1><p>{model.role === "seller" ? "Suas negociações, decisões e próximos movimentos em um só lugar." : "Atenção comercial, decisões, equipe, estoque e impacto financeiro em uma leitura operacional."}</p></div>
      <form action="/busca" method="GET" className={styles.search}><input name="q" type="search" aria-label="Buscar na operação" placeholder="Buscar cliente, veículo ou negociação"/><button>Buscar</button></form>
    </header>

    <section className={styles.metrics} aria-label="Resumo operacional">
      <Link href="/agenda?filtro=atrasadas" data-tone={model.counters.overdue ? "critical" : "neutral"}><span>Atrasadas</span><strong>{model.counters.overdue}</strong><small>ações vencidas</small></Link>
      <Link href="/agenda?filtro=hoje"><span>Hoje</span><strong>{model.counters.dueToday}</strong><small>próximas ações</small></Link>
      <Link href="/casos"><span>Negociações</span><strong>{model.counters.openNegotiations}</strong><small>em execução</small></Link>
      <Link href="/aprovacoes"><span>Aprovações</span><strong>{model.approvals.length}</strong><small>revisões pendentes</small></Link>
      <Link href="/casos"><span>Sem próxima ação</span><strong>{model.counters.noNextAction}</strong><small>exigem definição</small></Link>
    </section>

    <section className={styles.attention}>
      <div className={styles.sectionHeading}><div><span>PRIORIDADE OPERACIONAL</span><h2>Atenção agora</h2></div><Link href="/casos">Ver negociações</Link></div>
      {model.attentionNow.length ? <div className={styles.attentionGrid}>{model.attentionNow.slice(0, 4).map((item) => <NegotiationCard key={item.id} item={item}/>)}</div> : <Empty>Nenhuma pendência crítica neste momento.</Empty>}
    </section>

    <div className={styles.twoColumns}>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}><div><span>EXECUÇÃO COMERCIAL</span><h2>Negociações quentes</h2></div><Link href="/casos">Ver todas</Link></div>
        {model.hotNegotiations.length ? <div className={styles.compactList}>{model.hotNegotiations.map((item) => <Link href={`/casos/${item.id}`} key={item.id}><span><strong>{customerOf(item)}</strong><small>{item.nextAction?.context || item.vehicleLabel || "Contexto em atualização"}</small></span><b>{item.displayValue ? money.format(item.displayValue) : attentionLabels[item.attention]}</b></Link>)}</div> : <Empty>Nenhuma negociação quente no recorte atual.</Empty>}
      </section>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}><div><span>DECISÕES</span><h2>Aprovações pendentes</h2></div><Link href="/aprovacoes">Ver todas</Link></div>
        {model.approvals.length ? <div className={styles.compactList}>{model.approvals.slice(0, 5).map((task) => <TaskRow key={task.id} task={task} cases={model.cases}/>)}</div> : <Empty>Nenhuma revisão de proposta pendente.</Empty>}
      </section>
    </div>

    {managerial ? <>
      <div className={styles.threeColumns}>
        <section className={styles.panel}><div className={styles.sectionHeading}><div><span>RESUMO</span><h2>Desempenho</h2></div><Link href="/relatorios">Ver relatórios</Link></div><dl className={styles.statList}><div><dt>Negociações ativas</dt><dd>{model.performance.active}</dd></div><div><dt>Vendas concluídas</dt><dd>{model.performance.closedWon}</dd></div><div><dt>Conversão concluída</dt><dd>{model.performance.conversion}%</dd></div><div><dt>Perdas recentes</dt><dd>{model.performance.recentlyLost}</dd></div></dl></section>
        <section className={styles.panel}><div className={styles.sectionHeading}><div><span>IMPACTO</span><h2>Financeiro</h2></div><Link href="/financeiro">Ver financeiro</Link></div><dl className={styles.moneyList}><div><dt>Propostas ativas</dt><dd>{money.format(model.financial.proposalValue)}</dd></div><div><dt>Estoque anunciado</dt><dd>{money.format(model.financial.activeStockValue)}</dd></div><div><dt>Margem potencial</dt><dd>{money.format(model.financial.potentialMargin)}</dd></div></dl></section>
        <section className={styles.panel}><div className={styles.sectionHeading}><div><span>SITUAÇÃO GERAL</span><h2>Estoque</h2></div><Link href="/veiculos">Ver estoque completo</Link></div><dl className={styles.statList}><div><dt>Ativos</dt><dd>{model.stock.active}</dd></div><div><dt>Reservados</dt><dd>{model.stock.reserved}</dd></div><div><dt>Em avaliação</dt><dd>{model.stock.evaluation}</dd></div><div><dt>Vendidos</dt><dd>{model.stock.sold}</dd></div></dl></section>
      </div>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><span>EQUIPE</span><h2>Vendedores — visão rápida</h2></div><Link href="/central">Abrir central</Link></div>{model.team.length ? <div className={styles.teamGrid}>{model.team.slice(0, 8).map((seller) => <article key={seller.name}><span>{seller.name.slice(0, 2).toUpperCase()}</span><div><strong>{seller.name}</strong><small>{seller.activeCases} negociações · {seller.dueToday} ações hoje</small></div><b data-alert={seller.overdue > 0}>{seller.overdue} atrasadas</b></article>)}</div> : <Empty>Nenhum vendedor associado às negociações ativas.</Empty>}</section>
    </> : null}

    <div className={styles.twoColumns}>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><span>AGENDA</span><h2>Próximas ações (hoje)</h2></div><Link href="/agenda">Ver agenda completa</Link></div>{model.todayActions.length ? <div>{model.todayActions.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} cases={model.cases}/>)}</div> : <Empty>Nenhuma ação prevista para hoje.</Empty>}</section>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><span>HISTÓRICO</span><h2>Atividade recente</h2></div><Link href="/agenda?visao=atividade">Ver todas as atividades</Link></div>{model.recentActivity.length ? <div className={styles.activity}>{model.recentActivity.slice(0, 6).map((event) => <Link href={`/casos/${event.caseId}`} key={event.id}><i/><span><strong>{event.description || "Atualização operacional"}</strong><small>{date.format(event.occurredAt)}</small></span></Link>)}</div> : <Empty>Nenhuma atividade recente registrada.</Empty>}</section>
    </div>

    <section className={styles.panel}>
      <div className={styles.sectionHeading}><div><span>VISÃO DO FLUXO</span><h2>Funil de vendas</h2></div><Link href="/funil">Abrir funil completo</Link></div>
      <div className={styles.funnelStrip}>{model.funnel.map((stage) => <Link href={`/funil#${stage.stage}`} key={stage.stage}><span>{stage.label}</span><strong>{stage.count}</strong><small>{money.format(stage.value)}</small></Link>)}</div>
    </section>
  </main>;
}
