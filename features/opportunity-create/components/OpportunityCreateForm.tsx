"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import styles from "./OpportunityCreateForm.module.css";
import { DesiredVehicleSelector } from "../../vehicle-demand";
import { emptyDesiredVehicleProfile } from "../../../lib/vehicles/desired-profile";
import type { DesiredVehicleProfileInput } from "../../../lib/vehicles/desired-profile";
import { TradeInFipeSelector, emptyTradeInFipeValue } from "../../vehicle-trade";
import type { TradeInFipeValue } from "../../vehicle-trade";
import { InternationalPhoneField } from "../../contact";

export function OpportunityCreateForm() {
  const router = useRouter();
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [phoneDdi, setPhoneDdi] = useState("55");
  const [phoneNational, setPhoneNational] = useState("");
  const [desiredVehicle, setDesiredVehicle] = useState<DesiredVehicleProfileInput>(emptyDesiredVehicleProfile());
  const [tradeInFipe, setTradeInFipe] = useState<TradeInFipeValue>(emptyTradeInFipeValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const nextFollowUp = String(form.get("nextFollowUp") ?? "");
    const body = {
      name: form.get("name"),
      whatsapp: phoneNational,
      whatsappDdi: phoneDdi,
      email: form.get("email"),
      city: form.get("city"),
      desiredVehicle,
      status: form.get("status"),
      leadCategory: form.get("leadCategory"),
      nextAction: form.get("nextAction"),
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp).toISOString() : "",
      notes: form.get("notes"),
      consentConfirmed: form.get("consentConfirmed") === "on",
      tradeIn: {
        hasTradeIn,
        brandCode: tradeInFipe.brandCode,
        modelCode: tradeInFipe.modelCode,
        yearCode: tradeInFipe.yearCode,
        brand: tradeInFipe.brand,
        model: tradeInFipe.model,
        version: "",
        year: tradeInFipe.modelYear ? String(tradeInFipe.modelYear) : "",
        mileage: form.get("tradeInMileage"),
        condition: form.get("tradeInCondition"),
        referencePrice: tradeInFipe.price,
        estimatedMin: form.get("estimatedMin"),
        estimatedMax: form.get("estimatedMax"),
        fipeCode: tradeInFipe.fipeCode,
        fipeMonth: tradeInFipe.referenceMonth,
      },
    };

    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string; href?: string };
      if (!response.ok || !result.href) throw new Error(result.error || "Não foi possível cadastrar a oportunidade.");
      router.push(result.href);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível cadastrar a oportunidade.");
      setPending(false);
    }
  }

  return (
    <form className={`operational-form ${styles.compactForm}`} onSubmit={submit}>
      {error && <div className="form-error" role="alert">{error}</div>}

      <section className="form-section">
        <header><span>01</span><div><h2>Cliente</h2><p>Dados reais para contato e acompanhamento.</p></div></header>
        <div className={`form-grid ${styles.clientGrid}`}>
          <label><span>Nome completo *</span><input name="name" required maxLength={160} autoFocus /></label>
          <InternationalPhoneField ddi={phoneDdi} nationalNumber={phoneNational} onDdiChange={setPhoneDdi} onNationalNumberChange={setPhoneNational} required disabled={pending} />
          <label><span>E-mail</span><input name="email" type="email" maxLength={180} autoComplete="email" /></label>
          <label><span>Cidade *</span><input name="city" required maxLength={120} placeholder="São Bernardo do Campo" /></label>
        </div>
      </section>

      <section className="form-section">
        <header><span>02</span><div><h2>Interesse comercial</h2><p>Catálogo FIPE, faixa de ano, valores pretendidos, etapa e prioridade inicial.</p></div></header>
        <DesiredVehicleSelector value={desiredVehicle} onChange={setDesiredVehicle} disabled={pending} idPrefix="create-demand" />
        <div className={`form-grid ${styles.commercialGrid}`}>
          <label><span>Etapa inicial</span><select name="status" defaultValue="new"><option value="new">Lead</option><option value="contacted">Contato</option><option value="qualified">Qualificação</option><option value="sent_to_store">Loja</option><option value="proposal">Proposta</option></select></label>
          <label><span>Prioridade</span><select name="leadCategory" defaultValue="new"><option value="new">Nova</option><option value="warm">Em negociação</option><option value="hot">Alta prioridade</option><option value="review">Requer análise</option></select></label>
          <label className={styles.actionField}><span>Próxima ação</span><input name="nextAction" maxLength={240} placeholder="Ex.: Enviar opções de estoque" /></label>
          <label><span>Prazo da próxima ação</span><input name="nextFollowUp" type="datetime-local" /></label>
          <label className={styles.notesField}><span>Observações iniciais</span><textarea name="notes" rows={4} maxLength={4000} placeholder="Prazo de compra, preferências, modelos similares e contexto relevante..." /></label>
        </div>
      </section>

      <section className="form-section">
        <header><span>03</span><div><h2>Veículo de troca</h2><p>Opcional. Ative somente quando o cliente realmente tiver um veículo na negociação.</p></div></header>
        <label className="trade-toggle"><input type="checkbox" checked={hasTradeIn} onChange={(event: ChangeEvent<HTMLInputElement>) => setHasTradeIn(event.target.checked)} /><span><strong>Cliente possui veículo de troca</strong><small>Os valores alimentarão margem, confiança e recomendação do ADE.</small></span></label>
        {hasTradeIn && <div className="trade-fields">
          <TradeInFipeSelector value={tradeInFipe} onChange={setTradeInFipe} disabled={pending} idPrefix="create-trade" />
          <div className="form-grid trade-evaluation-grid">
            <label><span>Quilometragem</span><input name="tradeInMileage" type="number" min="0" step="1" /></label>
            <label><span>Condição</span><select name="tradeInCondition" defaultValue="good"><option value="excellent">Excelente</option><option value="good">Boa</option><option value="fair">Regular</option></select></label>
            <label><span>Avaliação mínima</span><input name="estimatedMin" type="number" min="0" step="1" /></label>
            <label><span>Avaliação máxima</span><input name="estimatedMax" type="number" min="0" step="1" /></label>
          </div>
        </div>}
      </section>

      <label className="consent-confirmation"><input name="consentConfirmed" type="checkbox" required /><span><strong>Consentimento de contato confirmado *</strong><small>Confirmo que o cliente autorizou o registro e o contato comercial pela AutoPonte.</small></span></label>

      <footer className="form-footer">
        <a href="/oportunidades">Cancelar</a>
        <button type="submit" disabled={pending || (hasTradeIn && !tradeInFipe.fipeCode)}>{pending ? "Validando FIPE e cadastrando..." : "Cadastrar e abrir workspace"}</button>
      </footer>
    </form>
  );
}
