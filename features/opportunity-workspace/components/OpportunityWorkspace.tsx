"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { OpportunityStatus, OpportunityWorkspaceData } from "../../../lib/opportunities";
import { buildGmailComposeUrl, buildMailtoUrl, buildWhatsAppUrl, formatInternationalPhone, splitInternationalPhone } from "../../../lib/contact";
import { opportunityStatusLabels, opportunityStatuses } from "../../../lib/opportunities";
import styles from "./OpportunityWorkspace.module.css";
import { DesiredVehicleSelector } from "../../vehicle-demand";
import { InternationalPhoneField } from "../../contact";
import { emptyDesiredVehicleProfile } from "../../../lib/vehicles/desired-profile";
import type { DesiredVehicleProfileInput } from "../../../lib/vehicles/desired-profile";

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
  | { action: "edit_client"; name: string; whatsapp: string; whatsappDdi?: string; email: string; city: string }
  | { action: "edit_demand"; desiredVehicle: DesiredVehicleProfileInput }
  | { action: "contact"; channel: string; summary: string }
  | { action: "note"; note: string }
  | { action: "next_action"; label: string; dueAt: string };


function recommendationContext(data: OpportunityWorkspaceData) {
  const reasons = data.assessment.explainability.reasons.filter(Boolean);
  const evidence = reasons[0] || data.assessment.recommendation.rationale || "A recomendação foi calculada a partir dos dados atuais da oportunidade.";
  const impact = data.assessment.dna.chance >= 70
    ? "Aproveitar o momento de alta aderência e reduzir o risco de perda por demora."
    : data.assessment.dna.chance >= 40
      ? "Aumentar a qualidade do próximo contato e obter dados que permitam avançar a negociação."
      : "Completar informações essenciais antes de investir esforço comercial ou apresentar proposta.";
  const urgency = data.assessment.recommendation.urgency || (data.assessment.temperature.score >= 70 ? "alta" : data.assessment.temperature.score >= 40 ? "média" : "baixa");
  return { evidence, impact, urgency };
}

function demandValue(data: OpportunityWorkspaceData): DesiredVehicleProfileInput {
  if (data.desiredVehicleProfile.searchScope === "legacy") return emptyDesiredVehicleProfile();
  const { searchScope: _, ...profile } = data.desiredVehicleProfile;
  return profile;
}

export function OpportunityWorkspace({ initialData }: { initialData: OpportunityWorkspaceData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [stage, setStage] = useState<OpportunityStatus>(initialData.status);
  const [clientName, setClientName] = useState(initialData.client.name);
  const initialPhone = splitInternationalPhone(initialData.client.whatsapp);
  const [clientPhoneDdi, setClientPhoneDdi] = useState(initialPhone.ddi);
  const [clientPhoneNational, setClientPhoneNational] = useState(initialPhone.nationalNumber);
  const [clientEmail, setClientEmail] = useState(initialData.client.email);
  const [clientCity, setClientCity] = useState(initialData.client.city);
  const [desiredVehicleProfile, setDesiredVehicleProfile] = useState<DesiredVehicleProfileInput>(demandValue(initialData));
  const [channel, setChannel] = useState(buildWhatsAppUrl(initialData.client.whatsapp) ? "WhatsApp" : buildMailtoUrl(initialData.client.email) ? "E-mail" : "Presencial");
  const [contactSummary, setContactSummary] = useState("");
  const [note, setNote] = useState("");
  const [nextAction, setNextAction] = useState(initialData.commercial.nextAction);
  const [nextDue, setNextDue] = useState(inputDateTime(initialData.commercial.nextFollowUp));
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const whatsappUrl = useMemo(() => buildWhatsAppUrl(data.client.whatsapp), [data.client.whatsapp]);
  const emailUrl = useMemo(() => buildGmailComposeUrl(data.client.email, `AutoPonte · ${data.desiredVehicle || "oportunidade"}`), [data.client.email, data.desiredVehicle]);
  const whatsappDisplay = useMemo(() => formatInternationalPhone(data.client.whatsapp), [data.client.whatsapp]);
  const photo = data.tradeIn.photoKeys[0];
  const recommendation = recommendationContext(data);

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
      setClientName(result.client.name);
      const nextPhone = splitInternationalPhone(result.client.whatsapp);
      setClientPhoneDdi(nextPhone.ddi);
      setClientPhoneNational(nextPhone.nationalNumber);
      setClientEmail(result.client.email);
      setClientCity(result.client.city);
      setDesiredVehicleProfile(demandValue(result));
      if (channel === "WhatsApp" && !buildWhatsAppUrl(result.client.whatsapp)) setChannel(buildMailtoUrl(result.client.email) ? "E-mail" : "Presencial");
      if (channel === "E-mail" && !buildMailtoUrl(result.client.email)) setChannel(buildWhatsAppUrl(result.client.whatsapp) ? "WhatsApp" : "Presencial");
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
      
     
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>OPORTUNIDADE · {data.id.slice(0, 8).toUpperCase()}</span>
          <h1>{data.client.name}</h1>
          <p>{data.desiredVehicle || "Veículo desejado ainda não definido"} · {data.client.city}</p>
        </div>
        <div className={styles.heroActions}>
          <span className={styles.status} data-status={data.status}>Etapa: {data.statusLabel}</span>
          {whatsappUrl ? <a className={styles.whatsappAction} href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Abrir conversa no WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.8a8 8 0 0 1-11.8 7l-4.1 1.1 1.1-4A8 8 0 1 1 20 11.8Zm-8-6.2a6.2 6.2 0 0 0-5.3 9.5l.2.4-.6 2.1 2.2-.6.4.2A6.2 6.2 0 1 0 12 5.6Zm3.5 8.7c-.2.5-1.1 1-1.6 1.1-.4.1-1 .2-2.9-.6-2.4-1-3.9-3.4-4-3.6-.1-.2-1-1.3-1-2.5 0-1.2.6-1.8.9-2 .2-.2.5-.3.8-.3h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.4-.1.7.2.4.8 1.3 1.8 2 .9.8 1.7 1 2.1 1.2.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.3.7-.2l1.8.8c.3.1.5.2.5.4 0 .1 0 .5-.2 1Z"/></svg><span>WhatsApp</span></a> : <span className={styles.contactUnavailable}>WhatsApp não informado</span>}
          {emailUrl ? <a className={styles.emailAction} href={emailUrl} target="_blank" rel="noreferrer" aria-label="Escrever e-mail"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5Zm9 7.2L5.4 7h13.2L12 12.2ZM5 17h14V9.1l-7 5.5-7-5.5V17Z"/></svg><span>E-mail</span></a> : <span className={styles.contactUnavailable}>E-mail não informado</span>}
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
          <section className={`${styles.panel} ${styles.explainedRecommendation}`}>
            <header className={styles.panelHeader}><div><span>RECOMENDAÇÃO EXPLICADA</span><h2>{data.assessment.recommendation.action || "Sem recomendação acionável no momento"}</h2></div><b>{data.assessment.recommendation.channel || "Análise"}</b></header>
            <div className={styles.recommendationLead}>
              <p className={styles.recommendation}>{data.assessment.recommendation.rationale || "Dados insuficientes para uma recomendação específica."}</p>
              <span className={styles.urgencyBadge} data-urgency={recommendation.urgency}>Urgência: {recommendation.urgency}</span>
            </div>
            <div className={styles.recommendationContextGrid}>
              <article><span>POR QUE AGORA?</span><p>{recommendation.evidence}</p></article>
              <article><span>IMPACTO ESPERADO</span><p>{recommendation.impact}</p></article>
              <article><span>EVIDÊNCIAS</span>{data.assessment.explainability.reasons.length ? data.assessment.explainability.reasons.slice(0, 3).map((reason) => <p key={reason}>✓ {reason}</p>) : <p>Nenhum evento verificável adicional foi identificado.</p>}</article>
              <article><span>PONTOS DE ATENÇÃO</span>{data.assessment.explainability.warnings.length ? data.assessment.explainability.warnings.slice(0, 3).map((warning) => <p key={warning}>! {warning}</p>) : <p>Sem alertas críticos.</p>}</article>
            </div>
          </section>

          <section className={styles.detailsGrid}>
            <article className={styles.panel}>
              <header className={styles.simpleHeader}><span>CLIENTE</span><h2>Contato e interesse</h2></header>
              <dl className={styles.details}>
                <div><dt>Nome</dt><dd>{data.client.name}</dd></div>
                <div><dt>WhatsApp</dt><dd>{whatsappDisplay || "Não informado"}</dd></div>
                <div><dt>E-mail</dt><dd>{data.client.email || "Não informado"}</dd></div>
                <div><dt>Cidade</dt><dd>{data.client.city}</dd></div>
                <div className={styles.full}><dt>Veículo desejado</dt><dd>{data.desiredVehicle || "A definir"}</dd></div>
              </dl>
            </article>

            <article className={styles.panel}>
              <header className={styles.simpleHeader}><span>TROCA</span><h2>{data.tradeIn.brand && data.tradeIn.model ? `${data.tradeIn.brand} ${data.tradeIn.model}` : "Sem veículo de troca"}</h2></header>
              <div className={styles.vehicleBlock}>
                {photo ? <img src={`/api/opportunities/photo?key=${encodeURIComponent(photo)}`} alt={`${data.tradeIn.brand} ${data.tradeIn.model}`} /> : <div className={styles.noPhoto}>{data.tradeIn.brand ? "Sem foto" : "Compra direta"}</div>}
                <dl className={styles.details}>
                  <div><dt>Ano</dt><dd>{data.tradeIn.year || "Não se aplica"}</dd></div>
                  <div><dt>Quilometragem</dt><dd>{data.tradeIn.brand ? `${number.format(data.tradeIn.mileage)} km` : "Não se aplica"}</dd></div>
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
            <header><span>CLIENTE</span><h2>Corrigir dados e contato</h2></header>
            <input value={clientName} onChange={(event: ChangeEvent<HTMLInputElement>) => setClientName(event.target.value)} placeholder="Nome completo" />
            <InternationalPhoneField ddi={clientPhoneDdi} nationalNumber={clientPhoneNational} onDdiChange={setClientPhoneDdi} onNationalNumberChange={setClientPhoneNational} disabled={pending !== null} />
            <input type="email" value={clientEmail} onChange={(event: ChangeEvent<HTMLInputElement>) => setClientEmail(event.target.value)} placeholder="E-mail" />
            <input value={clientCity} onChange={(event: ChangeEvent<HTMLInputElement>) => setClientCity(event.target.value)} placeholder="Cidade" />
            <button disabled={pending !== null || !clientName.trim() || !clientCity.trim() || (!clientPhoneNational.trim() && !clientEmail.trim())} onClick={() => mutate("edit_client", { action: "edit_client", name: clientName, whatsapp: clientPhoneNational, whatsappDdi: clientPhoneDdi, email: clientEmail, city: clientCity })}>{pending === "edit_client" ? "Salvando..." : "Salvar dados do cliente"}</button>
            <small>É obrigatório manter ao menos um canal válido: WhatsApp ou e-mail.</small>
          </section>

          <section className={styles.actionPanel}>
            <header><span>DEMANDA</span><h2>Veículo desejado</h2></header>
            {data.desiredVehicleProfile.searchScope === "legacy" && <small>Cadastro legado: selecione a demanda no catálogo FIPE para eliminar o texto livre.</small>}
            <DesiredVehicleSelector value={desiredVehicleProfile} onChange={setDesiredVehicleProfile} disabled={pending !== null} compact idPrefix={`workspace-demand-${data.id}`} />
            <button disabled={pending !== null || !desiredVehicleProfile.brandCode || !desiredVehicleProfile.yearMin || !desiredVehicleProfile.yearMax || !desiredVehicleProfile.priceMax} onClick={() => mutate("edit_demand", { action: "edit_demand", desiredVehicle: desiredVehicleProfile })}>{pending === "edit_demand" ? "Validando FIPE..." : "Salvar demanda"}</button>
          </section>

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
            <button disabled={pending !== null || !contactSummary.trim()} onClick={async () => { if (await mutate("contact", { action: "contact", channel, summary: contactSummary })) setContactSummary(""); }}>{pending === "contact" ? "Registrando..." : "Registrar contato"}</button>
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


