import type { InventoryReadiness } from "../../../lib/vehicles/inventory-readiness.ts";
import { BRL_CURRENCY } from "../../../lib/presentation/formatters.ts";
import { vehicleLifecycleLabel } from "../../../lib/vehicles/presentation.ts";
import styles from "./VehicleRegistry.module.css";

export function VehicleHeroSummary({ vehicle, askingPrice, totalCost, margin }: {
  vehicle: { brand: string; model: string; plate: string; color: string; mileage: number; status: string; lifecycleStatus: string };
  askingPrice: number;
  totalCost: number;
  margin: number;
}) {
  return <section className={styles.vehicleHero}>
    <div className={styles.vehiclePhoto}>{vehicle.brand.slice(0, 1)}{vehicle.model.slice(0, 1)}</div>
    <div className={styles.vehicleIdentity}>
      <span className={styles.statusBadge} data-status={vehicle.status}>{vehicleLifecycleLabel(vehicle.lifecycleStatus)}</span>
      <h2>{vehicle.brand} {vehicle.model}</h2>
      <p>{vehicle.plate || "Placa não informada"} · {vehicle.color || "Cor não informada"} · {vehicle.mileage.toLocaleString("pt-BR")} km</p>
    </div>
    <div className={styles.heroValues}>
      <div><span>Preço de venda</span><strong>{BRL_CURRENCY.format(askingPrice)}</strong></div>
      <div><span>Custo total</span><strong>{BRL_CURRENCY.format(totalCost)}</strong></div>
      <div><span>Margem bruta estimada</span><strong>{BRL_CURRENCY.format(margin)}</strong></div>
    </div>
  </section>;
}

export function VehicleOperationalPanel({ lifecycleStatus, readiness, askingPrice, inventoryAgeDays }: {
  lifecycleStatus: string;
  readiness: InventoryReadiness;
  askingPrice: number;
  inventoryAgeDays: number;
}) {
  return <section className={styles.card}>
    <header><div><span>ATIVIDADE OPERACIONAL ATUAL</span><h2>{vehicleLifecycleLabel(lifecycleStatus)}</h2></div></header>
    <div className={styles.kv}>
      <div><span>Bloqueadores</span><strong>{readiness.blockers.length ? readiness.blockers.join(" · ") : "Nenhum"}</strong></div>
      <div><span>Documentação</span><strong>{readiness.documentationReady ? "Pronta" : "Pendente"}</strong></div>
      <div><span>Manutenção</span><strong>{readiness.maintenanceReady ? "Pronta" : `${readiness.openWorkOrders} ordem(ns) aberta(s)`}</strong></div>
      <div><span>VQI</span><strong>{!readiness.vqiRequired ? "Não exigido" : readiness.vqiReady ? "Concluído" : "Pendente"}</strong></div>
      <div><span>Fotos / mídia</span><strong>{readiness.approvedPhotos} aprovadas · {readiness.mediaReady ? "Pronto" : "Pendente"}</strong></div>
      <div><span>Precificação</span><strong>{readiness.pricingReady ? BRL_CURRENCY.format(askingPrice) : "Pendente"}</strong></div>
      <div><span>Publicação</span><strong>{readiness.publicationStatus}</strong></div>
      <div><span>Início / finalização</span><strong>{readiness.publicationStartedAt?.toLocaleDateString("pt-BR") || "Não iniciada"} · {readiness.publicationEndedAt?.toLocaleDateString("pt-BR") || "Em aberto"}</strong></div>
      <div><span>Aging</span><strong>{inventoryAgeDays} dia(s)</strong></div>
      <div><span>Próxima ação operacional</span><strong>{readiness.nextAction}</strong></div>
    </div>
  </section>;
}
