import { requireSellerOperations } from "../app-auth";
import { getDb } from "../../db";
import { vehicles } from "../../db/vehicle-schema";
import {
  CoreShell,
  coreStyles as styles,
} from "../../components/crm/CoreShell";
import Link from "next/link";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default async function FinanceiroPage() {
  await requireSellerOperations("/financeiro");

  const rows = await getDb().select().from(vehicles).limit(1000);

  const active = rows.filter(
    (vehicle) => !["sold", "unavailable"].includes(vehicle.status)
  );

  const asking = active.reduce(
    (total, vehicle) =>
      total + (vehicle.askingPrice || vehicle.fipeValue || 0),
    0
  );

  const cost = active.reduce(
    (total, vehicle) => total + (vehicle.acquisitionCost || 0) + (vehicle.additionalCosts || 0),
    0
  );

  const potential = Math.max(0, asking - cost);
  const marginPct = cost > 0 ? (potential / cost) * 100 : 0;

  const averageAsking = active.length ? asking / active.length : 0;
  const averageCost = active.length ? cost / active.length : 0;
  const averagePotential = active.length ? potential / active.length : 0;

  return (
    <CoreShell
      activeHref="/financeiro"
      title="Financeiro"
      subtitle="Visão financeira operacional dos veículos ativos."
      actions={<Link href="/veiculos">Ver estoque</Link>}
    >
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Valor anunciado</span>
          <strong>{money.format(asking)}</strong>
        </div>

        <div className={styles.metric}>
          <span>Custo registrado</span>
          <strong>{money.format(cost)}</strong>
        </div>

        <div className={styles.metric}>
          <span>Margem potencial</span>
          <strong className={styles.kpiPositive}>
            {money.format(potential)}
          </strong>
        </div>

        <div className={styles.metric}>
          <span>Margem potencial %</span>
          <strong>{marginPct.toFixed(1)}%</strong>
        </div>
      </div>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <h2>Resumo financeiro</h2>
          <p>
            Os indicadores são calculados com base nos veículos ativos,
            valores anunciados e custos registrados no estoque.
          </p>
        </section>

        <section className={styles.card}>
          <h2>Indicadores do estoque</h2>

          <p>
            <strong>Veículos ativos:</strong> {active.length}
          </p>

          <p>
            <strong>Valor médio anunciado:</strong>{" "}
            {money.format(averageAsking)}
          </p>

          <p>
            <strong>Custo médio registrado:</strong>{" "}
            {money.format(averageCost)}
          </p>

          <p>
            <strong>Margem média potencial:</strong>{" "}
            {money.format(averagePotential)}
          </p>
        </section>
      </div>
    </CoreShell>
  );
}
