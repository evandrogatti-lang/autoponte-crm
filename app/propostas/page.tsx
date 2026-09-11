import { desc } from "drizzle-orm";
import { requireSellerOperations } from "../app-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";
import {
  CoreShell,
  coreStyles as styles,
} from "../../components/crm/CoreShell";
import proposalStyles from "./Propostas.module.css";
import Link from "next/link";
import { commercialRoutes, leadQualificationHref } from "../../lib/commercial-navigation";

export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  await requireSellerOperations("/propostas");

  const rows = await getDb()
    .select()
    .from(tradeIns)
    .orderBy(desc(tradeIns.updatedAt))
    .limit(100);

  const proposalCandidates = rows.filter((row) =>
    [
      "proposal",
      "proposta",
      "negotiation",
      "negociacao",
      "qualification",
      "qualificacao",
    ].includes(String(row.status || "").toLowerCase())
  );

  return (
    <CoreShell
      activeHref="/propostas"
      title="Propostas"
      subtitle="Qualificações avançadas que podem gerar propostas comerciais."
      actions={<Link href={commercialRoutes.funnel}>Abrir funil comercial</Link>}
    >
      <h2 className={styles.sectionTitle}>Qualificações elegíveis</h2>

      {proposalCandidates.length === 0 ? (
        <div className={styles.empty}>
          Nenhuma qualificação em estágio de proposta ou negociação foi encontrada.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Demanda</th>
                <th>Etapa</th>
                <th>Probabilidade</th>
                <th>Próxima ação</th>
              </tr>
            </thead>

            <tbody>
  {proposalCandidates.map((row) => (
    <tr key={row.id} className={proposalStyles.clickableRow}>
      <td>
        <Link
          href={leadQualificationHref(row.id)}
          className={proposalStyles.rowLink}
        >
          <strong>{row.name}</strong>
        </Link>

        <br />
        <small>{row.city}</small>
      </td>

      <td>
        {row.desiredVehicle || `${row.brand} ${row.model}`}
      </td>

      <td>{row.status || "—"}</td>

      <td>{row.probability ?? 0}%</td>

      <td>
        {row.nextAction || row.nextFollowUp || "—"}
      </td>

    </tr>
  ))}
</tbody>
          </table>
        </div>
      )}
    </CoreShell>
  );
}
