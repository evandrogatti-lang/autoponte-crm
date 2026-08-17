import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { vehicles } from "../../db/vehicle-schema";
import { tradeIns } from "../../db/schema";
import {
  CoreShell,
  coreStyles as styles,
} from "../../components/crm/CoreShell";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  await requireChatGPTUser("/relatorios");

  const [vehicleRows, opportunityRows] = await Promise.all([
    getDb().select().from(vehicles).limit(1000),
    getDb().select().from(tradeIns).limit(1000),
  ]);

  const open = opportunityRows.filter(
    (row) =>
      !["closed", "fechado", "lost", "perdido"].includes(
        String(row.status || "").toLowerCase()
      )
  );

  const closed = opportunityRows.filter((row) =>
    ["closed", "fechado"].includes(
      String(row.status || "").toLowerCase()
    )
  );

  const conversion = opportunityRows.length
    ? (closed.length / opportunityRows.length) * 100
    : 0;

  const activeVehicles = vehicleRows.filter(
    (vehicle) => !["sold", "unavailable"].includes(vehicle.status)
  );

  const partnerVehicles = activeVehicles.filter(
    (vehicle) => vehicle.inventoryScope === "partner"
  );

  const autoponteVehicles =
    activeVehicles.length - partnerVehicles.length;

  return (
    <CoreShell
      activeHref="/relatorios"
      title="Relatórios"
      subtitle="Visão consolidada dos principais indicadores da operação."
      actions={<Link href="/oportunidades">Funil comercial</Link>}
    >
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Oportunidades</span>
          <strong>{opportunityRows.length}</strong>
        </div>

        <div className={styles.metric}>
          <span>Abertas</span>
          <strong>{open.length}</strong>
        </div>

        <div className={styles.metric}>
          <span>Conversão</span>
          <strong>{conversion.toFixed(1)}%</strong>
        </div>

        <div className={styles.metric}>
          <span>Veículos ativos</span>
          <strong>{activeVehicles.length}</strong>
        </div>
      </div>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2>Composição do estoque</h2>

          <p>
            <strong>AutoPonte:</strong> {autoponteVehicles}
          </p>

          <p>
            <strong>Parceiros:</strong> {partnerVehicles.length}
          </p>

          <p>
            <strong>Total ativo:</strong> {activeVehicles.length}
          </p>
        </section>

        <section className={styles.card}>
          <h2>Indicadores comerciais</h2>

          <p>
            <strong>Oportunidades abertas:</strong> {open.length}
          </p>

          <p>
            <strong>Oportunidades fechadas:</strong> {closed.length}
          </p>

          <p>
            <strong>Taxa de conversão:</strong>{" "}
            {conversion.toFixed(1)}%
          </p>
        </section>
      </div>
    </CoreShell>
  );
}