import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { vehicles } from "../../../db/vehicle-schema";
import { partners } from "../../../db/partner-schema";
import { stateLabel } from "../../../lib/locations/br-locations";
import { parseVehicleOptionalItems } from "../../../lib/vehicles/vehicle-optionals";
import { InventoryShell } from "../../../features/vehicle-registry/components/InventoryShell";
import { VehicleCreateForm } from "../../../features/vehicle-registry/components/VehicleCreateForm";
import styles from "../../../features/vehicle-registry/components/VehicleRegistry.module.css";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const sourceLabels: Record<string, string> = {
  dealer_inventory: "Estoque de loja",
  consignment: "Consignação",
  trade_in: "Veículo de troca",
  autoponte_inventory: "Estoque AutoPonte",
  partner_inventory: "Estoque parceiro",
  new_vehicle: "Veículo 0 km",
};
const statusLabels: Record<string, string> = {
  available: "Disponível",
  evaluation: "Em avaliação",
  reserved: "Reservado",
  sold: "Vendido",
  unavailable: "Indisponível",
};

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string; edit?: string; updated?: string }>;
}) {
  const { id } = await params;
  const { returnTo, edit, updated } = await searchParams;
  await requireChatGPTUser(`/veiculos/${id}`);

  const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle) notFound();

  const [partner] = vehicle.partnerId
    ? await getDb().select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.id, vehicle.partnerId)).limit(1)
    : [];
  const partnerRows = await getDb()
    .select({ id: partners.id, name: partners.name })
    .from(partners)
    .where(eq(partners.status, "active"))
    .limit(500);

  const asking = vehicle.askingPrice || vehicle.fipeValue || 0;
  const additionalCosts = vehicle.additionalCosts || 0;
  const totalCost = (vehicle.acquisitionCost || 0) + additionalCosts;
  const margin = asking - totalCost;
  const marginPercent = asking > 0 ? (margin / asking) * 100 : null;
  const optionalItems = parseVehicleOptionalItems(vehicle.optionalItems);

  const fallbackHref = `/veiculos?scope=${vehicle.inventoryScope === "partner" ? "partner" : "autoponte"}`;
  const returnHref =
    returnTo &&
    (returnTo.startsWith("/veiculos?") ||
      returnTo.startsWith("/trocas?") ||
      returnTo.startsWith("/parceiros/"))
      ? returnTo
      : fallbackHref;
  const isEditing = edit === "1";
  const detailHref = `/veiculos/${id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  const editHref = `/veiculos/${id}?edit=1${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  if (isEditing) {
    return (
      <InventoryShell
        breadcrumb={
          <>
            <Link href="/crm">Mission Control</Link>
            <b>›</b>
            <Link href="/veiculos">Estoque</Link>
            <b>›</b>
            <span>Editar veículo</span>
          </>
        }
      >
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>VEÍCULO</p>
            <h1>Editar {vehicle.brand} {vehicle.model}</h1>
            <p>Atualize os dados cadastrais sem alterar o relacionamento do veículo.</p>
          </div>
          <div className={styles.pageActions}>
            <Link href="/crm">← Voltar ao CRM</Link>
            <Link href={detailHref}>Cancelar edição</Link>
          </div>
        </div>
        <VehicleCreateForm
          mode="edit"
          vehicleId={id}
          cancelHref={detailHref}
          partners={partnerRows}
          initialData={{
            inventoryScope: vehicle.inventoryScope === "partner" ? "partner" : "autoponte",
            partnerId: vehicle.partnerId,
            sourceType: vehicle.sourceType,
            status: vehicle.status,
            plate: vehicle.plate,
            chassis: vehicle.chassis,
            stockCode: vehicle.stockCode,
            mileage: vehicle.mileage,
            color: vehicle.color,
            transmission: vehicle.transmission,
            bodyType: vehicle.bodyType,
            doors: vehicle.doors,
            engine: vehicle.engine,
            power: vehicle.power,
            renavam: vehicle.renavam,
            registrationState: vehicle.registrationState,
            city: vehicle.city,
            vehicleCondition: vehicle.vehicleCondition,
            documentStatus: vehicle.documentStatus,
            inspectionStatus: vehicle.inspectionStatus,
            acquisitionDate: vehicle.acquisitionDate,
            listingDate: vehicle.listingDate,
            optionalItems: vehicle.optionalItems,
            ownerName: vehicle.ownerName,
            askingPrice: vehicle.askingPrice,
            acquisitionCost: vehicle.acquisitionCost,
            additionalCosts: vehicle.additionalCosts,
            notes: vehicle.notes,
            fipe: {
              brandCode: vehicle.brandCode,
              modelCode: vehicle.modelCode,
              yearCode: vehicle.yearCode,
              brand: vehicle.brand,
              model: vehicle.model,
              modelYear: vehicle.modelYear,
              fuel: vehicle.fuel,
              fipeCode: vehicle.fipeCode,
              referenceMonth: vehicle.fipeReferenceMonth,
              price: vehicle.fipeValue,
            },
          }}
        />
      </InventoryShell>
    );
  }
  return (
    <InventoryShell
      breadcrumb={
        <>
          <Link href="/crm">Mission Control</Link>
          <b>›</b>
          <Link href="/veiculos">Estoque</Link>
          <b>›</b>
          <span>{vehicle.brand} {vehicle.model}</span>
        </>
      }
    >
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>VEÍCULO</p>
          <h1>{vehicle.brand} {vehicle.model}</h1>
          <p>{vehicle.modelYear} · {vehicle.fuel} · FIPE {vehicle.fipeCode}</p>
          {updated === "1" ? <p className={styles.muted}>Veículo atualizado com sucesso.</p> : null}
        </div>
        <div className={styles.pageActions}>
          <Link href="/crm">← Voltar ao CRM</Link>
          <Link href={returnHref}>Voltar ao estoque</Link>
          <Link href={editHref}>Editar veículo</Link>
          {partner ? <Link href={`/parceiros/${partner.id}`}>Abrir parceiro</Link> : null}
          <Link className={styles.primaryAction} href="/oportunidades/nova">Criar oportunidade</Link>
        </div>
      </div>

      <section className={styles.vehicleHero}>
        <div className={styles.vehiclePhoto}>{vehicle.brand.slice(0, 1)}{vehicle.model.slice(0, 1)}</div>
        <div className={styles.vehicleIdentity}>
          <span className={styles.statusBadge} data-status={vehicle.status}>
            {statusLabels[vehicle.status] ?? vehicle.status}
          </span>
          <h2>{vehicle.brand} {vehicle.model}</h2>
          <p>{vehicle.plate || "Placa não informada"} · {vehicle.color || "Cor não informada"} · {vehicle.mileage.toLocaleString("pt-BR")} km</p>
        </div>
        <div className={styles.heroValues}>
          <div><span>Preço de venda</span><strong>{money.format(asking)}</strong></div>
          <div><span>Custo total</span><strong>{money.format(totalCost)}</strong></div>
          <div><span>Margem bruta estimada</span><strong>{money.format(margin)}</strong></div>
        </div>
      </section>

      <div className={styles.vehicleDetailLayout}>
        <div className={styles.detailStack}>
          <section className={styles.card}>
            <header><div><span>IDENTIFICAÇÃO</span><h2>Dados do veículo</h2></div></header>
            <div className={styles.kv}>
              <div><span>Placa</span><strong>{vehicle.plate || "Não informada"}</strong></div>
              <div><span>RENAVAM</span><strong>{vehicle.renavam || "Não informado"}</strong></div>
              <div><span>Chassi</span><strong>{vehicle.chassis || "Não informado"}</strong></div>
              <div><span>Código interno</span><strong>{vehicle.stockCode || "Não informado"}</strong></div>
              <div><span>Quilometragem</span><strong>{vehicle.mileage.toLocaleString("pt-BR")} km</strong></div>
              <div><span>Cor</span><strong>{vehicle.color || "Não informada"}</strong></div>
              <div><span>Câmbio</span><strong>{vehicle.transmission || "Não informado"}</strong></div>
              <div><span>Carroceria</span><strong>{vehicle.bodyType || "Não informada"}</strong></div>
              <div><span>Motor / potência</span><strong>{[vehicle.engine, vehicle.power].filter(Boolean).join(" · ") || "Não informado"}</strong></div>
              <div><span>Proprietário / loja</span><strong>{vehicle.ownerName || "Não informado"}</strong></div>
            </div>
          </section>

          <section className={styles.card}>
            <header><div><span>LOCALIZAÇÃO E DATAS</span><h2>Origem operacional</h2></div></header>
            <div className={styles.kv}>
              <div><span>Estoque</span><strong>{vehicle.inventoryScope === "partner" ? "Parceiro" : "AutoPonte"}</strong></div>
              <div><span>Parceiro</span><strong>{partner?.name || "Não aplicável"}</strong></div>
              <div><span>Origem</span><strong>{sourceLabels[vehicle.sourceType] ?? vehicle.sourceType}</strong></div>
              <div><span>UF</span><strong>{vehicle.registrationState ? stateLabel(vehicle.registrationState) : "Não informada"}</strong></div>
              <div><span>Cidade</span><strong>{vehicle.city || "Não informada"}</strong></div>
              <div><span>Data de entrada / aquisição</span><strong>{vehicle.acquisitionDate || "Não informada"}</strong></div>
              <div><span>Data do anúncio</span><strong>{vehicle.listingDate || "Não informada"}</strong></div>
            </div>
          </section>

          <section className={styles.card}>
            <header><div><span>CONDIÇÃO</span><h2>Documentação, preparação e opcionais</h2></div></header>
            <div className={styles.kv}>
              <div><span>Condição</span><strong>{vehicle.vehicleCondition || "Não informada"}</strong></div>
              <div><span>Documentação</span><strong>{vehicle.documentStatus || "Não informada"}</strong></div>
              <div><span>Vistoria</span><strong>{vehicle.inspectionStatus || "Não informada"}</strong></div>
            </div>
            <div className={styles.optionalReadOnly}>
              <span>Opcionais</span>
              <div className={styles.optionalChips}>
                {optionalItems.length === 0 ? <span className={styles.optionalHint}>Não informados</span> : null}
                {optionalItems.map((item) => (
                  <span key={`optional-${item}`} className={styles.optionalChipReadOnly}>{item}</span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.detailAside}>
          <section className={styles.card}>
            <header><div><span>COMERCIAL</span><h2>Valores e margem</h2></div></header>
            <div className={styles.compactKv}>
              <div><span>Preço de venda</span><strong>{money.format(asking)}</strong></div>
              <div><span>Valor FIPE</span><strong>{money.format(vehicle.fipeValue)}</strong></div>
              <div><span>Custo de aquisição</span><strong>{money.format(vehicle.acquisitionCost || 0)}</strong></div>
              <div><span>Custos adicionais</span><strong>{money.format(additionalCosts)}</strong></div>
              <div><span>Custo total</span><strong>{money.format(totalCost)}</strong></div>
              <div><span>Margem bruta estimada</span><strong>{money.format(margin)}</strong></div>
              <div><span>Margem %</span><strong>{marginPercent === null ? "—" : `${marginPercent.toFixed(2)}%`}</strong></div>
            </div>
          </section>
          <section className={styles.card}>
            <header><div><span>OBSERVAÇÕES COMERCIAIS</span><h2>Anotações internas</h2></div></header>
            <p className={styles.notesValue}>{vehicle.notes || "Sem observações comerciais."}</p>
          </section>
          <section className={styles.recommendationCard}>
            <span>RECOMENDAÇÃO EXPLICADA</span>
            <h3>Aguardar dados de demanda compatível</h3>
            <p><strong>Por que agora:</strong> o cadastro do veículo está ativo, mas o motor de matches ainda não está conectado a esta página.</p>
            <p><strong>Impacto esperado:</strong> após a integração, esta área mostrará compradores compatíveis, urgência e ação recomendada com evidência.</p>
          </section>
        </aside>
      </div>
    </InventoryShell>
  );
}
