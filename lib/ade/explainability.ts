import type { Explainability, OpportunityDNA, OpportunitySignals } from "./types";
import { daysUntil } from "./utils";

export function explainAssessment(signals: OpportunitySignals, dna: OpportunityDNA, now = new Date()): Explainability {
  const candidates: Array<{ score: number; text: string }> = [
    { score: dna.urgency, text: dna.urgency >= 80 ? "Retorno vencido ou previsto para hoje" : "Janela de contato está se aproximando" },
    { score: dna.margin, text: dna.margin >= 70 ? "Margem potencial acima da média" : "Margem ainda precisa ser validada" },
    { score: dna.engagement, text: dna.engagement >= 72 ? "Engajamento comercial consistente" : "Engajamento ainda moderado" },
    { score: dna.timing, text: dna.timing >= 75 ? "Timing favorável para avançar a negociação" : "Timing comercial ainda em formação" },
    { score: dna.chance, text: `Chance determinística de fechamento em ${dna.chance}%` },
  ];
  const reasons = candidates.sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.text);
  const warnings: string[] = [];
  const followUp = daysUntil(signals.nextFollowUp, now);
  if (!signals.nextFollowUp) warnings.push("Próximo contato não definido");
  if (followUp !== null && followUp < 0) warnings.push(`Follow-up atrasado ${Math.abs(followUp)} dia(s)`);
  if (!signals.desiredVehicle?.trim()) warnings.push("Interesse do cliente incompleto");
  if (!signals.lastContactAt) warnings.push("Último contato não registrado");
  return { reasons, warnings };
}
