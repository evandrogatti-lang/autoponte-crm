import Link from "next/link";
import type { MissionControlCasesModel, MissionControlState } from "../../../lib/commercial-cases/mission-control";
import styles from "./CasesMissionControl.module.css";

const stateLabels:Record<MissionControlState,string>={URGENT:"Urgente",OVERDUE:"Em atraso",DUE_TODAY:"Vence hoje",HIGH:"Alta prioridade",NO_NEXT_ACTION:"Sem próxima ação",RECENTLY_LOST:"Perdido recentemente",ACTIVE:"Ativo"};
const statusLabels:Record<string,string>={opened:"Aberto",active:"Ativo",lost:"Perdido",closed:"Fechado"};
function date(value:Date|null){return value?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(new Date(value)):"—";}

export function CasesMissionControl({model}:{model:MissionControlCasesModel|null}){
  if(!model)return <section className={styles.unavailable}><strong>Mission Control indisponível</strong><p>Não foi possível carregar os dados canônicos de Casos e Próximas Ações.</p></section>;
  const counters=[["Em atraso",model.counters.overdue],["Vencem hoje",model.counters.dueToday],["Sem próxima ação",model.counters.noNextAction],["Alta / urgente",model.counters.highOrUrgent],["Perdidos recentes",model.counters.recentlyLost]] as const;
  return <section className={styles.page}><div className={styles.counters} aria-label="Contadores operacionais">{counters.map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><div className={styles.listHeader}><div><h2>Fila operacional</h2><p>Ordenada por urgência e prazo da Próxima Ação canônica.</p></div><span>{model.items.length} casos relevantes</span></div>{model.items.length===0?<div className={styles.empty}>Nenhum caso exige atenção neste momento.</div>:<div className={styles.list}>{model.items.map(item=><article className={styles.row} data-state={item.state} key={item.id}><div className={styles.signal}><span>{stateLabels[item.state]}</span><strong>{item.caseLabel}</strong><small>{item.customerName}</small></div><dl><div><dt>Status</dt><dd>{statusLabels[item.status]??item.status}</dd></div><div className={styles.next}><dt>Próxima ação</dt><dd>{item.nextAction??"Sem próxima ação"}</dd></div><div><dt>Responsável</dt><dd>{item.owner}</dd></div><div><dt>Prazo</dt><dd>{date(item.dueAt)}</dd></div><div><dt>Prioridade</dt><dd>{item.priority??"—"}</dd></div><div className={styles.reason}><dt>{item.state==="RECENTLY_LOST"?"Motivo da perda":"Motivo sem próxima ação"}</dt><dd>{item.reason??"—"}</dd></div></dl><Link href={`/casos/${encodeURIComponent(item.id)}`}>Abrir caso</Link></article>)}</div>}</section>;
}
