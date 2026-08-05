import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";

type TradeIn = {
  id: string;
  name: string;
  city: string;
  brand: string;
  model: string;
  year: string;
  desired_vehicle: string;
  estimated_min: number;
  estimated_max: number;
  status: string;
  lead_category: string;
  next_follow_up: string;
  created_at: string;
};

type Opportunity = {
  id: string;
  name: string;
  city: string;
  interest: string;
  offered: string;
  value: number;
  priority: "Alta" | "Média" | "Normal";
  next: string;
  stage: string;
  source: string;
  probability: number;
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const stages = [
  { id: "new", label: "Novos", short: "Entrada" },
  { id: "contacted", label: "Contato", short: "Atendimento" },
  { id: "qualified", label: "Qualificados", short: "Prontos" },
  { id: "store", label: "Com a loja", short: "Negociação" },
  { id: "proposal", label: "Propostas", short: "Decisão" },
  { id: "closed", label: "Resultados", short: "Fechados" },
];

const menu = [
  ["dashboard", "Dashboard", "/crm"],
  ["users", "Clientes", "#clientes"],
  ["phone", "Leads", "#pipeline"],
  ["car", "Estoque", "#estoque"],
  ["swap", "Trocas", "/oportunidades"],
  ["file", "Propostas", "#propostas"],
  ["store", "Parceiros", "#parceiros"],
  ["chart", "Relatórios", "#relatorios"],
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z"/>,
    car: <><path d="M5 17h14v-5H5z"/><path d="m7 12 1.5-4h7L17 12M7 17v2M17 17v2"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/></>,
    swap: <><path d="M7 7h11l-3-3M17 17H6l3 3"/><path d="m18 7-3 3M6 17l3-3"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    store: <><path d="M3 9l2-5h14l2 5"/><path d="M5 13v8h14v-8M9 21v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    spark: <><path d="m12 3-1.3 4.2a5 5 0 0 1-3.4 3.4L3 12l4.3 1.4a5 5 0 0 1 3.4 3.4L12 21l1.3-4.2a5 5 0 0 1 3.4-3.4L21 12l-4.3-1.4a5 5 0 0 1-3.4-3.4z"/></>,
    trend: <><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    alert: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
    dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    wallet: <><path d="M3 6h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2z"/><path d="M3 6l12-3v3M16 11h5v4h-5a2 2 0 0 1 0-4z"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function relativeFollowUp(value?: string) {
  if (!value) return "Definir retorno";
  const due = new Date(value);
  const today = new Date();
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return `Atrasado ${Math.abs(days)}d`;
  if (days === 0) return "Retorno hoje";
  return `Em ${days} dia${days === 1 ? "" : "s"}`;
}

function mapTradeIn(row: TradeIn): Opportunity {
  const stageMap: Record<string, string> = {
    new: "new", received: "new", pre_evaluated: "new", contacted: "contacted",
    qualified: "qualified", sent_to_store: "store", proposal: "proposal",
    closed: "closed", lost: "closed",
  };
  const priority = row.lead_category === "hot" ? "Alta" : row.lead_category === "warm" ? "Média" : "Normal";
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    interest: row.desired_vehicle || "Veículo a definir",
    offered: `${row.brand} ${row.model} ${row.year}`,
    value: row.estimated_max || 0,
    priority,
    next: relativeFollowUp(row.next_follow_up),
    stage: stageMap[row.status] ?? "new",
    source: "Avaliação online",
    probability: priority === "Alta" ? 91 : priority === "Média" ? 76 : 58,
  };
}

const demoRows: Opportunity[] = [
  { id: "1", name: "Mariana Souza", city: "São Bernardo do Campo", interest: "Jeep Compass", offered: "Honda City 2020", value: 119900, priority: "Alta", next: "Retorno hoje", stage: "qualified", source: "Instagram", probability: 94 },
  { id: "2", name: "Carlos Henrique", city: "Santo André", interest: "Hatch automático", offered: "Toyota Corolla 2018", value: 89900, priority: "Média", next: "Fotos pendentes", stage: "contacted", source: "Portal", probability: 78 },
  { id: "3", name: "Renata Lima", city: "São Paulo", interest: "Consignar SUV", offered: "Hyundai Creta 2021", value: 104900, priority: "Normal", next: "Em 2 dias", stage: "store", source: "Indicação", probability: 64 },
  { id: "4", name: "Lucas Martins", city: "Diadema", interest: "Sedan até R$ 90 mil", offered: "Sem troca", value: 89900, priority: "Alta", next: "Proposta enviada", stage: "proposal", source: "Meta Ads", probability: 91 },
  { id: "5", name: "Paulo Ferreira", city: "São Caetano", interest: "SUV compacto", offered: "VW T-Cross 2020", value: 112900, priority: "Alta", next: "Atrasado 1d", stage: "new", source: "WhatsApp", probability: 88 },
  { id: "6", name: "Fernanda Alves", city: "São Paulo", interest: "Toyota Corolla", offered: "Chevrolet Onix 2019", value: 128900, priority: "Média", next: "Retorno hoje", stage: "closed", source: "Portal", probability: 100 },
];

export default async function CrmPage() {
  await requireChatGPTUser("/crm");
  let liveRows: TradeIn[] = [];
  try {
    const rows = await getDb().select().from(tradeIns).orderBy(desc(tradeIns.createdAt)).limit(100);
    liveRows = rows.map((row) => ({ id: row.id, name: row.name, city: row.city, brand: row.brand, model: row.model, year: row.year, desired_vehicle: row.desiredVehicle, estimated_min: row.estimatedMin, estimated_max: row.estimatedMax, status: row.status, lead_category: row.leadCategory, next_follow_up: row.nextFollowUp, created_at: row.createdAt.toISOString() }));
  } catch { liveRows = []; }

  const opportunities = liveRows.length ? liveRows.map(mapTradeIn) : demoRows;
  const high = opportunities.filter((item) => item.priority === "Alta").length;
  const immediate = opportunities.filter((item) => item.next.includes("hoje") || item.next.includes("Atrasado")).length;
  const proposals = opportunities.filter((item) => item.stage === "proposal").length;
  const active = opportunities.filter((item) => item.stage !== "closed").length;
  const closed = opportunities.filter((item) => item.stage === "closed").length;
  const pipelineValue = opportunities.reduce((sum, item) => sum + item.value, 0);
  const activeValue = opportunities.filter((item) => item.stage !== "closed").reduce((sum, item) => sum + item.value, 0);
  const conversion = opportunities.length ? Math.round((closed / opportunities.length) * 100) : 0;
  const capitalNeeded = Math.round(activeValue * .36);
  const projectedMargin = Math.round(activeValue * .086);
  const avgTicket = opportunities.length ? Math.round(pipelineValue / opportunities.length) : 0;
  const operationScore = Math.min(99, Math.max(72, 88 + closed - immediate));

  const kpis = [
    { label: "Oportunidades ativas", value: active.toString(), meta: `${high} em alta prioridade`, trend: "+12%", tone: "lime", icon: "target" },
    { label: "Pipeline potencial", value: brl.format(activeValue), meta: `${proposals} propostas em aberto`, trend: "+8%", tone: "blue", icon: "trend" },
    { label: "Capital necessário", value: brl.format(capitalNeeded), meta: "Para absorver trocas aprovadas", trend: "Planejar", tone: "orange", icon: "wallet" },
    { label: "Conversão", value: `${conversion}%`, meta: `Ticket médio ${brl.format(avgTicket)}`, trend: "+3,4%", tone: "purple", icon: "chart" },
  ];

  const topOpportunities = [...opportunities].sort((a, b) => b.probability - a.probability).slice(0, 4);

  return <main className="ap-crm">
    <aside className="ap-sidebar">
      <a className="ap-logo" href="/" aria-label="AutoPonte Veículos">
        <span className="ap-logo-mark">A</span>
        <span><b>AutoPonte</b><small>Veículos</small></span>
      </a>
      <nav className="ap-nav" aria-label="Navegação principal">
        <small>GESTÃO</small>
        {menu.map(([icon, label, href], index) => <a key={label} href={href} className={index === 0 ? "active" : ""}><Icon name={icon}/><span>{label}</span>{label === "Leads" && <b>{active}</b>}</a>)}
        <small>OPERAÇÃO</small>
        <a href="/matches"><Icon name="spark"/><span>Match IA</span><em>Novo</em></a>
        <a href="#financeiro"><Icon name="wallet"/><span>Financeiro</span></a>
      </nav>
      <div className="ap-sidebar-bottom">
        <div className="ap-capacity"><div><span>Meta mensal</span><b>68%</b></div><i><span /></i><small>17 de 25 vendas concluídas</small></div>
        <a className="ap-user" href="#perfil"><span>EG</span><div><b>Evandro Gatti</b><small>Administrador</small></div><Icon name="dots"/></a>
      </div>
    </aside>

    <section className="ap-main">
      <header className="ap-topbar">
        <label className="ap-search"><Icon name="search"/><input aria-label="Busca universal" placeholder="Buscar cliente, placa, telefone, veículo..."/><kbd>Ctrl K</kbd></label>
        <div className="ap-top-actions">
          <button className="ap-icon-button" aria-label="Notificações"><Icon name="bell"/><b>3</b></button>
          <a className="ap-primary-button" href="/oportunidades"><Icon name="plus"/>Nova oportunidade</a>
        </div>
      </header>

      <div className="ap-content">
        <section className="ap-welcome ap-welcome-premium">
          <div><p>CENTRO DE COMANDO</p><h1>Bom dia, Evandro.</h1><span>O sistema encontrou {immediate} ações imediatas e {high} oportunidades de alta prioridade para hoje.</span></div>
          <div className="ap-filters"><button>Hoje <span>⌄</span></button><button>Todas as lojas <span>⌄</span></button><button>Todos os vendedores <span>⌄</span></button></div>
        </section>

        <section className="ap-command-hero">
          <div className="ap-operation-score">
            <span>RADAR DA OPERAÇÃO</span>
            <strong>{operationScore}<small>/100</small></strong>
            <p>Operação saudável, com atenção necessária aos retornos atrasados.</p>
            <div className="ap-score-track"><i style={{ width: `${operationScore}%` }}/></div>
          </div>
          <div className="ap-command-actions">
            <article><span>Comercial</span><b>97</b><small>Pipeline forte</small></article>
            <article><span>Estoque</span><b>84</b><small>34 em preparação</small></article>
            <article><span>Financeiro</span><b>90</b><small>Capital sob controle</small></article>
            <article><span>Atendimento</span><b>88</b><small>{immediate} retornos imediatos</small></article>
          </div>
        </section>

        <section className="ap-kpi-grid">
          {kpis.map((item) => <article className={`ap-kpi tone-${item.tone}`} key={item.label}>
            <div><span>{item.label}</span><span className="ap-kpi-icon"><Icon name={item.icon} size={18}/></span></div>
            <strong>{item.value}</strong>
            <footer><small>{item.meta}</small><b>{item.trend}</b></footer>
          </article>)}
        </section>

        <section className="ap-command-grid">
          <article className="ap-panel" id="pipeline">
            <header><div><p>PIPELINE COMERCIAL</p><h2>Fluxo de oportunidades</h2></div><a href="/oportunidades">Ver oportunidades <Icon name="arrow" size={15}/></a></header>
            <div className="ap-funnel">
              {stages.map((stage) => {
                const list = opportunities.filter((item) => item.stage === stage.id);
                const total = list.reduce((sum, item) => sum + item.value, 0);
                const max = Math.max(...stages.map((item) => opportunities.filter((opp) => opp.stage === item.id).length), 1);
                return <a href={`/oportunidades#${stage.id}`} className="ap-funnel-step" key={stage.id}>
                  <span>{stage.label}</span><strong>{list.length}</strong><small>{stage.short} • {brl.format(total)}</small>
                  <i><b style={{ "--fill": `${Math.max(12, (list.length / max) * 100)}%` } as React.CSSProperties}/></i>
                </a>;
              })}
            </div>
          </article>

          <article className="ap-panel ap-ai-panel">
            <header><div className="ap-ai-title"><span><Icon name="spark"/></span><div><p>COPILOTO AUTOPONTE</p><h2>Prioridades da IA</h2></div></div><a href="/matches">Abrir IA <Icon name="arrow" size={15}/></a></header>
            <div className="ap-ai-list">
              <a href="/oportunidades"><span className="critical"><Icon name="alert" size={15}/></span><div><b>Contate Paulo Ferreira agora</b><small>Lead com 88% de chance e retorno atrasado.</small></div><Icon name="arrow" size={15}/></a>
              <a href="/matches"><span className="positive"><Icon name="trend" size={15}/></span><div><b>Match de alta aderência disponível</b><small>Corolla com 94% de compatibilidade para Fernanda.</small></div><Icon name="arrow" size={15}/></a>
              <a href="#financeiro"><span className="info"><Icon name="wallet" size={15}/></span><div><b>Capital de giro recomendado</b><small>Reserve {brl.format(capitalNeeded)} para as trocas em curso.</small></div><Icon name="arrow" size={15}/></a>
            </div>
            <button className="ap-ai-cta"><Icon name="spark" size={15}/>Gerar plano de ação do dia</button>
          </article>
        </section>

        <section className="ap-lower-grid">
          <article className="ap-panel ap-priorities">
            <header><div><p>LEADS QUENTES</p><h2>Maior chance de fechamento</h2></div><a href="/oportunidades">Ver todos <Icon name="arrow" size={15}/></a></header>
            <div className="ap-hot-list">
              {topOpportunities.map((item) => <a href={`/oportunidades#${item.id}`} key={item.id}>
                <span className={`ap-priority-dot priority-${item.priority.toLowerCase().replace("é", "e")}`}/>
                <div className="ap-hot-main"><b>{item.name}</b><small>{item.interest} • {item.city}</small></div>
                <div className="ap-hot-score"><b>{item.probability}%</b><small>Score IA</small></div>
                <div className="ap-hot-value"><b>{brl.format(item.value)}</b><small>{item.next}</small></div>
                <Icon name="arrow" size={17}/>
              </a>)}
            </div>
          </article>

          <article className="ap-panel ap-activity">
            <header><div><p>AGENDA E ATIVIDADES</p><h2>Próximas ações</h2></div><button><Icon name="dots"/></button></header>
            <ol>
              <li><span className="activity-blue"><Icon name="phone" size={14}/></span><div><b>09:30 • Retornar Mariana Souza</b><small>Jeep Compass • proposta em preparação</small></div><time>Hoje</time></li>
              <li><span className="activity-green"><Icon name="car" size={14}/></span><div><b>11:00 • Avaliação Honda City</b><small>Vistoria e conferência das fotos</small></div><time>Hoje</time></li>
              <li><span className="activity-orange"><Icon name="file" size={14}/></span><div><b>14:30 • Revisar documentação</b><small>Lucas Martins • financiamento</small></div><time>Hoje</time></li>
              <li><span className="activity-purple"><Icon name="store" size={14}/></span><div><b>16:00 • Follow-up loja parceira</b><small>Disponibilidade do veículo compatível</small></div><time>Hoje</time></li>
            </ol>
          </article>
        </section>

        <section className="ap-finance-grid" id="financeiro">
          <article className="ap-panel ap-finance-card ap-finance-dark">
            <span>CAIXA POTENCIAL • 30 DIAS</span><strong>{brl.format(activeValue + projectedMargin)}</strong><small>Pipeline ativo + margem projetada</small>
            <div><span><b>{brl.format(activeValue)}</b><small>Vendas previstas</small></span><span><b>{brl.format(projectedMargin)}</b><small>Margem projetada</small></span></div>
          </article>
          <article className="ap-panel ap-finance-card"><span>CAPITAL EM TROCAS</span><strong>{brl.format(capitalNeeded)}</strong><small>Necessidade estimada de caixa</small><div className="ap-meter"><i style={{ width: "64%" }}/></div></article>
          <article className="ap-panel ap-finance-card"><span>MARGEM PROJETADA</span><strong>{brl.format(projectedMargin)}</strong><small>8,6% sobre o pipeline ativo</small><div className="ap-meter ap-meter-lime"><i style={{ width: "86%" }}/></div></article>
        </section>

        <section className="ap-mini-grid" id="estoque">
          <article><div><span>ESTOQUE DISPONÍVEL</span><strong>1.241</strong><small>82 reservados • 34 em preparação</small></div><span className="mini-icon"><Icon name="car"/></span></article>
          <article><div><span>AVALIAÇÕES PENDENTES</span><strong>{Math.max(4, high)}</strong><small>2 aguardam novas fotos</small></div><span className="mini-icon"><Icon name="file"/></span></article>
          <article><div><span>MATCHES HOJE</span><strong>37</strong><small>18 com aderência excelente</small></div><span className="mini-icon"><Icon name="spark"/></span></article>
          <article><div><span>RETORNOS IMEDIATOS</span><strong>{immediate}</strong><small>Hoje ou atrasados</small></div><span className="mini-icon"><Icon name="clock"/></span></article>
        </section>
      </div>
    </section>
  </main>;
}
