import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { vehicles } from "../../../db/vehicle-schema";
import { partners } from "../../../db/partner-schema";
import { InventoryShell } from "../../../features/vehicle-registry/components/InventoryShell";
import styles from "../../../features/vehicle-registry/components/VehicleRegistry.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const sourceLabels: Record<string, string> = { dealer_inventory: "Estoque de loja", consignment: "Consignação", trade_in: "Veículo de troca", autoponte_inventory: "Estoque AutoPonte", partner_inventory: "Estoque parceiro", new_vehicle: "Veículo 0 km" };
const statusLabels: Record<string, string> = { available: "Disponível", evaluation: "Em avaliação", reserved: "Reservado", sold: "Vendido", unavailable: "Indisponível" };

export default async function VehicleDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  await requireChatGPTUser(`/veiculos/${id}`);
  const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle) notFound();
  const [partner] = vehicle.partnerId ? await getDb().select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.id, vehicle.partnerId)).limit(1) : [];
  const asking = vehicle.askingPrice || vehicle.fipeValue || 0;
  const margin = Math.max(0, asking - (vehicle.acquisitionCost || 0));
  const fallbackHref = `/veiculos?scope=${vehicle.inventoryScope === "partner" ? "partner" : "autoponte"}`;
  const returnHref = returnTo && (returnTo.startsWith("/veiculos?") || returnTo.startsWith("/trocas?") || returnTo.startsWith("/parceiros/")) ? returnTo : fallbackHref;
  return <InventoryShell breadcrumb={<><a href="/crm">Mission Control</a><b>›</b><a href="/veiculos">Estoque</a><b>›</b><span>{vehicle.brand} {vehicle.model}</span></>}>
    <div className={styles.pageHeader}><div><p className={styles.eyebrow}>VEÍCULO</p><h1>{vehicle.brand} {vehicle.model}</h1><p>{vehicle.modelYear} · {vehicle.fuel} · FIPE {vehicle.fipeCode}</p></div><div className={styles.pageActions}><a href="/crm">← Voltar ao CRM</a><a href={returnHref}>Voltar ao estoque</a>{partner && <a href={`/parceiros/${partner.id}`}>Abrir parceiro</a>}<a className={styles.primaryAction} href="/oportunidades/nova">Criar oportunidade</a></div></div>
    <section className={styles.vehicleHero}>
      <div className={styles.vehiclePhoto}>{vehicle.brand.slice(0, 1)}{vehicle.model.slice(0, 1)}</div>
      <div className={styles.vehicleIdentity}><span className={styles.statusBadge} data-status={vehicle.status}>{statusLabels[vehicle.status] ?? vehicle.status}</span><h2>{vehicle.brand} {vehicle.model}</h2><p>{vehicle.plate || "Placa não informada"} · {vehicle.color || "Cor não informada"} · {vehicle.mileage.toLocaleString("pt-BR")} km</p></div>
      <div className={styles.heroValues}><div><span>Preço pedido</span><strong>{money.format(asking)}</strong></div><div><span>FIPE</span><strong>{money.format(vehicle.fipeValue)}</strong></div><div><span>Margem potencial</span><strong>{money.format(margin)}</strong></div></div>
    </section>
    <div className={styles.vehicleDetailLayout}>
      <div className={styles.detailStack}>
        <section className={styles.card}><header><div><span>IDENTIFICAÇÃO</span><h2>Dados do veículo</h2></div></header><div className={styles.kv}><div><span>Placa</span><strong>{vehicle.plate || "Não informada"}</strong></div><div><span>RENAVAM</span><strong>{vehicle.renavam || "Não informado"}</strong></div><div><span>Chassi</span><strong>{vehicle.chassis || "Não informado"}</strong></div><div><span>Código interno</span><strong>{vehicle.stockCode || "Não informado"}</strong></div><div><span>Quilometragem</span><strong>{vehicle.mileage.toLocaleString("pt-BR")} km</strong></div><div><span>Cor</span><strong>{vehicle.color || "Não informada"}</strong></div><div><span>Câmbio</span><strong>{vehicle.transmission || "Não informado"}</strong></div><div><span>Carroceria</span><strong>{vehicle.bodyType || "Não informada"}</strong></div><div><span>Motor / potência</span><strong>{[vehicle.engine, vehicle.power].filter(Boolean).join(" · ") || "Não informado"}</strong></div></div></section>
        <section className={styles.card}><header><div><span>CONDIÇÃO</span><h2>Documentação e preparação</h2></div></header><div className={styles.kv}><div><span>Condição</span><strong>{vehicle.vehicleCondition || "Não informada"}</strong></div><div><span>Documentação</span><strong>{vehicle.documentStatus || "Não informada"}</strong></div><div><span>Vistoria</span><strong>{vehicle.inspectionStatus || "Não informada"}</strong></div><div><span>Aquisição</span><strong>{vehicle.acquisitionDate || "Não informada"}</strong></div><div><span>Anúncio</span><strong>{vehicle.listingDate || "Não informado"}</strong></div><div><span>Opcionais</span><strong>{vehicle.optionalItems || "Não informados"}</strong></div></div></section>
      </div>
      <aside className={styles.detailAside}>
        <section className={styles.card}><header><div><span>COMERCIAL</span><h2>Valores e origem</h2></div></header><div className={styles.compactKv}><div><span>Estoque</span><strong>{vehicle.inventoryScope === "partner" ? "Parceiro" : "AutoPonte"}</strong></div><div><span>Parceiro</span><strong>{partner?.name || "Não aplicável"}</strong></div><div><span>Origem</span><strong>{sourceLabels[vehicle.sourceType] ?? vehicle.sourceType}</strong></div><div><span>Valor FIPE</span><strong>{money.format(vehicle.fipeValue)}</strong></div><div><span>Custo</span><strong>{money.format(vehicle.acquisitionCost || 0)}</strong></div><div><span>Proprietário / loja</span><strong>{vehicle.ownerName || "Não informado"}</strong></div></div></section>
        <section className={styles.recommendationCard}><span>RECOMENDAÇÃO EXPLICADA</span><h3>Aguardar dados de demanda compatível</h3><p><strong>Por que agora:</strong> o cadastro do veículo está ativo, mas o motor de matches ainda não está conectado a esta página.</p><p><strong>Impacto esperado:</strong> após a integração, esta área mostrará compradores compatíveis, urgência e ação recomendada com evidência.</p></section>
      </aside>
    </div>
  </InventoryShell>;
}
