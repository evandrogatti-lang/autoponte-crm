import Link from "next/link";
import { CoreShell } from "../../components/crm/CoreShell";
import { requireChatGPTUser } from "../chatgpt-auth";
import { listCommercialCases } from "../../lib/commercial-cases/service";
import styles from "./cases.module.css";

export const dynamic="force-dynamic";
const money=(v:number|null)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v??0);
export default async function CasesPage(){
  await requireChatGPTUser("/casos");const cases=await listCommercialCases();
  return <CoreShell activeHref="/casos" title="Casos comerciais" subtitle="Ciclo operacional validado, da aquisição ao pós-venda.">
    <div className={styles.grid}>{cases.map(item=><Link className={styles.card} href={`/casos/${item.id}`} key={item.id}>
      <div className={styles.top}><strong>{item.pilotCode||item.id.slice(0,8)}</strong><span data-status={item.status}>{item.status.replaceAll("_"," ")}</span></div>
      <h2>{item.vehicleBrand} {item.vehicleModel} · {item.modelYear}</h2><p>{item.customerName} · {item.acquisitionMode.replaceAll("_"," ")}</p>
      <footer><span>{item.documentStatus}</span><b>{money(item.askingPrice)}</b></footer>
    </Link>)}</div>
  </CoreShell>;
}
