"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./workspace.module.css";
import refinements from "./refinements.module.css";

type Json = Record<string, unknown>;
type TimelineRow = { id: string; at: unknown; event: string; summary: string; owner: string; value: string };

const money = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(value) || 0);
const when = (value: unknown) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(value))) : "Não informado";
const dateOnly = (value: unknown) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(String(value))) : "Não informado";
const label = (value: unknown) => String(value || "Não informado").replaceAll("_", " ");
const latest = (rows: Json[], fields: string[]) => rows.reduce<unknown>((current, row) => {
  const value = fields.map((field) => row[field]).find(Boolean);
  return !current || (value && new Date(String(value)) > new Date(String(current))) ? value : current;
}, null);
const actorName = (metadata: unknown) => {
  const actor = (metadata && typeof metadata === "object" ? (metadata as Json).actor : null) as Json | null;
  return String(actor?.name || actor?.displayName || "Não informado");
};
const reasonLabel: Record<string, string> = {
  budget_fit: "Dentro do orçamento", preferred_model: "Modelo preferido", year_fit: "Ano compatível",
  mileage_fit: "Quilometragem adequada", price_fit: "Preço compatível", preference_fit: "Atende às preferências",
};
const eventLabel: Record<string, string> = {
  acquisition: "Aquisição", documentation: "Documentação", vehicle_preparation: "Preparação",
  inventory_entry: "Entrada no estoque", pricing: "Precificação", publication: "Publicação",
  lead_generated: "Lead", match_candidate: "Recomendação", "proposal.create": "Proposta criada",
  "proposal.transition": "Decisão da proposta", "payment.create": "Pagamento registrado",
  "payment.transition": "Pagamento atualizado", "contract.create": "Contrato criado",
  "contract.transition": "Contrato atualizado", "delivery.schedule": "Entrega agendada",
  "delivery.complete": "Entrega concluída", "post_sale.schedule": "Pós-venda agendado",
  "post_sale.complete": "Pós-venda concluído", "work_order.create": "Serviço aberto",
  "work_order.transition": "Serviço atualizado",
};
const taskLabel: Record<string, string> = {
  CONTACT_CUSTOMER: "Contatar cliente", REQUEST_DOCUMENTS: "Solicitar documentos",
  REVIEW_PROPOSAL: "Revisar proposta", SCHEDULE_FOLLOW_UP: "Agendar acompanhamento",
  MARK_CASE_LOST: "Marcar caso como perdido",
};

export default function CaseWorkspace({ initialData }: { initialData: Json }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const caseData = data.case as Json;
  const customer = data.customer as Json;
  const vehicle = data.vehicle as Json;
  const matches = Array.isArray(data.matches) ? data.matches as Json[] : [];
  const costs = Array.isArray(data.costs) ? data.costs as Json[] : [];
  const work = Array.isArray(data.workOrders) ? data.workOrders as Json[] : [];
  const publications = Array.isArray(data.publications) ? data.publications as Json[] : [];
  const proposals = Array.isArray(data.proposals) ? data.proposals as Json[] : [];
  const contracts = Array.isArray(data.contracts) ? data.contracts as Json[] : [];
  const payments = Array.isArray(data.payments) ? data.payments as Json[] : [];
  const deliveries = Array.isArray(data.deliveries) ? data.deliveries as Json[] : [];
  const followups = Array.isArray(data.followups) ? data.followups as Json[] : [];
  const lifecycle = Array.isArray(data.timeline) ? data.timeline as Json[] : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks as Json[] : [];
  const canonicalNextAction = data.nextAction as Json | null;
  const intents = Array.isArray(data.intents) ? data.intents as Json[] : [];
  const opportunity = data.opportunity as Json | null;
  const tradeInVehicle = data.tradeInVehicle as Json | null;
  const id = String(caseData.id);

  const eligibleMatches = matches.filter((match) => match.hardConstraintPass !== false);
  const discardedMatches = matches.filter((match) => match.hardConstraintPass === false);
  const selectedMatch = eligibleMatches.find((match) => ["selected", "converted", "proposal_accepted"].includes(String(match.status))) ?? eligibleMatches[0];
  const acceptedProposal = proposals.find((proposal) => proposal.status === "accepted");
  const currentProposal = acceptedProposal ?? proposals.find((proposal) => !["rejected", "expired", "lost"].includes(String(proposal.status))) ?? proposals[0];
  const acceptedPayment = acceptedProposal ? payments.find((payment) => payment.proposalId === acceptedProposal.id) : undefined;
  const currentPayment = acceptedPayment ?? payments.find((payment) => payment.proposalId === currentProposal?.id) ?? payments[0];
  const currentContract = contracts.find((contract) => contract.proposalId === currentProposal?.id) ?? contracts[0];
  const currentPublication = publications[0];
  const currentDelivery = deliveries[0];
  const currentFollowup = followups[0];
  const pendingWork = work.find((item) => ["open", "in_progress"].includes(String(item.status)));
  const pendingPayment = payments.find((payment) => payment.status === "pending");
  const isSold = caseData.finalOutcome === "sold";
  const isLost = caseData.status === "lost" || ["negotiation_lost", "proposal_rejected"].includes(String(caseData.finalOutcome));
  const documentBlocked = !["regular", "approved"].includes(String(vehicle.documentStatus));
  const blocker = isSold || isLost ? "Sem bloqueio · encerrada" : documentBlocked ? `Documentação ${label(vehicle.documentStatus)}` : pendingWork ? `Serviço: ${String(pendingWork.description || pendingWork.workType)}` : pendingPayment ? `Pagamento ${money(pendingPayment.amount)}` : "Sem bloqueio registrado";
  const advertisedPrice = currentPublication?.askingPrice ?? vehicle.askingPrice;
  const closingValue = isSold && acceptedProposal ? acceptedProposal.totalAmount : null;
  const discountValue = advertisedPrice && closingValue ? Math.max(0, Number(advertisedPrice) - Number(closingValue)) : null;
  const cashBalance = acceptedProposal ? Math.max(0, Number(acceptedProposal.totalAmount || 0) - Number(acceptedProposal.downPayment || 0) - Number(acceptedProposal.tradeInCredit || 0) - Number(acceptedProposal.financedAmount || 0)) : null;
  const paymentActorEvent = acceptedPayment ? lifecycle.find((event) => String(event.eventType).startsWith("payment.") && (event.metadata as Json | undefined)?.entityId === acceptedPayment.id) ?? lifecycle.find((event) => String(event.eventType).startsWith("payment.")) : undefined;
  const approvedBy = paymentActorEvent ? actorName(paymentActorEvent.metadata) : "Não informado";
  const publicationStart = currentPublication?.publishedAt || currentPublication?.createdAt;
  const publicationEnd = currentPublication?.endedAt;
  const activeDays = publicationStart ? Math.max(1, Math.ceil(((publicationEnd ? new Date(String(publicationEnd)) : new Date()).getTime() - new Date(String(publicationStart)).getTime()) / 86400000)) : null;
  const matchInteractions = selectedMatch?.interactions as Json[] || [];
  const lastInteraction = lifecycle[0]?.occurredAt || latest([...matchInteractions, ...proposals, ...payments], ["occurredAt", "decidedAt", "proposedAt", "paidAt", "createdAt"]) || caseData.updatedAt;
  const customerIntent = intents[0];
  const intentPreferences = customerIntent?.preferences as Json | undefined;
  const preferredModels = Array.isArray(intentPreferences?.models) ? intentPreferences.models.map(String).join(" ou ") : "";
  const desiredVehicle = String(opportunity?.desiredVehicle || opportunity?.desiredModel || preferredModels || "");
  const hardConstraints = customerIntent?.hardConstraints as Json | undefined;
  const budgetMax = Number(opportunity?.desiredPriceMax || hardConstraints?.maxPrice || 0);
  const customerGoal = desiredVehicle ? `${desiredVehicle}${budgetMax ? `, com teto de ${money(budgetMax)}` : ""}` : budgetMax ? `um veÃ­culo de atÃ© ${money(budgetMax)}` : "requisitos registrados no perfil da negociaÃ§Ã£o";
  const alternativeMatches = eligibleMatches.filter((match) => match.id !== selectedMatch?.id);
  const acquisitionEvent = lifecycle.find((event) => event.eventType === "acquisition" && event.amount);
  const approvedNonAcquisitionCosts = costs.filter((cost) => cost.status === "approved" && cost.category !== "acquisition").reduce((total, cost) => total + Number(cost.amount || 0), 0);
  const acquisitionCost = Number(acquisitionEvent?.amount || vehicle.acquisitionCost || 0);
  const indicativeGross = closingValue && acquisitionCost ? Number(closingValue) - acquisitionCost - approvedNonAcquisitionCosts : null;
  const paymentComposition = acceptedProposal ? `entrada de ${money(acceptedProposal.downPayment)}, troca de ${money(acceptedProposal.tradeInCredit)} e ${money(acceptedProposal.financedAmount)} financiados${acceptedProposal.installments ? ` em ${acceptedProposal.installments}x` : ""}` : "composiÃ§Ã£o de pagamento ainda nÃ£o registrada";
  const hasTradeIn = Number(acceptedProposal?.tradeInCredit || 0) > 0 || caseData.acquisitionMode === "trade_in";
  const tradeInAppraisal = Number(vehicle.appraisalValue || opportunity?.estimatedMax || opportunity?.referencePrice || 0);
  const tradeInAccepted = Number(acceptedProposal?.tradeInCredit || (caseData.acquisitionMode === "trade_in" ? vehicle.creditedPaidValue : 0) || 0);
  const tradeInDifference = hasTradeIn && tradeInAppraisal ? tradeInAccepted - tradeInAppraisal : null;
  const tradeInImpactSummary = tradeInDifference == null ? "" : tradeInDifference > 0 ? ` A troca foi considerada ${money(tradeInDifference)} acima da avaliação, reduzindo o resultado nessa diferença.` : tradeInDifference < 0 ? ` A troca foi considerada ${money(Math.abs(tradeInDifference))} abaixo da avaliação, preservando o resultado nessa diferença.` : " A troca foi considerada pelo mesmo valor da avaliação.";
  const canonicalTradeIn = tradeInVehicle ?? (caseData.acquisitionMode === "trade_in" ? vehicle : null);
  const tradeInHref = canonicalTradeIn?.id ? `/veiculos/${String(canonicalTradeIn.id)}?returnTo=${encodeURIComponent(`/casos/${id}`)}` : null;

  const unifiedTimeline = useMemo(() => {
    const rows: TimelineRow[] = lifecycle.map((event) => ({
      id: String(event.id), at: event.occurredAt, event: eventLabel[String(event.eventType)] || label(event.eventType),
      summary: String(event.description || label(event.status)), owner: actorName(event.metadata),
      value: event.amount ? money(event.amount) : label(event.status),
    }));
    proposals.forEach((proposal) => rows.push({ id: `proposal-${proposal.id}`, at: proposal.decidedAt || proposal.proposedAt, event: "Proposta", summary: `#${proposal.sequence} · ${label(proposal.status)}`, owner: String(data.sellerName || "Não informado"), value: money(proposal.totalAmount) }));
    payments.forEach((payment) => rows.push({ id: `payment-${payment.id}`, at: payment.paidAt || payment.dueAt || payment.createdAt, event: "Pagamento / financiamento", summary: `${label(payment.paymentType)} · ${String(payment.provider || "Sem instituição")}`, owner: approvedBy, value: `${money(payment.amount)} · ${label(payment.status)}` }));
    contracts.forEach((contract) => rows.push({ id: `contract-${contract.id}`, at: contract.signedAt || contract.createdAt, event: "Contrato", summary: String(contract.contractNumber || label(contract.contractType)), owner: String(data.sellerName || "Não informado"), value: label(contract.status) }));
    deliveries.forEach((delivery) => rows.push({ id: `delivery-${delivery.id}`, at: delivery.deliveredAt || delivery.scheduledAt || delivery.createdAt, event: delivery.status === "delivered" ? "Entrega" : "Liberação / entrega", summary: String(delivery.notes || "Veículo e checklist"), owner: String(data.sellerName || "Não informado"), value: label(delivery.status) }));
    followups.forEach((followup) => rows.push({ id: `followup-${followup.id}`, at: followup.completedAt || followup.dueAt, event: "Pós-venda", summary: String(followup.outcome || followup.notes || "Acompanhamento"), owner: String(data.sellerName || "Não informado"), value: label(followup.status) }));
    return rows.filter((row) => row.at).sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime());
  }, [lifecycle, proposals, payments, contracts, deliveries, followups, data.sellerName, approvedBy]);

  async function act(payload: Json) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/cases/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Falha operacional."); setBusy(false); return; }
    const fresh = await fetch(`/api/cases/${id}`, { cache: "no-store" });
    setData(await fresh.json()); setMessage(result.title ?? "Operação concluída."); setBusy(false);
  }

  function newTask(): Json | null {
    const actionType = window.prompt("Tipo: CONTACT_CUSTOMER, REQUEST_DOCUMENTS, REVIEW_PROPOSAL, SCHEDULE_FOLLOW_UP ou MARK_CASE_LOST", "CONTACT_CUSTOMER")?.trim();
    const ownerId = String(data.sellerUserId || "");
    const dueAt = window.prompt("Prazo (data e hora ISO)", new Date(Date.now() + 86400000).toISOString())?.trim();
    if (!actionType || !ownerId || !dueAt) { setMessage(ownerId ? "A criação foi cancelada." : "O caso precisa de um vendedor responsável para criar ações."); return null; }
    return { type: "task.create", actionType, ownerId, dueAt, priority: window.prompt("Prioridade: LOW, NORMAL, HIGH ou URGENT", "NORMAL")?.trim() || "NORMAL", context: window.prompt("Contexto da ação", "")?.trim() || "" };
  }

  function completeTask(task: Json) {
    const result = window.prompt("Resultado da ação", "")?.trim(); if (!result) return;
    if (task.actionType === "MARK_CASE_LOST") { const lossReason = window.prompt("Motivo: PRICE, FINANCING, VEHICLE_MISMATCH, CUSTOMER_WITHDREW, BOUGHT_FROM_COMPETITOR, NO_RESPONSE ou OTHER", "OTHER")?.trim(); if (lossReason) void act({ type:"task.complete", id:task.id, result, lossReason, note:window.prompt("Observação", "")?.trim() || "", noNextActionReason:"" }); return; }
    const candidate = window.confirm("Deseja definir a próxima ação agora?") ? newTask() : null;
    const noNextActionReason = candidate ? "" : window.prompt("Por que o caso ficará sem próxima ação?", "")?.trim() || "";
    if (candidate || noNextActionReason) { const nextTask = { ...(candidate || {}) }; delete nextTask.type; void act({ type:"task.complete", id:task.id, result, nextTask:candidate ? nextTask : undefined, noNextActionReason, note:"" }); }
  }

  return <div className={styles.cockpit}>
    <section className={styles.executive} aria-label="Resumo executivo">
      <div className={styles.identity}><span>CLIENTE · {String(caseData.pilotCode || id)}</span><strong>{String(customer.name || "Não informado")}</strong><p>{String(vehicle.brand || "Veículo")} {String(vehicle.model || "não informado")} · {String(vehicle.modelYear || "Ano não informado")} · <b>{String(vehicle.plate || "Placa não informada")}</b></p></div>
      <Meta label="Status" value={label(caseData.finalOutcome || caseData.status)} />
      <Meta label="Vendedor" value={String(data.sellerName || "Não atribuído")} />
      <Meta label="Última interação" value={when(lastInteraction)} />
      <Meta label="Preço anunciado" value={advertisedPrice ? money(advertisedPrice) : "Não informado"} />
      <Meta label="Proposta aceita" value={acceptedProposal ? `#${acceptedProposal.sequence} · ${money(acceptedProposal.totalAmount)}` : "Nenhuma"} />
      <Meta label="Fechamento" value={closingValue ? money(closingValue) : "Não concluído"} />
      <div className={styles.next}><span>PRÓXIMA AÇÃO</span>{canonicalNextAction ? <><strong>{taskLabel[String(canonicalNextAction.actionType)] || label(canonicalNextAction.actionType)}</strong><small>{String(data.sellerName || canonicalNextAction.ownerId)} · até {when(canonicalNextAction.dueAt)} · {label(canonicalNextAction.priority)}</small><button disabled={busy} onClick={() => completeTask(canonicalNextAction)}>Concluir</button></> : <><strong>Sem próxima ação definida</strong><small>{String(caseData.noNextActionReason || "Registre a próxima ação do caso.")}</small><button disabled={busy || isSold || isLost} onClick={() => { const task = newTask(); if (task) void act(task); }}>Criar ação</button></>}</div>
      <div className={styles.blocker} data-alert={!isSold && !isLost && blocker !== "Sem bloqueio registrado"}><span>BLOQUEIO</span><strong>{blocker}</strong></div>
    </section>

    {message && <div className={styles.message}>{message}</div>}

    <section className={styles.paymentSummary}>
      <header><h2>Comercial e pagamento</h2><span>{acceptedPayment ? `${label(acceptedPayment.paymentType)} · ${label(acceptedPayment.status)}` : "Sem pagamento / aprovação"}</span></header>
      <div className={styles.summaryGrid}>
        <Meta label="Preço anunciado" value={advertisedPrice ? money(advertisedPrice) : "Não informado"} />
        <Meta label="Proposta aceita" value={acceptedProposal ? `#${acceptedProposal.sequence} · ${money(acceptedProposal.totalAmount)}` : "Nenhuma"} />
        <Meta label="Fechamento" value={closingValue ? `${money(closingValue)}${acceptedProposal && Number(acceptedProposal.totalAmount) === Number(closingValue) ? " · conforme proposta aceita" : ""}` : "Não concluído"} />
        <Meta label="Desconto sobre anúncio" value={discountValue == null ? "Não aplicável" : money(discountValue)} />
        <Meta label="Entrada" value={acceptedProposal ? money(acceptedProposal.downPayment) : "Não informado"} />
        <Meta label="Troca" value={acceptedProposal ? (hasTradeIn ? money(tradeInAccepted) : "Sem troca") : "Não informado"} />
        <Meta label="Financiado" value={acceptedProposal ? money(acceptedProposal.financedAmount) : "Não informado"} />
        <Meta label="Parcelas" value={acceptedProposal?.installments ? `${acceptedProposal.installments}x de ${money(acceptedProposal.installmentAmount)}` : "Não informado"} />
        <Meta label="Saldo à vista" value={cashBalance == null ? "Não informado" : money(cashBalance)} />
        <Meta label="Aprovação financeira" value={acceptedPayment ? label(acceptedPayment.status) : "Não informada"} />
        <Meta label="Instituição" value={String(acceptedPayment?.provider || "Não informada")} />
        <Meta label="Aprovado por" value={approvedBy === "Não informado" ? "não registrado" : approvedBy} subdued={approvedBy === "Não informado"} />
        <Meta label="Data da aprovação" value={acceptedPayment?.paidAt ? when(acceptedPayment.paidAt) : "Não informada"} />
      </div>
    </section>

    {hasTradeIn && opportunity && <section className={refinements.tradeInCard}>
      <header><div><span>TROCA</span><h2>Veículo relacionado</h2></div><Status value={tradeInVehicle?.status || opportunity.status} /></header>
      <div className={refinements.tradeInBody}>
        <div className={refinements.tradeInVehicle}>
          {tradeInHref ? <Link href={tradeInHref}><strong>{String(canonicalTradeIn?.brand || opportunity.brand)} {String(canonicalTradeIn?.model || opportunity.model)}{String(opportunity.version || "") && String(opportunity.version) !== String(opportunity.model) ? ` · ${String(opportunity.version)}` : ""}</strong><span>{String(canonicalTradeIn?.modelYear || opportunity.year)} · {String(canonicalTradeIn?.plate || "Placa não informada")}</span></Link> : <><strong>{String(opportunity.brand)} {String(opportunity.model)}</strong><span>{String(opportunity.year)} · Placa não informada</span></>}
        </div>
        <Meta label="Avaliação" value={tradeInAppraisal ? money(tradeInAppraisal) : "Não informada"} />
        <Meta label="Valor creditado" value={money(tradeInAccepted)} />
        <Meta label="Diferença" value={tradeInDifference == null ? "Não aplicável" : `${tradeInDifference > 0 ? "+" : ""}${money(tradeInDifference)}`} />
      </div>
    </section>}

    <section className={styles.stages} aria-label="Etapas da negociação">
      <Stage title="Veículo / recomendação" status={selectedMatch ? "recomendado" : "pendente"} updated={selectedMatch?.evaluatedAt || selectedMatch?.createdAt} lines={[`${String(vehicle.brand)} ${String(vehicle.model)} · ${String(vehicle.plate || "sem placa")}`, selectedMatch ? `Match Fit ${selectedMatch.matchFitScore ?? selectedMatch.score}` : "Sem recomendação"]} />
      <Stage title="Proposta" status={currentProposal?.status} updated={currentProposal?.decidedAt || currentProposal?.proposedAt} lines={[currentProposal ? `#${currentProposal.sequence} · ${money(currentProposal.totalAmount)}` : "Não iniciada", String(data.sellerName || "Não atribuído")]} />
      <Stage title="Pagamento" status={currentPayment?.status} updated={currentPayment?.paidAt || currentPayment?.createdAt} lines={[currentPayment ? `${label(currentPayment.paymentType)} · ${money(currentPayment.amount)}` : "Não registrado", String(currentPayment?.provider || "Sem instituição")]} />
      <Stage title="Documentação / contrato" status={currentContract?.status || vehicle.documentStatus} updated={currentContract?.signedAt || currentContract?.createdAt} lines={[`Documento ${label(vehicle.documentStatus)}`, currentContract ? `${String(currentContract.contractNumber || "Contrato")} · ${label(currentContract.status)}` : "Contrato não iniciado"]} />
      <Stage title="Publicação" status={currentPublication?.status} updated={currentPublication?.endedAt || currentPublication?.publishedAt} lines={[currentPublication ? `${dateOnly(publicationStart)} → ${publicationEnd ? dateOnly(publicationEnd) : "em aberto"}` : "Não publicada", currentPublication ? `${activeDays} dia(s) · ${money(currentPublication.askingPrice)}` : "Sem preço publicado"]} />
      <Stage title="Entrega / pós-venda" status={currentFollowup?.status || currentDelivery?.status} updated={currentFollowup?.completedAt || currentFollowup?.dueAt || currentDelivery?.deliveredAt || currentDelivery?.scheduledAt} lines={[currentDelivery ? `Entrega ${label(currentDelivery.status)} · ${dateOnly(currentDelivery.deliveredAt || currentDelivery.scheduledAt)}` : "Não agendada", currentFollowup ? `Pós-venda ${label(currentFollowup.status)} · ${dateOnly(currentFollowup.dueAt)}` : "Pós-venda não iniciado"]} />
    </section>

    <div className={styles.analysisGrid}>
      <section className={styles.matchCard}>
        <header><div><span>RECOMENDAÇÃO</span><h2>{String(selectedMatch?.vehicleLabel || "Sem veículo recomendado")}</h2></div><Status value={selectedMatch?.outcome || selectedMatch?.status} /></header>
        {selectedMatch && <><div className={styles.scoreRow}><Meta label="Match Fit" value={String(selectedMatch.matchFitScore ?? selectedMatch.score)} /><Meta label="Oportunidade" value={selectedMatch.opportunityScore == null ? "Não aplicável" : String(selectedMatch.opportunityScore)} /><Meta label="Desfecho" value={label(selectedMatch.outcome || selectedMatch.status)} /></div><ul>{((selectedMatch.reasons as string[]) || []).slice(0, 4).map((reason) => <li key={reason}>{reasonLabel[reason] || label(reason)}</li>)}</ul></>}
        <div className={styles.disclosures}><details><summary>Ver análise completa</summary><pre>{JSON.stringify({ restricoesAtendidas: selectedMatch?.hardConstraintPass, preferencias: selectedMatch?.preferencesSatisfied, desvios: selectedMatch?.softDeviations, vantagens: selectedMatch?.commercialAdvantages }, null, 2)}</pre></details><details><summary>Ver alternativas ({Math.max(0, eligibleMatches.length - 1)})</summary>{eligibleMatches.filter((match) => match.id !== selectedMatch?.id).map((match) => <p key={String(match.id)}>{String(match.vehicleLabel)} · Match Fit {String(match.matchFitScore ?? match.score)}</p>)}</details><details><summary>Ver descartados ({discardedMatches.length})</summary>{discardedMatches.map((match) => <p key={String(match.id)}>{String(match.vehicleLabel)} · requisito obrigatório não atendido</p>)}</details></div>
      </section>

      <section className={styles.publicationCard}>
        <header><h2>Publicação</h2><Status value={currentPublication?.status} /></header>
        <div className={styles.publicationGrid}><Meta label="Início" value={dateOnly(publicationStart)} /><Meta label="Fim" value={publicationEnd ? dateOnly(publicationEnd) : "Em aberto"} /><Meta label="Dias ativos" value={activeDays ? String(activeDays) : "Não informado"} /><Meta label="Último preço" value={currentPublication ? money(currentPublication.askingPrice) : "Não informado"} /></div>
      </section>
    </div>

    <section className={refinements.aiSummary}>
      <header><div><span>CONSIDERAÇÕES DA IA</span><h2>Resumo da negociação</h2></div><Status value={caseData.finalOutcome || caseData.status} /></header>
      <div className={refinements.aiSummaryGrid}>
        <p><b>Busca</b>{customerGoal}.</p>
        <p><b>Escolha</b>{alternativeMatches.length ? `${alternativeMatches.length} alternativa(s) elegível(is) considerada(s). ` : "Sem outra alternativa elegível registrada. "}{selectedMatch ? `${String(selectedMatch.vehicleLabel)} prevaleceu por ${((selectedMatch.reasons as string[]) || []).slice(0, 2).map((reason) => reasonLabel[reason] || label(reason)).join(" e ").toLowerCase() || "melhor aderência registrada"}.` : "Nenhum veículo selecionado."}</p>
        <p><b>Condição</b>{advertisedPrice ? `anúncio em ${money(advertisedPrice)}` : "preço anunciado não registrado"}{closingValue ? ` e fechamento em ${money(closingValue)}${discountValue ? `, com desconto de ${money(discountValue)}` : ", sem desconto sobre o anúncio"}` : "; negociação ainda sem fechamento"}. {paymentComposition}.</p>
        <p><b>Resultado</b>{isSold ? "negócio concluído" : isLost ? "negociação encerrada sem venda" : "negociação em andamento"}.{tradeInImpactSummary}{indicativeGross == null ? " Rentabilidade não inferida com os dados disponíveis." : ` Resultado bruto indicativo de ${money(indicativeGross)}, após aquisição e custos aprovados registrados.`}</p>
      </div>
      {(hasTradeIn || alternativeMatches.length > 0) && <details><summary>Ver contexto complementar</summary><div className={refinements.aiDetails}>{hasTradeIn && opportunity && <p>Troca: {String(opportunity.brand)} {String(opportunity.model)}{opportunity.version ? ` ${String(opportunity.version)}` : ""}, avaliação de {tradeInAppraisal ? money(tradeInAppraisal) : "valor não registrado"} e {money(tradeInAccepted)} considerados no negócio{tradeInDifference == null ? "" : tradeInDifference > 0 ? `, ${money(tradeInDifference)} acima da avaliação, com impacto negativo equivalente no resultado comercial` : tradeInDifference < 0 ? `, ${money(Math.abs(tradeInDifference))} abaixo da avaliação, preservando o resultado comercial nessa diferença` : ", sem diferença frente à avaliação"}.</p>}{alternativeMatches.length > 0 && <p>Alternativas: {alternativeMatches.slice(0, 4).map((match) => String(match.vehicleLabel)).join(", ")}.</p>}</div></details>}
    </section>

    <section className={styles.timeline}>
      <header><h2>Linha do tempo unificada</h2><span>{unifiedTimeline.length} registros · histórico completo</span></header>
      <div className={styles.timelineHead}><span>Data / hora</span><span>Evento</span><span>Resumo</span><span>Responsável</span><span>Valor / status</span></div>
      {unifiedTimeline.map((row) => <div className={styles.timelineRow} key={row.id}><time>{when(row.at)}</time><strong>{row.event}</strong><span>{row.summary}</span><span>{row.owner}</span><b>{row.value}</b></div>)}
    </section>

    <section className={styles.timeline}>
      <header><h2>Histórico de ações</h2><span>{tasks.length} registros</span></header>
      <div className={styles.timelineHead}><span>Criada</span><span>Ação</span><span>Contexto / resultado</span><span>Prioridade</span><span>Status</span></div>
      {tasks.length ? tasks.map((task) => <div className={styles.timelineRow} key={String(task.id)}><time>{when(task.createdAt)}</time><strong>{taskLabel[String(task.actionType)] || label(task.actionType)}</strong><span>{String(task.result || task.context || "Sem contexto")}</span><span>{label(task.priority)}</span><b>{label(task.status)}</b></div>) : <div className={styles.message}>Nenhuma ação registrada para este caso.</div>}
    </section>
  </div>;
}

function Meta({ label: title, value, subdued = false }: { label: string; value: string; subdued?: boolean }) { return <div className={styles.meta} data-subdued={subdued}><span>{title}</span><b>{value}</b></div>; }
function Status({ value }: { value: unknown }) { return <span className={styles.status}>{label(value)}</span>; }
function Stage({ title, status, updated, lines }: { title: string; status: unknown; updated: unknown; lines: string[] }) { return <article className={styles.stage}><header><h3>{title}</h3><Status value={status} /></header>{lines.map((line) => <p key={line}>{line}</p>)}<small>Atualizado {when(updated)}</small></article>; }
