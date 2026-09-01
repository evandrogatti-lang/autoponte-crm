import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { getMissionControl } from "../../lib/commercial-cases/service";
import styles from "../crm/mission-control.module.css";

export const dynamic="force-dynamic";
const date=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"});
export default async function ApprovalsPage(){const user=await requireCurrentAppUser("/aprovacoes");const crmUser=await requirePermission(user,"seller_operations.manage");const model=await getMissionControl(crmUser.id);return <main className={styles.page}><header className={styles.hero}><div><span>DECISÕES GERENCIAIS</span><h1>Aprovações pendentes</h1><p>Revisões de proposta registradas como próxima ação. A decisão continua no Workspace da negociação.</p></div><Link className={styles.negotiationCard} href="/crm">Voltar à Central</Link></header><section className={styles.panel}><div className={styles.sectionHeading}><div><span>FONTE CANÔNICA</span><h2>Propostas aguardando revisão</h2></div></div>{model.approvals.length?<div className={styles.compactList}>{model.approvals.map((task)=>{const item=model.cases.find((entry)=>entry.id===task.caseId);return <Link href={`/casos/${task.caseId}`} key={task.id}><span><strong>{item?.customerName||"Cliente não informado"}</strong><small>{task.context||"Revisão de proposta"} · {task.ownerName||"Sem responsável"}</small></span><b>{date.format(task.dueAt)}</b></Link>})}</div>:<p className={styles.empty}>Nenhuma revisão de proposta pendente. Outros tipos de aprovação ainda não possuem workflow canônico e não são simulados aqui.</p>}</section></main>}
