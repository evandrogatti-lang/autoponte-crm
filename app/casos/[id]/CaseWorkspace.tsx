"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./workspace.module.css";

type Row = Record<string, unknown>;
const actionLabels: Record<string, string> = {
  CONTACT_CUSTOMER: "Contatar cliente",
  REQUEST_DOCUMENTS: "Solicitar documentos",
  REVIEW_PROPOSAL: "Revisar proposta",
  SCHEDULE_FOLLOW_UP: "Agendar acompanhamento",
  MARK_CASE_LOST: "Marcar negociação como perdida",
};

const lossReasons: Record<string, string> = {
  PRICE: "Preço",
  FINANCING: "Financiamento",
  VEHICLE_MISMATCH: "Veículo incompatível",
  CUSTOMER_WITHDREW: "Cliente desistiu",
  BOUGHT_FROM_COMPETITOR: "Comprou da concorrência",
  NO_RESPONSE: "Sem resposta",
  OTHER: "Outro",
};

function record(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = "Não informado") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function amount(value: unknown) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function date(value: unknown) {
  if (!value) return "Não informado";
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? "Não informado" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function status(value: unknown, fallback?: string) {
  return text(value, fallback).replaceAll("_", " ");
}

function taskName(task: Row) {
  return actionLabels[String(task.actionType)] || status(task.actionType);
}

function dueState(value: unknown) {
  const parsed = new Date(String(value));
  return !Number.isNaN(parsed.valueOf()) && parsed < new Date() ? "atrasada" : "programada";
}

export default function CaseWorkspace({ initialData }: { initialData: Row }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [taskError, setTaskError] = useState("");
  const [taskMode, setTaskMode] = useState<"create" | "complete" | "cancel" | null>(null);
  const [selectedTask, setSelectedTask] = useState<Row | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [createNextAction, setCreateNextAction] = useState(false);
  const submittingRef = useRef(false);

  const caseData = record(data.case);
  const customer = record(data.customer);
  const vehicle = record(data.vehicle);
  const opportunity = record(data.opportunity);
  const tradeIn = record(data.tradeInVehicle);
  const tasks = rows(data.tasks);
  const workOrders = rows(data.workOrders);
  const costs = rows(data.costs);
  const proposals = rows(data.proposals);
  const contracts = rows(data.contracts);
  const payments = rows(data.payments);
  const publications = rows(data.publications);
  const deliveries = rows(data.deliveries);
  const followups = rows(data.followups);
  const intents = rows(data.intents);
  const matches = rows(data.matches);
  const timeline = rows(data.timeline);
  const nextAction = data.nextAction ? record(data.nextAction) : null;
  const caseId = String(caseData.id);
  const ownerId = String(data.sellerUserId || "");

  const openTasks = tasks.filter((task) => task.status === "OPEN");
  const archivedTasks = tasks.filter((task) => task.status !== "OPEN");
  const pendingWork = workOrders.filter((item) => ["open", "in_progress"].includes(String(item.status)));
  const completedWork = workOrders.filter((item) => item.status === "completed");
  const approvedCosts = costs.filter((item) => item.status === "approved");
  const actualCosts = approvedCosts.reduce((total, item) => total + (Number(item.amount) || 0), 0);
  const pendingEstimate = pendingWork.reduce((total, item) => total + (Number(item.estimatedCost) || 0), 0);
  const totalProjected = actualCosts + pendingEstimate;
  const currentProposal = proposals.find((item) => ["accepted", "sent", "draft"].includes(String(item.status))) || proposals[0];
  const currentPayment = payments.find((item) => item.proposalId === currentProposal?.id) || payments[0];
  const currentContract = contracts.find((item) => item.proposalId === currentProposal?.id) || contracts[0];
  const selectedMatch = matches.find((item) => ["selected", "converted", "proposal_accepted"].includes(String(item.status))) || matches[0];
  const activeIntent = intents[0];
  const hasTradeIn = Object.keys(tradeIn).length > 0 || caseData.acquisitionMode === "trade_in" || Number(currentProposal?.tradeInCredit) > 0;
  const attention = (() => {
    const items: string[] = [];
    if (!nextAction && caseData.status !== "lost" && caseData.finalOutcome !== "sold") items.push(text(caseData.noNextActionReason, "Negociação sem próxima ação definida."));
    if (pendingWork.length) items.push(`${pendingWork.length} serviço(s) a executar.`);
    if (payments.some((item) => item.status === "pending")) items.push("Pagamento pendente.");
    if (vehicle.documentStatus && !["approved", "regular"].includes(String(vehicle.documentStatus))) items.push(`Documentação: ${status(vehicle.documentStatus)}.`);
    return items;
  })();

  async function submit(command: Row) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setNotice("");
    setTaskError("");
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const result = await response.json() as Row;
      if (!response.ok) throw new Error(text(result.error, "Não foi possível concluir a operação."));
      const fresh = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
      if (!fresh.ok) throw new Error("A operação foi registrada, mas não foi possível atualizar a negociação.");
      setData(await fresh.json() as Row);
      setNotice(text(result.title, "Operação concluída."));
      setTaskMode(null);
      setSelectedTask(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
      setNotice(message);
      setTaskError(message);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  function openTaskForm(mode: "create" | "complete" | "cancel", task?: Row) {
    setSelectedTask(task || null);
    setCreateNextAction(false);
    setTaskError("");
    setTaskMode(mode);
  }

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit({
      type: "task.create",
      actionType: form.get("actionType"),
      ownerId: form.get("ownerId"),
      dueAt: new Date(String(form.get("dueAt"))).toISOString(),
      priority: form.get("priority"),
      context: form.get("context"),
    });
  }

  function completeTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const form = new FormData(event.currentTarget);
    const command: Row = {
      type: "task.complete",
      id: selectedTask.id,
      result: form.get("result"),
      note: form.get("note"),
      noNextActionReason: createNextAction ? "" : form.get("noNextActionReason"),
    };
    if (selectedTask.actionType === "MARK_CASE_LOST") command.lossReason = form.get("lossReason");
    if (createNextAction) {
      command.nextTask = {
        actionType: form.get("nextActionType"),
        ownerId: form.get("nextOwnerId"),
        dueAt: new Date(String(form.get("nextDueAt"))).toISOString(),
        priority: form.get("nextPriority"),
        context: form.get("nextContext"),
      };
    }
    void submit(command);
  }

  function cancelTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const form = new FormData(event.currentTarget);
    void submit({ type: "task.cancel", id: selectedTask.id, reason: form.get("reason"), noNextActionReason: form.get("noNextActionReason") });
  }

  return (
    <main className={styles.page}>
      <header className={styles.caseHeader}>
        <div>
          <Link href="/negociacoes" className={styles.back}>← Voltar para negociações</Link>
          <span>NEGOCIAÇÃO {text(caseData.pilotCode, caseId.slice(0, 8).toUpperCase())}</span>
          <h1>{text(customer.name, "Cliente não informado")}</h1>
          <p>{text(vehicle.brand, "Veículo")} {text(vehicle.model, "")} · {text(vehicle.modelYear, "Ano não informado")} · {text(data.sellerName, "Sem responsável")}</p>
        </div>
        <div className={styles.headerState}>
          <span>{status(caseData.status)}</span>
          <b>{status(caseData.finalOutcome, "Em andamento")}</b>
        </div>
      </header>

      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <section className={styles.priorityGrid}>
        <article className={styles.nextAction}>
          <span className={styles.sectionLabel}>PRÓXIMA AÇÃO</span>
          {nextAction ? <>
            <h2>{taskName(nextAction)}</h2>
            <p>{text(nextAction.context, "Sem contexto adicional.")}</p>
            <div className={styles.actionMeta}>
              <b data-priority={String(nextAction.priority)}>{status(nextAction.priority)}</b>
              <span>{text(nextAction.ownerId)} · <em data-due={dueState(nextAction.dueAt)}>{date(nextAction.dueAt)}</em></span>
            </div>
            <button type="button" disabled={busy} onClick={() => openTaskForm("complete", nextAction)}>Concluir próxima ação</button>
          </> : <>
            <h2>Sem próxima ação</h2>
            <p>{text(caseData.noNextActionReason, "Defina uma ação para manter a negociação em movimento.")}</p>
            <button type="button" disabled={busy || !ownerId} onClick={() => openTaskForm("create")}>Definir ação</button>
          </>}
        </article>
        <article className={styles.attention}>
          <span className={styles.sectionLabel}>ATENÇÕES OPERACIONAIS</span>
          {attention.length ? <ul>{attention.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Sem pendências sinalizadas pelos dados atuais.</p>}
        </article>
      </section>

      <section className={styles.twoColumns}>
        <article className={styles.panel}>
          <SectionTitle label="CLIENTE E INTENÇÃO" title="Contexto para a decisão" />
          <div className={styles.detailGrid}>
            <Detail label="Contato" value={text(customer.whatsapp, text(customer.email))} />
            <Detail label="Cidade" value={`${text(customer.city, "")}${customer.state ? ` · ${customer.state}` : ""}`} />
            <Detail label="Interesse" value={text(opportunity.desiredVehicle, "Não informado")} />
            <Detail label="Financiamento" value={text(record(activeIntent.financing).status, "Não informado")} />
          </div>
        </article>
        <article className={styles.panel}>
          <SectionTitle label="NEGOCIAÇÃO" title="Proposta e condição atual" />
          <div className={styles.detailGrid}>
            <Detail label="Proposta" value={currentProposal ? `#${text(currentProposal.sequence)} · ${status(currentProposal.status)}` : "Não iniciada"} />
            <Detail label="Valor" value={currentProposal ? amount(currentProposal.totalAmount) : "Não informado"} />
            <Detail label="Entrada / troca" value={currentProposal ? `${amount(currentProposal.downPayment)} / ${amount(currentProposal.tradeInCredit)}` : "Não informado"} />
            <Detail label="Financiamento" value={currentProposal ? amount(currentProposal.financedAmount) : "Não informado"} />
          </div>
        </article>
      </section>

      <section className={styles.twoColumns}>
        <article className={styles.panel}>
          <SectionTitle label="VEÍCULO PRINCIPAL" title={`${text(vehicle.brand)} ${text(vehicle.model, "")}`} />
          <div className={styles.detailGrid}>
            <Detail label="Ano / placa" value={`${text(vehicle.modelYear)} · ${text(vehicle.plate)}`} />
            <Detail label="Documentação" value={status(vehicle.documentStatus)} />
            <Detail label="Preço anunciado" value={amount(vehicle.askingPrice)} />
            <Detail label="Aquisição" value={status(caseData.acquisitionMode)} />
          </div>
        </article>
        {hasTradeIn && <article className={`${styles.panel} ${styles.tradeIn}`}>
          <SectionTitle label="TRADE-IN" title={`${text(tradeIn.brand, text(opportunity.brand, ""))} ${text(tradeIn.model, text(opportunity.model, ""))}`} />
          <div className={styles.detailGrid}>
            <Detail label="Avaliação" value={amount(tradeIn.appraisalValue || opportunity.estimatedMax || opportunity.referencePrice)} />
            <Detail label="Crédito na proposta" value={amount(currentProposal?.tradeInCredit)} />
            <Detail label="Ano / placa" value={`${text(tradeIn.modelYear, text(opportunity.year, ""))} · ${text(tradeIn.plate)}`} />
            <Detail label="Status" value={status(tradeIn.status || opportunity.status)} />
          </div>
        </article>}
      </section>

      <section className={styles.panel}>
        <SectionTitle label="SERVIÇOS E CUSTOS" title="Execução e impacto financeiro" />
        <div className={styles.costSummary}>
          <Detail label="Realizado" value={amount(actualCosts)} />
          <Detail label="A executar" value={amount(pendingEstimate)} />
          <Detail label="Total projetado" value={amount(totalProjected)} />
          <Detail label="Impacto na proposta" value={currentProposal ? `${amount(Number(currentProposal.totalAmount) - totalProjected)} após custos` : "Proposta não iniciada"} />
        </div>
        <div className={styles.serviceGrid}>
          <ServiceList title="A EXECUTAR" items={pendingWork} value={(item) => amount(item.estimatedCost)} empty="Nenhum serviço pendente." />
          <ServiceList title="EXECUTADOS" items={completedWork} value={(item) => amount(item.actualCost)} empty="Nenhum serviço concluído." />
        </div>
        {approvedCosts.length > 0 && <details className={styles.disclosure}><summary>Ver custos realizados por origem ({approvedCosts.length})</summary>{approvedCosts.map((item) => <div key={String(item.id)}><span>{text(item.description, status(item.category))}</span><b>{amount(item.amount)} · {status(item.status)}</b></div>)}</details>}
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div><span className={styles.sectionLabel}>PRÓXIMOS PASSOS</span><h2>Ações da negociação</h2></div>
          <button type="button" disabled={busy || !ownerId} onClick={() => openTaskForm("create")}>Nova ação</button>
        </div>
        {openTasks.length ? <div className={styles.actionList}>{openTasks.map((task) => <TaskRow task={task} next={nextAction?.id === task.id} busy={busy} onComplete={() => openTaskForm("complete", task)} onCancel={() => openTaskForm("cancel", task)} key={String(task.id)} />)}</div> : <p className={styles.empty}>Nenhuma ação aberta.</p>}
        {archivedTasks.length > 0 && <button type="button" className={styles.textButton} onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Ocultar" : "Ver"} concluídas e canceladas ({archivedTasks.length})</button>}
        {showArchived && <div className={styles.actionList}>{archivedTasks.map((task) => <TaskRow task={task} next={false} busy={true} key={String(task.id)} />)}</div>}
      </section>

      <section className={styles.panel}>
        <SectionTitle label="FLUXO COMPLEMENTAR" title="Estado operacional por etapa" />
        <div className={styles.flowGrid}>
          <FlowItem label="Match" value={selectedMatch ? text(selectedMatch.vehicleLabel, `Score ${text(selectedMatch.score)}`) : "Pendente"} statusValue={selectedMatch?.status} />
          <FlowItem label="Publicação" value={publications[0] ? text(publications[0].channel) : "Não publicada"} statusValue={publications[0]?.status} />
          <FlowItem label="Contrato" value={currentContract ? text(currentContract.contractNumber, text(currentContract.contractType)) : "Não iniciado"} statusValue={currentContract?.status} />
          <FlowItem label="Pagamento" value={currentPayment ? amount(currentPayment.amount) : "Não registrado"} statusValue={currentPayment?.status} />
          <FlowItem label="Entrega" value={deliveries[0] ? date(deliveries[0].scheduledAt || deliveries[0].deliveredAt) : "Não agendada"} statusValue={deliveries[0]?.status} />
          <FlowItem label="Pós-venda" value={followups[0] ? date(followups[0].dueAt) : "Não iniciado"} statusValue={followups[0]?.status} />
        </div>
      </section>

      <section className={styles.panel}>
        <SectionTitle label="TIMELINE" title="Histórico operacional" />
        {timeline.length ? <div className={styles.timeline}>{timeline.map((item) => <div className={styles.timelineRow} key={String(item.id)}><time>{date(item.occurredAt)}</time><div><b>{status(item.eventType)}</b><p>{text(item.description, status(item.status))}</p></div><span>{item.amount ? amount(item.amount) : status(item.status)}</span></div>)}</div> : <p className={styles.empty}>Nenhum evento operacional registrado.</p>}
      </section>

      {taskMode === "create" && <TaskDialog title="Nova ação da negociação" onClose={() => setTaskMode(null)}><form onSubmit={createTask} className={styles.form}><TaskFields ownerId={ownerId} /><TaskError message={taskError} /><button disabled={busy}>Criar ação</button></form></TaskDialog>}
      {taskMode === "complete" && selectedTask && <TaskDialog title={`Concluir: ${taskName(selectedTask)}`} onClose={() => setTaskMode(null)}><form onSubmit={completeTask} className={styles.form}><label>Resultado<textarea name="result" required /></label><label>Observação<textarea name="note" /></label>{selectedTask.actionType === "MARK_CASE_LOST" && <label>Motivo da perda<select name="lossReason" required>{Object.entries(lossReasons).map(([value, item]) => <option value={value} key={value}>{item}</option>)}</select></label>}<label className={styles.checkbox}><input type="checkbox" checked={createNextAction} onChange={(event) => setCreateNextAction(event.target.checked)} /> Criar próxima ação agora</label>{createNextAction ? <div className={styles.nextFields}><TaskFields ownerId={ownerId} prefix="next" /></div> : <label>Motivo para ficar sem próxima ação<textarea name="noNextActionReason" placeholder="Obrigatório se não criar uma próxima ação." required /></label>}<TaskError message={taskError} /><button disabled={busy}>Concluir ação</button></form></TaskDialog>}
      {taskMode === "cancel" && selectedTask && <TaskDialog title={`Cancelar: ${taskName(selectedTask)}`} onClose={() => setTaskMode(null)}><form onSubmit={cancelTask} className={styles.form}><label>Motivo do cancelamento<textarea name="reason" required /></label><label>Motivo para não haver próxima ação<textarea name="noNextActionReason" /></label><TaskError message={taskError} /><button disabled={busy}>Cancelar ação</button></form></TaskDialog>}
    </main>
  );
}

function SectionTitle({ label, title }: { label: string; title: string }) {
  return <header className={styles.sectionHead}><div><span className={styles.sectionLabel}>{label}</span><h2>{title}</h2></div></header>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className={styles.detail}><span>{label}</span><b>{value}</b></div>;
}

function ServiceList({ title, items, value, empty }: { title: string; items: Row[]; value: (item: Row) => string; empty: string }) {
  return <div><h3>{title}</h3>{items.length ? items.map((item) => <div className={styles.service} key={String(item.id)}><div><b>{text(item.description, text(item.workType))}</b><span>{status(item.status)}</span></div><strong>{value(item)}</strong></div>) : <p className={styles.empty}>{empty}</p>}</div>;
}

function TaskRow({ task, next, busy, onComplete, onCancel }: { task: Row; next: boolean; busy: boolean; onComplete?: () => void; onCancel?: () => void }) {
  return <article className={styles.taskRow} data-next={next}><div><span>{next ? "PRÓXIMA AÇÃO" : status(task.status)}</span><h3>{taskName(task)}</h3><p>{text(task.context, "Sem contexto adicional.")}</p></div><div className={styles.taskMeta}><b data-priority={String(task.priority)}>{status(task.priority)}</b><span>{date(task.dueAt)}</span></div>{task.status === "OPEN" && <div className={styles.taskButtons}><button type="button" disabled={busy} onClick={onComplete}>Concluir</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>}{task.status !== "OPEN" && <small>{text(task.result, "Sem resultado registrado.")}</small>}</article>;
}

function FlowItem({ label, value, statusValue }: { label: string; value: string; statusValue: unknown }) {
  return <div className={styles.flowItem}><span>{label}</span><b>{value}</b><small>{status(statusValue, "Pendente")}</small></div>;
}

function TaskFields({ ownerId, prefix = "" }: { ownerId: string; prefix?: string }) {
  const name = (value: string) => prefix ? `${prefix}${value[0].toUpperCase()}${value.slice(1)}` : value;
  return <><label>Tipo<select name={name("actionType")} defaultValue="CONTACT_CUSTOMER">{Object.entries(actionLabels).map(([value, item]) => <option value={value} key={value}>{item}</option>)}</select></label><label>Responsável<input name={name("ownerId")} defaultValue={ownerId} required /></label><div className={styles.formSplit}><label>Prazo<input name={name("dueAt")} type="datetime-local" required /></label><label>Prioridade<select name={name("priority")} defaultValue="NORMAL"><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></label></div><label>Contexto<textarea name={name("context")} /></label></>;
}

function TaskDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className={styles.overlay} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Fechar">×</button></header>{children}</section></div>;
}

function TaskError({ message }: { message: string }) {
  return message ? <p role="alert" style={{ margin: 0, padding: "8px 10px", borderRadius: 7, background: "#fff0ed", color: "#a34020", fontSize: 11, fontWeight: 700 }}>{message}</p> : null;
}
