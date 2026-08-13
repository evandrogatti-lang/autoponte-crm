import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { partners } from "../../../db/partner-schema";
import { vehicles } from "../../../db/vehicle-schema";
import { VehicleListFilters } from "../../../features/vehicle-registry/components/VehicleListFilters";
import { activeVehicleFilterChips, buildVehicleListHref, filterVehicleList, type VehicleFilterParams } from "../../../features/vehicle-registry/vehicle-list-filters";
import styles from "../../../features/partner-registry/components/PartnerRegistry.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const statusLabels: Record<string, string> = { available: "Disponível", evaluation: "Em avaliação", reserved: "Reservado", sold: "Vendido", unavailable: "Indisponível" };

export default async function PartnerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<VehicleFilterParams> }) {
  const { id } = await params;
  const filters = await searchParams;
  await requireChatGPTUser(`/parceiros/${id}`);

  const [partner] = await getDb().select().from(partners).where(eq(partners.id, id)).limit(1);
  if (!partner) notFound();

  const stock = await getDb().select().from(vehicles).where(eq(vehicles.partnerId, id)).limit(500);
  const selected = filterVehicleList(stock, filters);
  const total = stock.reduce((sum, vehicle) => sum + (vehicle.askingPrice || vehicle.fipeValue || 0), 0);
  const currentHref = buildVehicleListHref(`/parceiros/${partner.id}`, filters);

  return <main className={styles.page}>
    <div className={styles.topbar}>
      <div><p>PARCEIRO</p><h1>{partner.name}</h1><p>{partner.city}{partner.state ? `/${partner.state}` : ""} · {partner.status}</p></div>
      <div className={styles.actions}><a href="/crm">Voltar ao CRM</a><a href="/parceiros">Parceiros</a><a href={`/veiculos/novo?partner=${partner.id}`}>+ Cadastrar veículo</a></div>
    </div>
    <div className={styles.layout}>
      <section className={styles.card}><h2>Dados do parceiro</h2><div className={styles.kv}><div><span>Razão social</span><strong>{partner.legalName || "Não informada"}</strong></div><div><span>Documento</span><strong>{partner.document || "Não informado"}</strong></div><div><span>Contato</span><strong>{partner.contactName || "Não informado"}</strong></div><div><span>Telefone</span><strong>{partner.phoneE164 ? `+${partner.phoneE164}` : "Não informado"}</strong></div><div><span>E-mail</span><strong>{partner.email || "Não informado"}</strong></div><div><span>Integração</span><strong>{partner.integrationMode}{partner.externalSystem ? ` · ${partner.externalSystem}` : ""}</strong></div></div></section>
      <section className={styles.card}><h2>Resumo comercial</h2><div className={styles.kv}><div><span>Veículos</span><strong>{stock.length}</strong></div><div><span>Disponíveis</span><strong>{stock.filter((vehicle) => vehicle.status === "available").length}</strong></div><div><span>Valor anunciado</span><strong>{money.format(total)}</strong></div></div></section>
    </div>
    <section className={styles.card}>
      <h2>Estoque do parceiro</h2>
      <VehicleListFilters action={`/parceiros/${partner.id}`} clearHref={`/parceiros/${partner.id}`} filters={filters} resultCount={selected.length} totalCount={stock.length} chips={activeVehicleFilterChips(filters, { statuses: statusLabels })} brands={[...new Set(stock.map((vehicle) => vehicle.brand))].sort()} models={[...new Set(stock.map((vehicle) => vehicle.model))].sort()} statuses={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
      {stock.length === 0 ? <p className={styles.muted}>Nenhum veículo vinculado.</p> : selected.length === 0 ? <p className={styles.muted}>Nenhum veículo encontrado com os filtros atuais.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Veículo</th><th>Ano</th><th>Status</th><th>Preço</th><th>Ação</th></tr></thead><tbody>{selected.map((vehicle) => <tr key={vehicle.id}><td>{vehicle.brand} {vehicle.model}</td><td>{vehicle.modelYear}</td><td>{statusLabels[vehicle.status] || vehicle.status}</td><td>{money.format(vehicle.askingPrice || vehicle.fipeValue)}</td><td><a href={`/veiculos/${vehicle.id}?returnTo=${encodeURIComponent(currentHref)}`}>Abrir ficha</a></td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
