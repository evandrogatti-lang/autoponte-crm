import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { listCommercialCases } from "../../lib/commercial-cases/service";
import styles from "../casos/cases.module.css";

export const dynamic = "force-dynamic";
const label = (value: string) => value.replaceAll("_", " ");

export default async function NegotiationsPage() {
  const user = await requireCurrentAppUser("/negociacoes");
  await requirePermission(user, "seller_operations.manage");
  const negotiations = await listCommercialCases();
  return <main className={styles.page}>
    <header className={styles.header}><div><span>EXECUÇÃO COMERCIAL</span><h1>Negociações</h1><p>Workspace do vendedor para conduzir próximos passos, propostas, documentos e decisões.</p></div></header>
    {negotiations.length === 0 ? <div className={styles.empty}>Nenhuma negociação disponível.</div> : <div className={styles.list}>
      {negotiations.map((item) => <Link href={`/negociacoes/${item.id}`} className={styles.row} key={item.id}>
        <div><strong>{item.pilotCode || item.id.slice(0, 8).toUpperCase()}</strong><span>{item.customerName || "Cliente não informado"}</span></div>
        <div><b>{item.vehicleBrand || "Veículo"} {item.vehicleModel || ""}</b><span>{item.modelYear || "Ano não informado"} · {label(item.acquisitionMode)}</span></div>
        <div><em data-status={item.status}>{label(item.finalOutcome || item.status)}</em><span>{item.documentStatus || "Documentação não informada"}</span></div>
        <span className={styles.open}>Abrir workspace</span>
      </Link>)}
    </div>}
  </main>;
}
