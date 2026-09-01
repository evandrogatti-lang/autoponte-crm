import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { listOperationalDeliveries } from "../../lib/commercial-cases/service";
import styles from "../crm/mission-control.module.css";

export const dynamic="force-dynamic";
const date=new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"});
export default async function DeliveriesPage(){const user=await requireCurrentAppUser("/entregas");await requirePermission(user,"seller_operations.manage");const rows=await listOperationalDeliveries();return <main className={styles.page}><header className={styles.hero}><div><span>OPERAÇÃO DE ENTREGA</span><h1>Entrega de veículos</h1><p>Entregas agendadas e concluídas a partir do fluxo comercial canônico.</p></div><Link className={styles.negotiationCard} href="/crm">Voltar à Central</Link></header><section className={styles.panel}><div className={styles.sectionHeading}><div><span>AGENDA DE ENTREGA</span><h2>Veículos e clientes</h2></div></div>{rows.length?<div className={styles.compactList}>{rows.map((row)=><Link href={`/casos/${row.caseId}`} key={row.id}><span><strong>{row.customerName||"Cliente não informado"}</strong><small>{[row.vehicleBrand,row.vehicleModel].filter(Boolean).join(" ")||"Veículo não informado"} · {row.notes||"Sem observações"}</small></span><b>{row.status==="delivered"?`Entregue ${row.deliveredAt?date.format(row.deliveredAt):""}`:row.scheduledAt?date.format(row.scheduledAt):"Sem data"}</b></Link>)}</div>:<p className={styles.empty}>Nenhuma entrega registrada.</p>}</section></main>}
