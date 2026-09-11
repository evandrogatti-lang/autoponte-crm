import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { getMissionControl } from "../../lib/commercial-cases/service";
import styles from "./pipeline.module.css";
import { commercialRoutes, negotiationHref } from "../../lib/commercial-navigation";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function FunnelPage(){
  const user=await requireCurrentAppUser("/funil");
  const crmUser=await requirePermission(user,"seller_operations.manage");
  const model=await getMissionControl(crmUser.id);
  return <main className={styles.page}>
    <header className={styles.header}><div><span>FLUXO COMERCIAL</span><h1>Funil de vendas</h1><p>Negociações organizadas por estágio real do processo comercial.</p></div><Link href="/crm">Voltar à Central de Operações</Link></header>
    <section className={styles.board} aria-label="Etapas do funil de vendas">
      {model.funnel.map((stage)=><article className={styles.column} id={stage.stage} key={stage.stage}><header><div><h2>{stage.label}</h2><b>{stage.count}</b></div><small>{money.format(stage.value)} em valor associado</small></header><div className={styles.cards}>{stage.cases.length?stage.cases.map((item)=><Link className={styles.card} href={stage.stage === "new_leads" ? "/leads/novos" : stage.stage === "potential_clients" ? commercialRoutes.qualification : stage.stage === "opportunities" ? commercialRoutes.match : stage.stage === "proposals" ? commercialRoutes.proposals : negotiationHref(item.id)} key={item.id}><span>{item.pilotCode||item.id.slice(0,8).toUpperCase()}</span><h3>{item.customerName||"Cliente não informado"}</h3><p>{item.vehicleLabel||"Veículo em definição"}</p><footer><span>{item.sellerName||item.nextAction?.ownerName||"Sem responsável"}</span><b>{item.displayValue?money.format(item.displayValue):"Sem valor"}</b></footer></Link>):<p className={styles.empty}>Nenhum registro nesta etapa.</p>}</div></article>)}
    </section>
  </main>;
}
