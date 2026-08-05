"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { OpportunityStatus, OpportunityWorkspaceData } from "../../../lib/opportunities";
import { opportunityStatusLabels, opportunityStatuses } from "../../../lib/opportunities";
import styles from "./OpportunityWorkspace.module.css";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("pt-BR");

function formatDate(value: string, includeTime = true) {
  if (!value) return "Não definido";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não definido";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function inputDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function momentumLabel(momentum: string) {
  if (momentum === "accelerating") return "Acelerando";
  if (momentum === "decelerating") return "Perdendo força";
  return "Estável";
}

function conditionLabel(condition: string) {
  if (condition === "excellent") return "Excelente";
  if (condition === "good") return "Bom";
  if (condition === "fair") return "Regular";
  return condition || "Não informado";
}

type ActionPayload =
  | { action: "stage"; status: OpportunityStatus }
  | { action: "contact"; channel: string; summary: string }
  | { action: "note"; note: string }
  | { action: "next_action"; label: string; dueAt: string };

export function OpportunityWorkspace({ initialData }: { initialData: OpportunityWorkspaceData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [stage, setStage] = useState<OpportunityStatus>(initialData.status);
  const [channel, setChannel] = useState("WhatsApp");
  const [contactSummary, setContactSummary] = useState("");
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState(initialData.commercial.nextAction);
  const [nextDue, setNextDue] = useState(inputDateTime(initialData.commercial.nextFollowUp));
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const whatsapp = useMemo(() => {
    const digits = data.client.whatsapp.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  }, [data.client.whatsapp]);
  const photo = data.tradeIn.photoKeys[0];

  async function mutate(label: string, payload: ActionPayload) {
    setPending(label);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/opportunities/${encodeURIComponent(data.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as OpportunityWorkspaceData | { error?: string };
      if (!response.ok || !("id" in result)) {
        throw new Error("error" in result ? result.error || "Não foi possível salvar." : "Não foi possível salvar.");
      }
      setData(result);
      setStage(result.status);
      setNextAction(result.commercial.nextAction);
      setNextDue(inputDateTime(result.commercial.nextFollowUp));
      setMessage("Alteração salva e inteligência recalculada.");
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a alteração.");
      return false;
    } finally {
      setPending(null);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/crm"><b>A</b><span><strong>AutoPonte</strong><small>OPPORTUNITY WORKSPACE</small></span></a>
        <nav><a href="/crm">Mission Control</a><a href="/oportunidades">Todas as oportunidades</a></nav>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>OPORTUNIDADE · {data.id.slice(0, 8).toUpperCase()}</span>
          <h1>{data.client.name}</h1>
          <p>{data.desiredVehicle || "Veículo desejado ainda não definido"} · {data.client.city}</p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.status} data-status={data.status}>{data.statusLabel}</span>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
          <a href={`mailto:${data.client.email}`}>Enviar e-mail</a>
        </div>
      </section>

      {(message || error) && <div className={error ? styles.error : styles.success}>{error || message}</div>}

      <section className={styles.intelligence} aria-label="Inteligência da oportunidade">
        <article><span>Probabilidade</span><strong>{data.assessment.dna.chance}%</strong><small>chance calibrada</small></article>
        <article><span>Confiança</span><strong>{data.assessment.confidence.score}%</strong><small>{data.assessment.confidence.level === "high" ? "alta" : data.assessment.confidence.level === "medium" ? "média" : "baixa"}</small></article>
        <article><span>Temperatura</span><strong>{data.assessment.temperature.score}</strong><small>{data.assessment.temperature.label}</small></article>
        <article><span>Momentum</span><strong className={styles.compactMetric}>{momentumLabel(data.assessment.momentum)}</strong><small>recalculado agora</small></article>
        <article><span>Margem potencial</span><strong className={styles.moneyMetric}>{brl.format(data.commercial.marginPotential)}</strong><small>FIPE menos avaliação média</small></article>
      </section>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.panel}>
            <header className={styles.panelHeader}><div><span>RECOMENDAÇÃO ADE</span><h2>{data.assessment.recommendation.action}</h2></div><b>{data.assessment.recommendation.channel}</b></header>
            <p className={styles.recommendation}>{data.assessment.recommendation.rationale}</p>
            <div className={styles.reasonGrid}>
              <div><span>Por que agora</span>{data.assessment.explainability.reasons.map((reason) => <p key={reason}>✓ {reason}</p>)}</div>
              <div><span>Pontos de atenção</span>{data.assessment.explainability.warnings.length ? data.assessment.explainability.warnings.map((warning) => <p key={warning}>! {warning}</p>) : <p>Sem alertas críticos.</p>}</div>
            </div>
          </section>

          <section className={styles.detailsGrid}>
            <article className={styles.panel}>
              <header className={styles.simpleHeader}><span>CLIENTE</span><h2>Contato e interesse</h2></header>
              <dl className={styles.details}>
                <div><dt>Nome</dt><dd>{data.client.name}</dd></div>
                <div><dt>WhatsApp</dt><dd>{data.client.whatsapp}</dd></div>
                <div><dt>E-mail</dt><dd>{data.client.email}</dd></div>
                <div><dt>Cidade</dt><dd>{data.client.city}</dd></div>
                <div className={styles.full}><dt>Veículo desejado</dt><dd>{data.desiredVehicle || "A definir"}</dd></div>
              </dl>
            </article>

            <article className={styles.panel}>
              <header className={styles.simpleHeader}><span>TROCA</span><h2>{data.tradeIn.brand} {data.tradeIn.model}</h2></header>
              <div className={styles.vehicleBlock}>
                {photo ? <img src={`/api/opportunities/photo?key=${encodeURIComponent(photo)}`} alt={`${data.tradeIn.brand} ${data.tradeIn.model}`} /> : <div className={styles.noPhoto}>Sem foto</div>}
                <dl className={styles.details}>
                  <div><dt>Ano</dt><dd>{data.tradeIn.year}</dd></div>
                  <div><dt>Quilometragem</dt><dd>{number.format(data.tradeIn.mileage)} km</dd></div>
                  <div><dt>Condição</dt><dd>{conditionLabel(data.tradeIn.condition)}</dd></div>
                  <div><dt>Versão</dt><dd>{data.tradeIn.version || "Não informada"}</dd></div>
                </dl>
              </div>
            </article>
          </section>

          <section className={styles.panel}>
            <header className={styles.simpleHeader}><span>VALORES</span><h2>Leitura financeira</h2></header>
            <div className={styles.values}>
              <div><span>FIPE</span><strong>{brl.format(data.tradeIn.referencePrice)}</strong><small>{data.tradeIn.fipeMonth || data.tradeIn.fipeCode || "Referência atual"}</small></div>
              <div><span>Faixa mínima</span><strong>{brl.format(data.tradeIn.estimatedMin)}</strong><small>pré-avaliação</small></div>
              <div><span>Faixa máxima</span><strong>{brl.format(data.tradeIn.estimatedMax)}</strong><small>pré-avaliação</small></div>
              <div><span>Valor médio</span><strong>{brl.format(data.tradeIn.estimatedMidpoint)}</strong><small>base operacional</small></div>
              <div><span>Margem potencial</span><strong>{brl.format(data.commercial.marginPotential)}</strong><small>antes de custos e vistoria</small></div>
            </div>
          </section>

          <section className={styles.panel}>
            <header className={styles.simpleHeader}><span>HISTÓRICO</span><h2>Eventos da oportunidade</h2></header>
            {data.events.length === 0 ? <div className={styles.empty}>Nenhum evento registrado ainda.</div> : <div className={styles.timeline}>{data.events.map((event) => <article key={event.id}><i /><div><header><strong>{event.title}</strong><time>{formatDate(event.createdAt)}</time></header>{event.description && <p>{event.description}</p>}<small>{event.actorName}</small></div></article>)}</div>}
          </section>
        </div>

        <aside className={styles.actionsColumn}>
          <section className={styles.actionPanel}>
            <header><span>ETAPA</span><h2>Alterar pipeline</h2></header>
            <select value={stage} onChange={(event: ChangeEvent<HTMLSelectElement>) => setStage(event.target.value as OpportunityStatus)}>
              {opportunityStatuses.map((status) => <option value={status} key={status}>{opportunityStatusLabels[status]}</option>)}
            </select>
            <button disabled={pending !== null || stage === data.status} onClick={() => mutate("stage", { action: "stage", status: stage })}>{pending === "stage" ? "Salvando..." : "Atualizar etapa"}</button>
          </section>

          <section className={styles.actionPanel}>
            <header><span>CONTATO</span><h2>Registrar interação</h2></header>
            <select value={channel} onChange={(event: ChangeEvent<HTMLSelectElement>) => setChannel(event.target.value)}><option>WhatsApp</option><option>Telefone</option><option>E-mail</option><option>Presencial</option><option>Outro</option></select>
            <textarea value={contactSummary} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setContactSummary(event.target.value)} placeholder="Resumo do contato, objeções e sinais do cliente..." rows={4} />
            <button disabled={pending !== null} onClick={async () => { if (await mutate("contact", { action: "contact", channel, summary: contactSummary })) setContactSummary(""); }}>{pending === "contact" ? "Registrando..." : "Registrar contato"}</button>
          </section>

          <section className={styles.actionPanel}>
            <header><span>PRÓXIMA AÇÃO</span><h2>Definir compromisso</h2></header>
            <input value={nextAction} onChange={(event: ChangeEvent<HTMLInputElement>) => setNextAction(event.target.value)} placeholder="Ex.: Retornar com proposta revisada" />
            <input type="datetime-local" value={nextDue} onChange={(event: ChangeEvent<HTMLInputElement>) => setNextDue(event.target.value)} />
            <button disabled={pending !== null || !nextAction.trim() || !nextDue} onClick={() => mutate("next_action", { action: "next_action", label: nextAction, dueAt: new Date(nextDue).toISOString() })}>{pending === "next_action" ? "Salvando..." : "Definir próxima ação"}</button>
            <small>Atual: {data.commercial.nextAction || "não definida"}<br />Prazo: {formatDate(data.commercial.nextFollowUp)}</small>
          </section>

          <section className={styles.actionPanel}>
            <header><span>OBSERVAÇÃO</span><h2>Adicionar nota</h2></header>
            <textarea value={note} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)} placeholder="Informação comercial, objeção, condição ou decisão..." rows={5} />
            <button disabled={pending !== null || !note.trim()} onClick={async () => { if (await mutate("note", { action: "note", note })) setNote(""); }}>{pending === "note" ? "Salvando..." : "Salvar observação"}</button>
          </section>

          <section className={styles.metaPanel}>
            <span>Último contato</span><strong>{formatDate(data.commercial.lastContactAt)}</strong>
            <span>Criada em</span><strong>{formatDate(data.commercial.createdAt)}</strong>
            <span>Atualizada em</span><strong>{formatDate(data.commercial.updatedAt)}</strong>
          </section>
        </aside>
      </div>
    </main>
  );
}
