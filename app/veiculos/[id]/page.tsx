import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { vehicleDataProvenance, vehicleEvidenceObservations } from "../../../db/vehicle-intelligence-schema";
import { vehicles } from "../../../db/vehicle-schema";
import { partners } from "../../../db/partner-schema";
import { crmUsers, sellerProfiles, tradeIns, vehicleMatches } from "../../../db/schema";
import { commercialCases, customers, proposals } from "../../../db/pilot-schema";
import { stateLabel } from "../../../lib/locations/br-locations";
import { parseVehicleOptionalItems } from "../../../lib/vehicles/vehicle-optionals";
import { buildTradeInDecision } from "../../../lib/vehicles/managerial-decision";
import { getInventoryReadiness } from "../../../lib/vehicles/inventory-readiness";
import { attachVehicleProvenance } from "../../../lib/vehicle-intelligence/provenance";
import { calculateVehicleIntelligence } from "../../../lib/vehicle-intelligence/scoring";
import { InventoryShell } from "../../../features/vehicle-registry/components/InventoryShell";
import { VehicleCreateForm } from "../../../features/vehicle-registry/components/VehicleCreateForm";
import { VehicleIntelligenceScores } from "../../../features/vehicle-registry/components/VehicleIntelligenceScores";
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
const lifecycleLabels: Record<string, string> = { PENDING_ENTRY: "Entrada pendente", IN_STOCK: "Em estoque", PREPARATION: "Preparação", READY: "Pronto", PUBLISHED: "Publicado", AVAILABLE: "Disponível", RESERVED: "Reservado", SOLD: "Vendido", DELIVERED: "Entregue" };

async function getTradeInHistory(opportunityId: string) {
  const [row] = await getDb()
    .select({
      opportunity: tradeIns,
      caseId: commercialCases.id,
      pilotCode: commercialCases.pilotCode,
      previousOwner: customers.name,
      entryDate: commercialCases.openedAt,
      creditedValue: proposals.tradeInCredit,
      responsibleUser: crmUsers.name,
    })
    .from(tradeIns)
    .leftJoin(commercialCases, eq(commercialCases.opportunityId, tradeIns.id))
    .leftJoin(customers, eq(commercialCases.customerId, customers.id))
    .leftJoin(sellerProfiles, eq(commercialCases.sellerProfileId, sellerProfiles.id))
    .leftJoin(crmUsers, eq(sellerProfiles.crmUserId, crmUsers.id))
    .leftJoin(proposals, and(eq(proposals.caseId, commercialCases.id), eq(proposals.status, "accepted")))
    .where(eq(tradeIns.id, opportunityId))
    .limit(1);
  return row ?? null;
}

function TradeInOrigin({ history, stockStatus, entryDate }: { history: NonNullable<Awaited<ReturnType<typeof getTradeInHistory>>>; stockStatus: string; entryDate?: string }) {
  const appraisal = history.opportunity.estimatedMax || history.opportunity.referencePrice || 0;
  const credited = history.creditedValue || 0;
  const difference = credited && appraisal ? credited - appraisal : null;
  return <section className={styles.card}>
    <header><div><span>ORIGEM / HISTÓRICO DE ENTRADA</span><h2>Entrada por troca</h2></div></header>
    <div className={styles.kv}>
      <div><span>Tipo de entrada</span><strong>Troca</strong></div>
      <div><span>Negociação de origem</span><strong>{history.caseId ? <Link href={`/casos/${history.caseId}`}>{history.pilotCode || history.caseId}</Link> : "Não vinculada"}</strong></div>
      <div><span>Proprietário anterior</span><strong>{history.previousOwner || history.opportunity.name || "Não registrado"}</strong></div>
      <div><span>Data de entrada</span><strong>{entryDate || history.entryDate?.toLocaleDateString("pt-BR") || "Entrada pendente"}</strong></div>
      <div><span>Valor de avaliação</span><strong>{appraisal ? money.format(appraisal) : "Não registrado"}</strong></div>
      <div><span>Crédito usado no negócio</span><strong>{credited ? money.format(credited) : "Não registrado"}</strong></div>
      <div><span>Diferença</span><strong>{difference == null ? "Não aplicável" : `${difference > 0 ? "+" : ""}${money.format(difference)}`}</strong></div>
      <div><span>Avaliador / responsável</span><strong>{history.responsibleUser || "Não registrado"}</strong></div>
      <div><span>Status atual no estoque</span><strong>{stockStatus}</strong></div>
    </div>
  </section>;
}

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
  if (!vehicle) {
    const pendingTradeIn = await getTradeInHistory(id);
    if (!pendingTradeIn) notFound();
    const pendingReturnHref = returnTo?.startsWith("/casos/") ? returnTo : pendingTradeIn.caseId ? `/casos/${pendingTradeIn.caseId}` : "/trocas";
    const trade = pendingTradeIn.opportunity;
    return <InventoryShell breadcrumb={<><Link href="/crm">Mission Control</Link><b>›</b><Link href="/trocas">Trocas</Link><b>›</b><span>{trade.brand} {trade.model}</span></>}>
      <div className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>VEÍCULO DE TROCA</p><h1>{trade.brand} {trade.model}</h1><p>{[trade.version, trade.year].filter(Boolean).join(" · ")} · entrada no estoque pendente</p></div>
        <div className={styles.pageActions}><Link href={pendingReturnHref}>← Voltar à negociação</Link></div>
      </div>
      <section className={styles.vehicleHero}>
        <div className={styles.vehiclePhoto}>{trade.brand.slice(0, 1)}{trade.model.slice(0, 1)}</div>
        <div className={styles.vehicleIdentity}><span className={styles.statusBadge} data-status="evaluation">Entrada pendente</span><h2>{trade.brand} {trade.model}</h2><p>{trade.year} · {trade.mileage.toLocaleString("pt-BR")} km · placa não registrada</p></div>
        <div className={styles.heroValues}><div><span>Avaliação</span><strong>{money.format(trade.estimatedMax || trade.referencePrice || 0)}</strong></div><div><span>Crédito no negócio</span><strong>{pendingTradeIn.creditedValue ? money.format(pendingTradeIn.creditedValue) : "Não registrado"}</strong></div></div>
      </section>
      <div className={styles.vehicleDetailLayout}>
        <div className={styles.detailStack}>
          <TradeInOrigin history={pendingTradeIn} stockStatus="Pendente de entrada no estoque" />
          <section className={styles.card}><header><div><span>IDENTIFICAÇÃO DISPONÍVEL</span><h2>Dados da avaliação</h2></div></header><div className={styles.kv}><div><span>Marca / modelo</span><strong>{trade.brand} {trade.model}</strong></div><div><span>Versão</span><strong>{trade.version || "Não registrada"}</strong></div><div><span>Ano</span><strong>{trade.year || "Não registrado"}</strong></div><div><span>Quilometragem</span><strong>{trade.mileage.toLocaleString("pt-BR")} km</strong></div><div><span>Condição</span><strong>{trade.condition || "Não registrada"}</strong></div><div><span>Placa</span><strong>Não registrada</strong></div></div></section>
        </div>
        <aside className={styles.detailAside}><section className={styles.card}><header><div><span>STATUS CANÔNICO</span><h2>Entrada no estoque</h2></div></header><p className={styles.notesValue}>A troca possui avaliação e vínculo comercial, mas ainda não possui registro de estoque. Este detalhe usa o registro canônico existente e não cria outro veículo.</p></section></aside>
      </div>
    </InventoryShell>;
  }

  const vehicleMatchRows = await getDb().select({ sourceId: vehicleMatches.sourceId, sourceType: vehicleMatches.sourceType }).from(vehicleMatches).where(eq(vehicleMatches.vehicleId, id));
  const tradeInMatch = vehicleMatchRows.find((match) => match.sourceType === "trade_in");
  const tradeInHistory = tradeInMatch ? await getTradeInHistory(tradeInMatch.sourceId) : null;
  const currentCommercialCases = await getDb().select({ id: commercialCases.id, pilotCode: commercialCases.pilotCode, customerId: commercialCases.customerId, customerName: customers.name, status: commercialCases.status }).from(commercialCases).leftJoin(customers, eq(commercialCases.customerId, customers.id)).where(eq(commercialCases.vehicleId, id));
  const inventoryReadiness = await getInventoryReadiness(id);

  const [provenanceRows, observationRows] = await Promise.all([
    getDb().select().from(vehicleDataProvenance).where(eq(vehicleDataProvenance.vehicleId, id)),
    getDb().select().from(vehicleEvidenceObservations).where(eq(vehicleEvidenceObservations.vehicleId, id)),
  ]);

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
  const rawAgeBase = vehicle.entryAt || (vehicle.acquisitionDate ? new Date(`${vehicle.acquisitionDate}T00:00:00`) : vehicle.createdAt);
  const rawAgeBaseTime = rawAgeBase.getTime();
  const ageBaseTime = Number.isFinite(rawAgeBaseTime) ? rawAgeBaseTime : vehicle.createdAt.getTime();
  const inventoryAgeDays = Math.max(0, Math.floor((new Date().getTime() - ageBaseTime) / 86_400_000));
  const managerialDecision = buildTradeInDecision({ appraisalValue: vehicle.appraisalValue || tradeInHistory?.opportunity.estimatedMax || vehicle.fipeValue, creditedValue: vehicle.creditedPaidValue || tradeInHistory?.creditedValue || 0, projectedAcquisitionCost: totalCost, askingPrice: asking, existingMatches: vehicleMatchRows.length, openOpportunities: currentCommercialCases.filter((item) => !["closed", "lost", "cancelled"].includes(item.status)).length, inventoryAgeDays, likelyNextSale: currentCommercialCases[0]?.customerName ? `Próximo ciclo associado ao cliente interessado ${currentCommercialCases[0].customerName}.` : null, lifecycleState: vehicle.lifecycleStatus, lifecycleBlockers: inventoryReadiness.blockers, operationalNextAction: inventoryReadiness.nextAction });
  const optionalItems = parseVehicleOptionalItems(vehicle.optionalItems);
  const intelligenceScores = calculateVehicleIntelligence(attachVehicleProvenance(vehicle, provenanceRows, observationRows));

  const fallbackHref = `/veiculos?scope=${vehicle.inventoryScope === "partner" ? "partner" : "autoponte"}`;
  const returnHref =
    returnTo &&
    (returnTo.startsWith("/veiculos?") ||
      returnTo.startsWith("/trocas?") ||
      returnTo.startsWith("/casos/") ||
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
          <Link href={returnHref}>{returnHref.startsWith("/casos/") ? "Voltar à negociação" : "Voltar ao estoque"}</Link>
          <Link href={editHref}>Editar veículo</Link>
          {partner ? <Link href={`/parceiros/${partner.id}`}>Abrir parceiro</Link> : null}
          <Link className={styles.primaryAction} href="/oportunidades/nova">Criar oportunidade</Link>
        </div>
      </div>

      <section className={styles.vehicleHero}>
        <div className={styles.vehiclePhoto}>{vehicle.brand.slice(0, 1)}{vehicle.model.slice(0, 1)}</div>
        <div className={styles.vehicleIdentity}>
          <span className={styles.statusBadge} data-status={vehicle.status}>
            {lifecycleLabels[vehicle.lifecycleStatus] ?? vehicle.lifecycleStatus}
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
            <header><div><span>ORIGEM / HISTÓRICO</span><h2>Proveniência permanente</h2></div></header>
            <div className={styles.kv}>
              <div><span>Origem canônica</span><strong>{vehicle.origin}</strong></div>
              <div><span>Cliente / proprietário anterior</span><strong>{tradeInHistory?.previousOwner || vehicle.ownerName || "Não informado"}</strong></div>
              <div><span>Negociação de origem</span><strong>{vehicle.sourceCaseId ? <Link href={`/casos/${vehicle.sourceCaseId}`}>{vehicle.sourceCaseId}</Link> : tradeInHistory?.caseId || "Não vinculada"}</strong></div>
              <div><span>Data de entrada</span><strong>{vehicle.entryAt?.toLocaleDateString("pt-BR") || vehicle.acquisitionDate || "Não informada"}</strong></div>
              <div><span>Avaliação</span><strong>{money.format(vehicle.appraisalValue || tradeInHistory?.opportunity.estimatedMax || 0)}</strong></div>
              <div><span>Valor creditado / pago</span><strong>{money.format(vehicle.creditedPaidValue || tradeInHistory?.creditedValue || 0)}</strong></div>
              <div><span>Custo de aquisição</span><strong>{money.format(vehicle.acquisitionCost)}</strong></div>
              <div><span>Estado atual</span><strong>{lifecycleLabels[vehicle.lifecycleStatus] ?? vehicle.lifecycleStatus}</strong></div>
            </div>
          </section>

          <section className={styles.card}>
            <header><div><span>ATIVIDADE COMERCIAL ATUAL</span><h2>Novo ciclo comercial</h2></div></header>
            <p className={styles.notesValue}>A origem e o proprietário anterior são somente históricos. Todo novo Match, oportunidade, proposta e negociação deve vincular o novo cliente interessado.</p>
            <div className={styles.kv}>{currentCommercialCases.length ? currentCommercialCases.map((item) => <div key={item.id}><span>{item.status}</span><strong><Link href={`/casos/${item.id}`}>{item.customerName || item.customerId || item.pilotCode}</Link></strong></div>) : <div><span>Negociações atuais</span><strong>Nenhuma</strong></div>}</div>
          </section>

          <section className={styles.card}>
            <header><div><span>ATIVIDADE OPERACIONAL ATUAL</span><h2>{lifecycleLabels[vehicle.lifecycleStatus] ?? vehicle.lifecycleStatus}</h2></div></header>
            <div className={styles.kv}>
              <div><span>Bloqueadores</span><strong>{inventoryReadiness.blockers.length ? inventoryReadiness.blockers.join(" · ") : "Nenhum"}</strong></div>
              <div><span>Documentação</span><strong>{inventoryReadiness.documentationReady ? "Pronta" : "Pendente"}</strong></div>
              <div><span>Manutenção</span><strong>{inventoryReadiness.maintenanceReady ? "Pronta" : `${inventoryReadiness.openWorkOrders} ordem(ns) aberta(s)`}</strong></div>
              <div><span>VQI</span><strong>{!inventoryReadiness.vqiRequired ? "Não exigido" : inventoryReadiness.vqiReady ? "Concluído" : "Pendente"}</strong></div>
              <div><span>Fotos / mídia</span><strong>{inventoryReadiness.approvedPhotos} aprovadas · {inventoryReadiness.mediaReady ? "Pronto" : "Pendente"}</strong></div>
              <div><span>Precificação</span><strong>{inventoryReadiness.pricingReady ? money.format(asking) : "Pendente"}</strong></div>
              <div><span>Publicação</span><strong>{inventoryReadiness.publicationStatus}</strong></div>
              <div><span>Início / finalização</span><strong>{inventoryReadiness.publicationStartedAt?.toLocaleDateString("pt-BR") || "Não iniciada"} · {inventoryReadiness.publicationEndedAt?.toLocaleDateString("pt-BR") || "Em aberto"}</strong></div>
              <div><span>Aging</span><strong>{inventoryAgeDays} dia(s)</strong></div>
              <div><span>Próxima ação operacional</span><strong>{inventoryReadiness.nextAction}</strong></div>
            </div>
          </section>
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

          {tradeInHistory ? <TradeInOrigin history={tradeInHistory} stockStatus={statusLabels[vehicle.status] ?? vehicle.status} entryDate={vehicle.acquisitionDate} /> : null}

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
          <VehicleIntelligenceScores scores={intelligenceScores} />
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
            <span>IA GERENCIAL</span>
            <h3>Recomendação: {managerialDecision.recommendation}</h3>
            <p><strong>RISK:</strong> {managerialDecision.risk}.</p>
            <p><strong>Impacto financeiro:</strong> {managerialDecision.financialImpact}</p>
            <p><strong>Oportunidade futura:</strong> {managerialDecision.futureOpportunity}</p>
            <p><strong>Confiança:</strong> {managerialDecision.confidence}%.</p>
            <p><strong>Razões:</strong> {managerialDecision.reasons.join(" · ")}.</p>
            <p><strong>Ação alternativa:</strong> {managerialDecision.alternativeAction}</p>
          </section>
        </aside>
      </div>
    </InventoryShell>
  );
}
