import { desc } from "drizzle-orm";
import { requireSellerOperations } from "../app-auth";
import { getDb } from "../../db";
import { vehicles } from "../../db/vehicle-schema";
import tradeStyles from "./Trocas.module.css";
import { CoreShell, coreStyles as styles } from "../../components/crm/CoreShell";
import { VehicleListFilters } from "../../features/vehicle-registry/components/VehicleListFilters";
import { activeVehicleFilterChips, buildVehicleListHref, filterVehicleList, type VehicleFilterParams } from "../../features/vehicle-registry/vehicle-list-filters";
import Link from "next/link";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const statusLabels: Record<string, string> = { available: "Disponível", evaluation: "Em avaliação", reserved: "Reservado", sold: "Vendido", unavailable: "Indisponível" };

export default async function TrocasPage({ searchParams }: { searchParams: Promise<VehicleFilterParams> }) {
  await requireSellerOperations("/trocas");
  const filters = await searchParams;
  const allVehicles = await getDb().select().from(vehicles).orderBy(desc(vehicles.updatedAt)).limit(1000);
  const rows = allVehicles.filter((v) => v.sourceType === "trade_in");
  const selected = filterVehicleList(rows, filters);
  const active = rows.filter((v) => !["sold", "unavailable"].includes(v.status));
  const totalFipe = active.reduce((s, v) => s + (v.fipeValue || 0), 0);
  const totalAsked = active.reduce((s, v) => s + (v.askingPrice || v.fipeValue || 0), 0);
  const currentHref = buildVehicleListHref("/trocas", filters);

  return <CoreShell activeHref="/trocas" title="Trocas" subtitle="Veículos recebidos ou avaliados em operações de troca, separados das oportunidades." actions={<><Link href="/veiculos/novo">Cadastrar veículo</Link><Link className="primary" href="/oportunidades">Ver oportunidades</Link></>}>
    <section className={styles.metrics}>
      <article className={styles.metric}><span>Trocas registradas</span><strong>{rows.length}</strong></article>
      <article className={styles.metric}><span>Ativas</span><strong>{active.length}</strong></article>
      <article className={styles.metric}><span>FIPE acumulada</span><strong>{money.format(totalFipe)}</strong></article>
      <article className={styles.metric}><span>Valor comercial</span><strong>{money.format(totalAsked)}</strong></article>
    </section>
    <VehicleListFilters action="/trocas" clearHref="/trocas" filters={filters} resultCount={selected.length} totalCount={rows.length} chips={activeVehicleFilterChips(filters, { statuses: statusLabels })} brands={[...new Set(rows.map((vehicle) => vehicle.brand))].sort()} models={[...new Set(rows.map((vehicle) => vehicle.model))].sort()} statuses={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
    {rows.length === 0 ? <div className={styles.empty}>Nenhum veículo de troca cadastrado. Cadastre o veículo com origem <b>Troca</b> em Estoque.</div> : selected.length === 0 ? <div className={styles.empty}>Nenhuma troca encontrada com os filtros atuais.</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Veículo</th><th>Ano</th><th>Km</th><th>FIPE</th><th>Preço</th><th>Condição</th><th>Status</th></tr></thead><tbody>{selected.map((v)=><tr key={v.id} className={tradeStyles.clickableRow}><td><Link className={tradeStyles.rowLink} href={`/veiculos/${v.id}?returnTo=${encodeURIComponent(currentHref)}`}><b>{v.brand} {v.model}</b><br/><small>{v.plate || "Sem placa"}</small></Link></td><td>{v.modelYear || "—"}</td><td>{v.mileage.toLocaleString("pt-BR")} km</td><td>{money.format(v.fipeValue || 0)}</td><td>{money.format(v.askingPrice || v.fipeValue || 0)}</td><td>{v.vehicleCondition || "—"}</td><td><span className={styles.badge}>{v.status}</span></td></tr>)}</tbody></table></div>}
  </CoreShell>;
}
