import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { vehicles } from "../../db/vehicle-schema";
import { partners } from "../../db/partner-schema";
import { InventoryShell } from "../../features/vehicle-registry/components/InventoryShell";
import { VehicleListFilters } from "../../features/vehicle-registry/components/VehicleListFilters";
import { activeVehicleFilterChips, buildVehicleListHref, filterVehicleList, type VehicleFilterParams } from "../../features/vehicle-registry/vehicle-list-filters";
import styles from "../../features/vehicle-registry/components/VehicleRegistry.module.css";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const sourceLabels: Record<string, string> = { dealer_inventory: "Estoque próprio", consignment: "Consignação", trade_in: "Troca", autoponte_inventory: "AutoPonte", partner_inventory: "Estoque parceiro", new_vehicle: "0 km" };
const statusLabels: Record<string, string> = { available: "Disponível", evaluation: "Em avaliação", reserved: "Reservado", sold: "Vendido", unavailable: "Indisponível" };

function daysSince(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ scope?: string } & VehicleFilterParams> }) {
  await requireChatGPTUser("/veiculos");
  const { scope = "all", ...queryFilters } = await searchParams;
  const filters = { ...queryFilters, status: queryFilters.status || "active" };
  const rows = await getDb().select().from(vehicles).orderBy(desc(vehicles.updatedAt)).limit(1000);
  const partnerRows = await getDb().select({ id: partners.id, name: partners.name }).from(partners);
  const partnerMap = new Map(partnerRows.map((p) => [p.id, p.name]));
  const scopedRows = rows.filter((vehicle) => {
    const scopeOk = scope === "all" || (scope === "partner" ? vehicle.inventoryScope === "partner" : scope === "autoponte" ? vehicle.inventoryScope !== "partner" : scope === "consignment" ? vehicle.sourceType === "consignment" : scope === "trade" ? vehicle.sourceType === "trade_in" : scope === "reserved" ? vehicle.status === "reserved" : scope === "sold" ? vehicle.status === "sold" : true);
    return scopeOk;
  });
  const selected = filterVehicleList(scopedRows, filters, partnerMap);
  const activeRows = rows.filter((vehicle) => !["sold", "unavailable"].includes(vehicle.status));
  const totalValue = activeRows.reduce((sum, vehicle) => sum + (vehicle.askingPrice || vehicle.fipeValue || 0), 0);
  const totalMargin = activeRows.reduce((sum, vehicle) => sum + Math.max(0, (vehicle.askingPrice || 0) - (vehicle.acquisitionCost || 0)), 0);
  const agingValues = activeRows.map((vehicle) => daysSince(vehicle.listingDate || vehicle.acquisitionDate || vehicle.createdAt)).filter((value): value is number => value !== null);
  const averageAging = agingValues.length ? Math.round(agingValues.reduce((sum, value) => sum + value, 0) / agingValues.length) : 0;
  const highLiquidity = activeRows.filter((vehicle) => (daysSince(vehicle.listingDate || vehicle.createdAt) ?? 999) <= 30).length;

  const currentHref = buildVehicleListHref("/veiculos", { ...filters, scope });
  const clearHref = scope === "partner" ? "/veiculos?scope=partner" : "/veiculos";
  const tab = (value: string, label: string) => <a data-active={scope === value} href={buildVehicleListHref("/veiculos", { ...filters, scope: value })}>{label}</a>;
  return <InventoryShell breadcrumb={<><a href="/crm">Mission Control</a><b>›</b><span>Estoque</span></>}>
    <div className={styles.pageHeader}>
      <div><h1>Estoque de Veículos</h1><p>Gerencie o estoque próprio, veículos de parceiros, consignados e trocas.</p></div>
      <div className={styles.pageActions}><a href="/crm">← Voltar ao CRM</a><a href="/parceiros">Cadastrar parceiro</a><a className={styles.primaryAction} href="/veiculos/novo">＋ Cadastrar veículo</a></div>
    </div>
    <section className={styles.inventoryToolbar}>
      <nav className={styles.inventoryTabs}>{tab("all", "Todos")}{tab("autoponte", "AutoPonte")}{tab("partner", "Parceiros")}{tab("consignment", "Consignados")}{tab("trade", "Trocas")}{tab("reserved", "Reservados")}{tab("sold", "Vendidos")}</nav>
    </section>
    <VehicleListFilters action="/veiculos" clearHref={clearHref} filters={filters} resultCount={selected.length} totalCount={scopedRows.length} chips={[...(scope === "all" ? [] : [["Escopo", scope] as [string, string]]), ...activeVehicleFilterChips(filters, { partners: partnerMap, origins: sourceLabels, statuses: statusLabels })]} brands={[...new Set(scopedRows.map((vehicle) => vehicle.brand))].sort()} models={[...new Set(scopedRows.map((vehicle) => vehicle.model))].sort()} partners={partnerRows.map((partner) => ({ value: partner.id, label: partner.name }))} origins={Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))} statuses={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} hidden={{ scope }} />
    <section className={styles.metricGrid}>
      <article><i>▣</i><div><span>Veículos ativos</span><strong>{activeRows.length}</strong><small>Total em estoque</small></div></article>
      <article><i>◇</i><div><span>Valor anunciado</span><strong>{money.format(totalValue)}</strong><small>Soma dos preços</small></div></article>
      <article><i>↗</i><div><span>Margem potencial</span><strong>{money.format(totalMargin)}</strong><small>Preço menos custo</small></div></article>
      <article><i>◷</i><div><span>Tempo médio em estoque</span><strong>{averageAging} dias</strong><small>Tempo no estoque</small></div></article>
      <article><i>⌁</i><div><span>Giro recente</span><strong>{highLiquidity}</strong><small>Até 30 dias</small></div></article>
      <article><i>◎</i><div><span>Demandas compatíveis</span><strong>—</strong><small>Será ligado ao motor de matches</small></div></article>
    </section>
    <div className={styles.inventoryListLayout}>
      <section className={styles.inventoryTableCard}>
        {selected.length === 0 ? <div className={styles.empty}>Nenhum veículo encontrado com os filtros atuais.</div> : <table className={styles.inventoryTable}>
          <thead><tr><th>Veículo</th><th>Origem</th><th>Proprietário / parceiro</th><th>Ano</th><th>Km</th><th>FIPE</th><th>Preço</th><th>Margem</th><th>Tempo em estoque</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>{selected.map((vehicle) => {
            const asking = vehicle.askingPrice || vehicle.fipeValue || 0;
            const margin = Math.max(0, asking - (vehicle.acquisitionCost || 0));
            const marginPct = vehicle.acquisitionCost ? (margin / vehicle.acquisitionCost) * 100 : null;
            const aging = daysSince(vehicle.listingDate || vehicle.acquisitionDate || vehicle.createdAt);
            const owner = vehicle.inventoryScope === "partner" ? partnerMap.get(vehicle.partnerId) || vehicle.ownerName || "Parceiro não informado" : vehicle.ownerName || "AutoPonte Veículos";
              return (
  <tr key={vehicle.id} className={styles.clickableRow}>
    <td>
      <div className={styles.vehicleCell}>
        <div className={styles.vehicleThumb}>
          {vehicle.brand.slice(0, 1)}
          {vehicle.model.slice(0, 1)}
        </div>

        <div>
          <a
            href={`/veiculos/${vehicle.id}?returnTo=${encodeURIComponent(currentHref)}`}
            title="Abrir ficha do veículo"
            className={styles.vehicleRowLink}
          >
            <strong>
              {vehicle.brand} {vehicle.model}
            </strong>
          </a>

          <small>
            {vehicle.plate || vehicle.stockCode || "Sem placa"} ·{" "}
            {vehicle.color || "Cor não informada"}
          </small>
        </div>
      </div>
    </td>

    <td>
      <span
        className={styles.originBadge}
        data-origin={vehicle.sourceType}
      >
        {sourceLabels[vehicle.sourceType] ?? vehicle.sourceType}
      </span>
    </td>

    <td>
      <strong className={styles.cellStrong}>{owner}</strong>
      <small>
        {vehicle.inventoryScope === "partner"
          ? "Parceiro"
          : "Operação AutoPonte"}
      </small>
    </td>

    <td>{vehicle.modelYear || "—"}</td>

    <td>
      {vehicle.mileage.toLocaleString("pt-BR")}
      <small>km</small>
    </td>

    <td>{money.format(vehicle.fipeValue)}</td>

    <td className={styles.price}>
      {money.format(asking)}
    </td>

    <td>
      {margin ? (
        <>
          <strong>{money.format(margin)}</strong>
          {marginPct !== null && (
            <small>{marginPct.toFixed(1)}%</small>
          )}
        </>
      ) : (
        "—"
      )}
    </td>

    <td>
      {aging === null ? (
        "—"
      ) : (
        <>
          {aging}
          <small>dias</small>
        </>
      )}
    </td>

    <td>
      <span
        className={styles.statusBadge}
        data-status={vehicle.status}
      >
        {statusLabels[vehicle.status] ?? vehicle.status}
      </span>
    </td>

    <td>
      <div className={styles.rowActions}>
        <a
          href={`/veiculos/${vehicle.id}?returnTo=${encodeURIComponent(currentHref)}`}
          title="Abrir ficha do veículo"
        >
          Abrir ficha
        </a>
      </div>
    </td>
  </tr>
);
            })}</tbody>
          </table>}
          <footer className={styles.tableFooter}><span>Mostrando {selected.length} de {rows.length} veículos</span><span>Dados reais do Supabase</span></footer>
        </section>
    </div>
  </InventoryShell>;
}
