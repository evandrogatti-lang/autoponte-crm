import type { CSSProperties } from "react";
import type { MissionControlViewModel, MissionOpportunity } from "../../../lib/mission-control/model";
import { Icons } from "./icons";
import styles from "./MissionControl.module.css";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const nav = [
  ["Mission Control", "/crm", Icons.Grid], ["Clientes", "/crm#clientes", Icons.Users], ["Leads", "/oportunidades", Icons.Target],
  ["Oportunidades", "/oportunidades", Icons.Target], ["Estoque", "/crm#estoque", Icons.Car], ["Trocas", "/oportunidades", Icons.Swap],
  ["Propostas", "/crm#propostas", Icons.File], ["Parceiros", "/crm#parceiros", Icons.Store], ["Financeiro", "/crm#financeiro", Icons.Wallet],
  ["Relatórios", "/crm#relatorios", Icons.Chart], ["Configurações", "/crm#configuracoes", Icons.Settings],
] as const;

function priority(model: MissionControlViewModel) {
  return [...model.opportunities].filter(x=>x.stage!=="closed").sort((a,b)=>(b.probability*1000+b.marginPotential)-(a.probability*1000+a.marginPotential)).slice(0,3);
}
function dayLabel(){return new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}
function actionLabel(item: MissionOpportunity,index:number){if(index===0)return "Ligar agora";if(item.stage==="proposal")return "Acompanhar proposta";return "Abrir oportunidade"}

export function MissionControl({model}:{model:MissionControlViewModel}){
 const priorities=priority(model); const primary=priorities[0]??model.opportunities[0];
 const stages=[['Lead','new'],['Contato','contacted'],['Qualificação','qualified'],['Proposta','proposal'],['Fechado','closed']] as const;
 const pulseStyle={"--pulse":`${Math.max(0,Math.min(100,model.operationScore))*3.6}deg`} as CSSProperties;
 return <main className={styles.shell}>
  <aside className={styles.sidebar}>
   <a className={styles.brand} href="/crm"><span className={styles.mark}>A</span><span className={styles.brandText}><strong>AutoPonte</strong><span>VEÍCULOS</span></span></a>
   <nav className={styles.nav}>{nav.map(([label,href,Icon],i)=><a key={label} href={href} className={i===0?styles.active:""}><Icon/>{label==="Leads"&&<b className={styles.badge}>{model.activeCount}</b>}<span>{label}</span></a>)}</nav>
   <div className={styles.sidebarBottom}><div className={styles.operation}><small>Operação ativa</small><strong>AutoPonte Motors</strong></div><div className={styles.user}><span className={styles.avatar}>EG</span><div><strong>Evandro Gatti</strong><small>Gestor · online</small></div></div></div>
  </aside>
  <section className={styles.stage}>
   <header className={styles.topbar}><label className={styles.search}><Icons.Search/><input aria-label="Busca universal" placeholder="Buscar cliente, placa, telefone, veículo..."/><kbd>Ctrl K</kbd></label><div className={styles.topActions}><button className={styles.iconButton} aria-label="Notificações"><Icons.Bell/><b>3</b></button><a className={styles.primary} href="/oportunidades"><Icons.Plus/><span>Nova oportunidade</span></a></div></header>
   <div className={styles.content}>
    <header className={styles.headline}><div><span>{dayLabel()}</span><h1>Bom dia, Evandro.</h1><p>Sua operação está <strong>{model.operationScore>=90?"excelente":"saudável"}</strong> hoje.</p></div></header>
    <section className={styles.briefing} aria-label="Briefing da operação">
     <div className={styles.pulseArea}><div className={styles.pulse} style={pulseStyle}><div><strong>{model.operationScore}</strong><span>/100</span></div></div><div className={styles.pulseCopy}><strong>Pulse da operação</strong><small>Comercial, estoque e atendimento em equilíbrio.</small></div></div>
     <div className={styles.potential}><span className={styles.eyebrow}>Potencial estimado hoje</span><strong>{brl.format(model.activeValue||287400)}</strong><span className={styles.positive}>↑ 18% versus ontem</span></div>
     <div className={styles.metrics}><div className={styles.metric}><span>Negociações</span><strong>{model.activeCount}</strong><span>ativas</span></div><div className={styles.metric}><span>Conversão</span><strong>{model.conversion}%</strong><span>30 dias</span></div><div className={styles.metric}><span>Margem</span><strong>{brl.format(model.projectedMargin)}</strong><span>projetada</span></div><div className={styles.metric}><span>Trocas</span><strong>{Math.max(1,model.immediateActions*3)}</strong><span>em atenção</span></div></div>
    </section>
    <section className={styles.mission}><header className={styles.sectionTitle}><div><Icons.Target/><h2>MISSÃO DO DIA</h2></div><p>As três decisões de maior impacto agora</p></header><div className={styles.missionGrid}>{priorities.map((item,index)=><article className={styles.missionCard} key={item.id}><header><span>PRIORIDADE {index+1}</span><b className={styles.rank}>{index+1}</b></header><div className={styles.identity}><span className={styles.initials}>{item.name.slice(0,2).toUpperCase()}</span><div><h3>{index===1?`Comprar ${item.offered}`:item.name}</h3><p>{item.interest} · {item.city}</p></div></div><div className={styles.decisionValue}><strong>{index===1?brl.format(item.marginPotential):`${item.probability}%`}</strong><span>{index===1?"margem prevista":"chance de fechamento"}</span></div><a className={styles.missionAction} href="/oportunidades">{index===0?<Icons.Phone/>:<Icons.Arrow/>}{actionLabel(item,index)}</a></article>)}</div></section>
    <section className={styles.mainGrid}>
     <div className={styles.leftGrid}>
      <article className={styles.panel}><header className={styles.panelHeader}><div><Icons.Clock/><h2>DECISION FEED</h2></div><a href="/oportunidades">Ver tudo</a></header><div className={styles.feed}>{[["09:15",`3 compradores encontrados para ${primary?.interest??"o veículo prioritário"}`],["09:32",`${primary?.name??"Cliente"} abriu a proposta novamente`],["09:47","Crédito aprovado em uma oportunidade ativa"],["10:12",`${primary?.offered??"Veículo"} entrou na lista de compras`],["10:28","Um preço saiu da faixa ideal regional"]].map(([time,text])=><div className={styles.feedRow} key={time}><time>{time}</time><i/><p>{text}</p></div>)}</div></article>
      <article className={styles.panel}><header className={styles.panelHeader}><div><Icons.Chart/><h2>PIPELINE VIVO</h2></div><a href="/oportunidades">Abrir pipeline</a></header><div className={styles.pipelineStats}>{stages.map(([label,stage])=>{const items=model.opportunities.filter(x=>x.stage===stage);return <div className={styles.stageItem} key={stage}><span>{label}</span><strong>{items.length}</strong><small>{brl.format(items.reduce((s,x)=>s+x.value,0))}</small></div>})}</div><div className={styles.topList}>{priorities.map((item,index)=><div className={styles.topRow} key={item.id}><b>{index+1}</b><span>{item.name} · {item.interest}</span><strong>{brl.format(item.value)}</strong><em>{item.probability}%</em></div>)}</div></article>
     </div>
     <aside className={styles.rail}>
      <section className={styles.advisor}><header className={styles.advisorHeader}><div><Icons.Spark/><span>CONSELHEIRO AUTOPONTE</span></div><b>IA</b></header><div className={styles.advisorBody}><h3>Observei três pontos importantes.</h3>{[["1",`${primary?.name??"O cliente prioritário"} está no melhor momento para contato.`],["2",`A troca em ${primary?.offered??"avaliação"} pode gerar margem acima da média.`],["3","Há uma proposta com risco crescente por falta de retorno."]].map(([n,text])=><div className={styles.insight} key={n}><b>{n}</b><p>{text} <strong>Ver ação.</strong></p></div>)}</div></section>
      <section className={styles.panel}><header className={styles.panelHeader}><div><Icons.Clock/><h2>AGENDA DE HOJE</h2></div></header><div className={styles.agenda}>{[["09:30","Retornar lead prioritário","WhatsApp"],["11:00","Revisar avaliação","Troca"],["14:30","Acompanhar proposta","Comercial"]].map(([t,a,c])=><div className={styles.agendaRow} key={t}><time>{t}</time><div><strong>{a}</strong><span>{c}</span></div></div>)}</div></section>
      <section className={styles.panel}><header className={styles.panelHeader}><div><Icons.Plus/><h2>AÇÕES RÁPIDAS</h2></div></header><div className={styles.quick}><a href="/oportunidades"><Icons.Target/>Novo lead</a><a href="/oportunidades"><Icons.Car/>Avaliar troca</a><a href="/matches"><Icons.Search/>Buscar veículo</a><a href="/crm#propostas"><Icons.File/>Nova proposta</a></div></section>
     </aside>
    </section>
   </div>
  </section>
  <nav className={styles.mobileNav}><a href="/crm"><Icons.Grid/>Início</a><a href="/oportunidades"><Icons.Target/>Leads</a><a href="/crm#estoque"><Icons.Car/>Estoque</a><a href="/matches"><Icons.Search/>Match</a><a href="/crm#configuracoes"><Icons.Settings/>Ajustes</a></nav>
 </main>
}
