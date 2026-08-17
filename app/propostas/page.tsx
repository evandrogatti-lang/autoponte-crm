import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";
import {
  CoreShell,
  coreStyles as styles,
} from "../../components/crm/CoreShell";
import proposalStyles from "./Propostas.module.css";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  await requireChatGPTUser("/propostas");

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
      subtitle="Oportunidades em negociação que podem gerar propostas comerciais."
      actions={<Link href="/oportunidades">Abrir funil comercial</Link>}
    >
      <h2 className={styles.sectionTitle}>Oportunidades elegíveis</h2>

      {proposalCandidates.length === 0 ? (
        <div className={styles.empty}>
          Nenhuma oportunidade em estágio de proposta ou negociação foi encontrada.
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
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
  {proposalCandidates.map((row) => (
    <tr key={row.id} className={proposalStyles.clickableRow}>
      <td>
        <Link
          href={`/oportunidades/${row.id}`}
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

      <td>
        <Link
          href={`/oportunidades/${row.id}`}
          className={proposalStyles.actionLink}
        >
          Abrir oportunidade
        </Link>
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