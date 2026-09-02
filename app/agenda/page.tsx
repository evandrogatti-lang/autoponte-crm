import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { getMissionControl } from "../../lib/commercial-cases/service";
import styles from "../crm/mission-control.module.css";

export const dynamic = "force-dynamic";
const date=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"});
const actionLabels:Record<string,string>={CONTACT_CUSTOMER:"Contatar cliente",REQUEST_DOCUMENTS:"Solicitar documentos",REVIEW_PROPOSAL:"Revisar proposta",SCHEDULE_FOLLOW_UP:"Fazer acompanhamento",MARK_CASE_LOST:"Registrar perda"};
function dayKey(value:Date){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(value)}

export default async function AgendaPage({searchParams}:{searchParams:Promise<{filtro?:string;visao?:string}>}){
  const user=await requireCurrentAppUser("/agenda");const crmUser=await requirePermission(user,"seller_operations.manage");const model=await getMissionControl(crmUser.id);const query=await searchParams;
  const today=dayKey(new Date());const tasks=model.agendaActions.filter((task)=>query.filtro==="hoje"?dayKey(task.dueAt)===today:query.filtro==="atrasadas"?dayKey(task.dueAt)<today:true);
  return <main className={styles.page}><header className={styles.hero}><div><span>AGENDA OPERACIONAL</span><h1>{query.visao==="atividade"?"Atividade recente":"Próximas ações"}</h1><p>Compromissos internos do CRM, preparados para futura integração de calendário.</p></div><Link className={styles.negotiationCard} href="/crm">Voltar à Central</Link></header>
    {query.visao==="atividade"?<section className={styles.panel}><div className={styles.sectionHeading}><div><span>HISTÓRICO</span><h2>Atividade recente</h2></div></div>{model.recentActivity.length?<div className={styles.activity}>{model.recentActivity.map((event)=><Link href={`/negociacoes/${event.caseId}`} key={event.id}><i/><span><strong>{event.description||"Atualização operacional"}</strong><small>{date.format(event.occurredAt)}</small></span></Link>)}</div>:<p className={styles.empty}>Nenhuma atividade registrada.</p>}</section>:<section className={styles.panel}><div className={styles.sectionHeading}><div><span>COMPROMISSOS</span><h2>{query.filtro==="hoje"?"Ações de hoje":query.filtro==="atrasadas"?"Ações atrasadas":"Agenda completa"}</h2></div><Link href="/agenda">Limpar filtro</Link></div>{tasks.length?<div className={styles.compactList}>{tasks.map((task)=>{const item=model.cases.find((entry)=>entry.id===task.caseId);return <Link href={`/negociacoes/${task.caseId}`} key={task.id}><span><strong>{actionLabels[task.actionType]||task.actionType}</strong><small>{item?.customerName||"Cliente não informado"} · {task.context||"Sem contexto adicional"}</small></span><b>{date.format(task.dueAt)}</b></Link>})}</div>:<p className={styles.empty}>Nenhuma ação neste recorte.</p>}</section>}
  </main>
}
