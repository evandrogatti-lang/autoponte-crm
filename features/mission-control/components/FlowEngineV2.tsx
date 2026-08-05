import type { FlowEngineView, Momentum, TemperatureLevel } from "../../../lib/ade";
import styles from "./FlowEngineV2.module.css";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function temperatureClass(level: TemperatureLevel) {
  return styles[level];
}

function momentumLabel(momentum: Momentum) {
  return momentum === "accelerating" ? "Acelerando" : momentum === "decelerating" ? "Perdendo força" : "Estável";
}

export function FlowEngineV2({ flow }: { flow: FlowEngineView }) {
  return (
    <article className={styles.panel}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>FLOW ENGINE V2</span>
          <h2>Pipeline vivo</h2>
          <p>{flow.health.summary}</p>
        </div>
        <div className={styles.health} data-label={flow.health.label}>
          <strong>{flow.health.score}</strong>
          <span>/100 · {flow.health.label}</span>
        </div>
      </header>

      <div className={styles.flow}>
        {flow.stages.map((stage, index) => {
          const dominantMomentum: Momentum = stage.decelerating > stage.accelerating
            ? "decelerating"
            : stage.accelerating > 0 ? "accelerating" : "stable";
          return (
            <div className={styles.stage} key={stage.key} data-bottleneck={flow.bottleneck.stage === stage.key || undefined}>
              <div className={styles.stageTop}>
                <span>{stage.label}</span>
                <i className={`${styles.temperature} ${temperatureClass(stage.temperature.level)}`}>{stage.temperature.label}</i>
              </div>
              <div className={styles.stageNumbers}>
                <strong>{stage.count}</strong>
                <span>{brl.format(stage.value)}</span>
              </div>
              <div className={styles.stageMeta}>
                <span>{stage.averageProbability}% chance</span>
                <span data-momentum={dominantMomentum}>{momentumLabel(dominantMomentum)}</span>
              </div>
              {index < flow.stages.length - 1 && <b className={styles.arrow}>→</b>}
            </div>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <div>
          <span>Valor ativo</span>
          <strong>{brl.format(flow.activeValue)}</strong>
        </div>
        <div>
          <span>Probabilidade ponderada</span>
          <strong>{flow.weightedProbability}%</strong>
        </div>
        <div className={styles.bottleneck}>
          <span>Gargalo</span>
          <strong>{flow.bottleneck.label}</strong>
          <small>{flow.bottleneck.reason}</small>
        </div>
      </footer>
    </article>
  );
}
