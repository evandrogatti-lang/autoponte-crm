import { requireChatGPTUser } from "../chatgpt-auth";

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
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    interest: row.desired_vehicle || "Veículo a definir",
    offered: `${row.brand} ${row.model} ${row.year}`,
    value: row.estimated_max || 0,
    priority: row.lead_category === "hot" ? "Alta" : row.lead_category === "warm" ? "Média" : "Normal",
    next: relativeFollowUp(row.next_follow_up),
    stage: stageMap[row.status] ?? "new",
    source: "Avaliação online",
  };
}

const demoRows: Opportunity[] = [
  { id: "1", name: "Mariana Souza", city: "São Bernardo do Campo", interest: "Jeep Compass", offered: "Honda City 2020", value: 119900, priority: "Alta", next: "Retorno hoje", stage: "qualified", source: "Instagram" },
  { id: "2", name: "Carlos Henrique", city: "Santo André", interest: "Hatch automático", offered: "Toyota Corolla 2018", value: 89900, priority: "Média", next: "Fotos pendentes", stage: "contacted", source: "Portal" },
  { id: "3", name: "Renata Lima", city: "São Paulo", interest: "Consignar SUV", offered: "Hyundai Creta 2021", value: 104900, priority: "Normal", next: "Em 2 dias", stage: "store", source: "Indicação" },
  { id: "4", name: "Lucas Martins", city: "Diadema", interest: "Sedan até R$ 90 mil", offered: "Sem troca", value: 89900, priority: "Alta", next: "Proposta enviada", stage: "proposal", source: "Meta Ads" },
  { id: "5", name: "Paulo Ferreira", city: "São Caetano", interest: "SUV compacto", offered: "VW T-Cross 2020", value: 112900, priority: "Alta", next: "Atrasado 1d", stage: "new", source: "WhatsApp" },
  { id: "6", name: "Fernanda Alves", city: "São Paulo", interest: "Toyota Corolla", offered: "Chevrolet Onix 2019", value: 128900, priority: "Média", next: "Retorno hoje", stage: "closed", source: "Portal" },
];

export default async function CrmPage() {
  await requireChatGPTUser("/crm");
  const { env } = await import("cloudflare:workers");
  let liveRows: TradeIn[] = [];
  try {
    const result = await env.DB.prepare("SELECT id, name, city, brand, model, year, desired_vehicle, estimated_min, estimated_max, status, lead_category, next_follow_up, created_at FROM trade_ins ORDER BY created_at DESC LIMIT 100").all<TradeIn>();
    liveRows = result.results ?? [];
  } catch {
    liveRows = [];
  }

  const opportunities = liveRows.length ? liveRows.map(mapTradeIn) : demoRows;
  const high = opportunities.filter((item) => item.priority === "Alta").length;
  const immediate = opportunities.filter((item) => item.next.includes("hoje") || item.next.includes("Atrasado")).length;
  const proposals = opportunities.filter((item) => item.stage === "proposal").length;
  const active = opportunities.filter((item) => item.stage !== "closed").length;
  const pipelineValue = opportunities.reduce((sum, item) => sum + item.value, 0);
  const conversion = opportunities.length ? Math.round((opportunities.filter((item) => item.stage === "closed").length / opportunities.length) * 100) : 0;

  const kpis = [
    { label: "Oportunidades ativas", value: active.toString(), meta: `${high} em alta prioridade`, trend: "+12%", tone: "lime" },
    { label: "Retornos imediatos", value: immediate.toString(), meta: "Hoje ou atrasados", trend: immediate ? "Ação" : "Em dia", tone: "orange" },
    { label: "Propostas abertas", value: proposals.toString(), meta: brl.format(pipelineValue), trend: "+8%", tone: "blue" },
    { label: "Conversão", value: `${conversion}%`, meta: "Oportunidade → venda", trend: "+3,4%", tone: "purple" },
  ];

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
        <a href="#financeiro"><Icon name="trend"/><span>Financeiro</span></a>
      </nav>
      <div className="ap-sidebar-bottom">
        <div className="ap-capacity"><div><span>Meta mensal</span><b>68%</b></div><i><span /></i><small>17 de 25 vendas concluídas</small></div>
        <a className="ap-user" href="#perfil"><span>EG</span><div><b>Evandro Gatti</b><small>Administrador</small></div><Icon name="dots"/></a>
      </div>
    </aside>

    <section className="ap-main">
      <header className="ap-topbar">
        <label className="ap-search"><Icon name="search"/><input aria-label="Busca universal" placeholder="Buscar cliente, placa, telefone, veículo..."/><kbd>⌘ K</kbd></label>
        <div className="ap-top-actions">
          <button className="ap-icon-button" aria-label="Notificações"><Icon name="bell"/><b>3</b></button>
          <a className="ap-primary-button" href="/oportunidades"><Icon name="plus"/>Nova oportunidade</a>
        </div>
      </header>

      <div className="ap-content">
        <section className="ap-welcome">
          <div><p>TERÇA-FEIRA, 4 DE AGOSTO</p><h1>Bom dia, Evandro.</h1><span>Veja o que precisa da sua atenção para acelerar as vendas hoje.</span></div>
          <div className="ap-filters"><button>Últimos 30 dias <span>⌄</span></button><button>Todas as lojas <span>⌄</span></button></div>
        </section>

        <section className="ap-kpi-grid" aria-label="Indicadores principais">
          {kpis.map((kpi) => <article className={`ap-kpi tone-${kpi.tone}`} key={kpi.label}>
            <div><span>{kpi.label}</span><button aria-label={`Opções de ${kpi.label}`}><Icon name="dots" size={18}/></button></div>
            <strong>{kpi.value}</strong>
            <footer><small>{kpi.meta}</small><b>{kpi.trend}</b></footer>
          </article>)}
        </section>

        <section className="ap-command-grid">
          <article className="ap-panel ap-pipeline" id="pipeline">
            <header><div><p>PIPELINE COMERCIAL</p><h2>Visão do funil</h2></div><a href="#pipeline">Ver pipeline completo <Icon name="arrow" size={16}/></a></header>
            <div className="ap-funnel">
              {stages.map((stage) => {
                const count = opportunities.filter((item) => item.stage === stage.id).length;
                const amount = opportunities.filter((item) => item.stage === stage.id).reduce((sum, item) => sum + item.value, 0);
                return <a href={`#${stage.id}`} className="ap-funnel-step" key={stage.id}>
                  <span>{stage.short}</span><strong>{count}</strong><small>{amount ? brl.format(amount) : "Sem valor"}</small><i style={{ "--fill": `${Math.max(12, Math.min(100, count * 22))}%` } as React.CSSProperties}><b /></i>
                </a>;
              })}
            </div>
          </article>

          <article className="ap-panel ap-ai-panel">
            <header><div className="ap-ai-title"><span><Icon name="spark"/></span><div><p>ASSISTENTE AUTOPONTE</p><h2>Prioridades da IA</h2></div></div><button><Icon name="dots"/></button></header>
            <div className="ap-ai-list">
              <a href="#prioridade"><span className="critical"><Icon name="alert" size={17}/></span><div><b>{immediate || 2} clientes aguardam retorno</b><small>O contato mais antigo está há 27 horas sem resposta.</small></div><Icon name="arrow" size={17}/></a>
              <a href="#match"><span className="positive"><Icon name="trend" size={17}/></span><div><b>Novo match com alta conversão</b><small>Compass Longitude compatível com Mariana Souza.</small></div><Icon name="arrow" size={17}/></a>
              <a href="#estoque"><span className="info"><Icon name="car" size={17}/></span><div><b>Preço competitivo identificado</b><small>Corolla 2021 está 6% abaixo da média da rede.</small></div><Icon name="arrow" size={17}/></a>
            </div>
            <button className="ap-ai-cta"><Icon name="spark" size={17}/>Abrir central de inteligência</button>
          </article>
        </section>

        <section className="ap-lower-grid">
          <article className="ap-panel ap-priorities" id="clientes">
            <header><div><p>PRÓXIMAS AÇÕES</p><h2>O que fazer agora</h2></div><a href="#agenda">Ver agenda</a></header>
            <div className="ap-action-list">
              {opportunities.slice(0, 4).map((item, index) => <a href={`#lead-${item.id}`} key={item.id}>
                <time><b>{["09:00", "10:30", "13:00", "15:30"][index]}</b><small>Hoje</small></time>
                <span className={`ap-priority-dot priority-${item.priority.toLowerCase().replace("é", "e")}`} />
                <div><b>{item.name}</b><small>{item.next} • {item.interest}</small></div>
                <span className="ap-source">{item.source}</span><Icon name="arrow" size={17}/>
              </a>)}
            </div>
          </article>

          <article className="ap-panel ap-activity">
            <header><div><p>ATIVIDADE DA EQUIPE</p><h2>Movimentações recentes</h2></div><button><Icon name="dots"/></button></header>
            <ol>
              <li><span className="activity-blue">AM</span><div><b>Ana Martins enviou uma proposta</b><small>Jeep Compass • Mariana Souza</small></div><time>há 8 min</time></li>
              <li><span className="activity-green">IA</span><div><b>Match de veículo identificado</b><small>Toyota Corolla • 94% de aderência</small></div><time>há 21 min</time></li>
              <li><span className="activity-orange">BR</span><div><b>Bruno atualizou uma avaliação</b><small>Honda City 2020 • R$ 78.500</small></div><time>há 42 min</time></li>
              <li><span className="activity-purple">AP</span><div><b>Financiamento pré-aprovado</b><small>Banco parceiro • Lucas Martins</small></div><time>há 1h</time></li>
            </ol>
          </article>
        </section>

        <section className="ap-mini-grid" id="estoque">
          <article><div><span>ESTOQUE DISPONÍVEL</span><strong>1.241</strong><small>82 reservados • 34 em preparação</small></div><span className="mini-icon"><Icon name="car"/></span></article>
          <article><div><span>AVALIAÇÕES PENDENTES</span><strong>{Math.max(4, high)}</strong><small>2 aguardam novas fotos</small></div><span className="mini-icon"><Icon name="file"/></span></article>
          <article><div><span>MATCHES HOJE</span><strong>37</strong><small>18 com aderência excelente</small></div><span className="mini-icon"><Icon name="spark"/></span></article>
          <article><div><span>MARGEM PROJETADA</span><strong>{brl.format(Math.round(pipelineValue * .086))}</strong><small>8,6% sobre o pipeline</small></div><span className="mini-icon"><Icon name="trend"/></span></article>
        </section>
      </div>
    </section>
  </main>;
}
