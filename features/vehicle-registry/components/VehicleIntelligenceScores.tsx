import { type VehicleIntelligenceResult, type VehicleScore, vqiClassification } from "../../../lib/vehicle-intelligence/scoring";
import styles from "./VehicleRegistry.module.css";

const scoreLabels = {
  DCI: "Completude dos Dados (DCI)",
  DCQ: "Qualidade e Confiabilidade dos Dados (DCQ)",
  VQI: "Índice de Qualidade do Veículo (VQI)",
  CVI: "Índice de Valor Comercial (CVI)",
} as const;

const statusLabels = {
  INSUFFICIENT_DATA: "Dados insuficientes",
  PROVISIONAL: "Provisório",
  RELIABLE: "Confiável",
  VERIFIED: "Verificado",
} as const;

function ScoreDetails({ score }: { score: VehicleScore }) {
  return (
    <details className={styles.intelligenceDetails}>
      <summary>Por que esta nota?</summary>
      <div className={styles.intelligenceComponents}>
        {score.components.map((component) => (
          <div key={component.key}>
            <span>{component.label}</span>
            <strong>{component.available ? `${component.score}${component.earned !== undefined ? ` (${component.earned}/${component.maximum})` : ""}` : "Indisponível"}</strong>
          </div>
        ))}
      </div>
      {score.reasonCodes.length ? <p><b>Motivos da pontuação:</b> {score.reasonCodes.join(", ")}</p> : null}
      {score.missingEvidence.length ? <p><b>Evidências pendentes:</b> {score.missingEvidence.join(", ")}</p> : null}
    </details>
  );
}

export function VehicleIntelligenceScores({ scores }: { scores: VehicleIntelligenceResult }) {
  const vqi = scores.VQI;
  return (
    <section className={styles.card}>
      <header><div><span>IA E QUALIDADE</span><h2>Pontuação de Inteligência</h2></div></header>
      <div className={styles.intelligenceScores}>
        {(Object.keys(scoreLabels) as Array<keyof typeof scoreLabels>).map((key) => {
          const score = scores[key];
          return <div key={key} className={styles.intelligenceScore}><span>{scoreLabels[key]}</span><strong>{score.score}</strong><small>{statusLabels[score.status]}</small></div>;
        })}
      </div>
      <div className={styles.intelligenceVqi}>
        <div><span>Confiança do VQI</span><strong>{vqi.confidence}%</strong></div>
        <div><span>Status do VQI</span><strong>{statusLabels[vqi.status]}</strong></div>
        <div><span>Classificação</span><strong>{vqi.confidence < 50 ? "Dados insuficientes" : vqiClassification(vqi.score)}</strong></div>
      </div>
      <div className={styles.intelligenceExplainability}>
        <ScoreDetails score={scores.DCI} />
        <ScoreDetails score={scores.DCQ} />
        <ScoreDetails score={scores.VQI} />
        <ScoreDetails score={scores.CVI} />
      </div>
    </section>
  );
}
