import type { Explainability, Momentum, OpportunitySignals, Recommendation } from "./types.ts";
import { daysUntil } from "./utils.ts";

export function recommendNextAction(
  signals: OpportunitySignals,
  momentum: Momentum,
  explanation: Explainability,
  now = new Date(),
): Recommendation {
  const followUp = daysUntil(signals.nextFollowUp, now);
  if (followUp !== null && followUp < 0) {
    return { action: "Retomar agora", channel: "WhatsApp", urgency: "now", rationale: explanation.warnings[0] ?? explanation.reasons[0] };
  }
  if (signals.stage === "proposal") {
    return { action: "Acompanhar proposta", channel: "Telefone", urgency: followUp === 0 ? "now" : "today", rationale: explanation.reasons[0] };
  }
  if (signals.stage === "store") {
    return { action: "Validar avaliação e estoque", channel: "CRM", urgency: momentum === "decelerating" ? "today" : "soon", rationale: explanation.reasons[0] };
  }
  if (signals.stage === "qualified") {
    return { action: "Montar proposta", channel: "Proposta", urgency: momentum === "accelerating" ? "today" : "soon", rationale: explanation.reasons[0] };
  }
  if (signals.stage === "contacted") {
    return { action: "Completar qualificação", channel: "WhatsApp", urgency: momentum === "decelerating" ? "today" : "soon", rationale: explanation.reasons[0] };
  }
  if (signals.stage === "closed") {
    return { action: "Registrar resultado", channel: "CRM", urgency: "routine", rationale: "Oportunidade encerrada" };
  }
  return { action: "Fazer primeiro contato", channel: "WhatsApp", urgency: "today", rationale: explanation.reasons[0] };
}
