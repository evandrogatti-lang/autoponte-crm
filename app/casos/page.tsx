import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { listCommercialCases } from "../../lib/commercial-cases/service";
import styles from "./cases.module.css";

export const dynamic = "force-dynamic";

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default async function CasesPage() {
  const user = await requireCurrentAppUser("/casos");
  await requirePermission(user, "seller_operations.manage");
  const cases = await listCommercialCases();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>OPERAÇÃO COMERCIAL</span>
          <h1>Casos</h1>
          <p>Priorize pendências, decisões e próximos compromissos da operação.</p>
        </div>
      </header>

      {cases.length === 0 ? (
        <div className={styles.empty}>Nenhum caso comercial disponível.</div>
      ) : (
        <div className={styles.list}>
          {cases.map((item) => (
            <Link href={`/casos/${item.id}`} className={styles.row} key={item.id}>
              <div>
                <strong>{item.pilotCode || item.id.slice(0, 8).toUpperCase()}</strong>
                <span>{item.customerName || "Cliente não informado"}</span>
              </div>
              <div>
                <b>{item.vehicleBrand || "Veículo"} {item.vehicleModel || ""}</b>
                <span>{item.modelYear || "Ano não informado"} · {label(item.acquisitionMode)}</span>
              </div>
              <div>
                <em data-status={item.status}>{label(item.finalOutcome || item.status)}</em>
                <span>{item.documentStatus || "Documentação não informada"}</span>
              </div>
              <span className={styles.open}>Abrir</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
