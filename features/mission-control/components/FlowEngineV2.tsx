import type { FlowEngineView, Momentum, TemperatureLevel } from "../../../lib/ade";
import type { MissionOpportunity } from "../../../lib/mission-control/model";
import styles from "./FlowEngineV2.module.css";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function temperatureClass(level: TemperatureLevel) {
  return styles[level];
}

function dominantMomentum(accelerating: number, decelerating: number): Momentum {
  if (decelerating > accelerating) return "decelerating";
  if (accelerating > 0) return "accelerating";
  return "stable";
}

function momentumLabel(momentum: Momentum) {
  if (momentum === "accelerating") return "Acelerando";
  if (momentum === "decelerating") return "Perdendo força";
  return "Estável";
}

export function FlowEngineV2({ flow, opportunities }: { flow: FlowEngineView; opportunities: MissionOpportunity[] }) {
  const stageLinks = new Map(flow.stages.map((stage) => {
    const top = opportunities
      .filter((item) => item.stage === stage.key && item.status !== "lost")
      .sort((a, b) => b.priorityScore - a.priorityScore)[0];
    return [stage.key, top ? `/oportunidades/${top.id}` : `/oportunidades?stage=${stage.key}`];
  }));
  return (
    <article className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>FLOW ENGINE V2.2</span>
          <h2>Funil comercial ativo</h2>
          <p>{flow.health.summary}</p>
        </div>
        <div className={styles.health} data-health={flow.health.label}>
          <i aria-hidden="true" />
          <strong>{flow.health.score}</strong>
          <span>/100 · {flow.health.label}</span>
        </div>
      </header>

      <div className={styles.riskStrip}>
        <div>
          <span>Em risco</span>
          <strong>{flow.atRiskCount}</strong>
          <small>{brl.format(flow.atRiskValue)}</small>
        </div>
        <div>
          <span>Acelerando</span>
          <strong>{flow.acceleratingCount}</strong>
          <small>oportunidades</small>
        </div>
        <div>
          <span>Chance calibrada</span>
          <strong>{flow.weightedProbability}%</strong>
          <small>pipeline ativo</small>
        </div>
      </div>

      <div className={styles.flow} aria-label="Etapas do pipeline">
        {flow.stages.map((stage, index) => {
          const momentum = dominantMomentum(stage.accelerating, stage.decelerating);
          const bottleneck = flow.bottleneck.stage === stage.key;
          return (
            <a
              className={styles.stageCard}
              data-bottleneck={bottleneck || undefined}
              href={stageLinks.get(stage.key)}
              key={stage.key}
            >
              <div className={styles.stageTop}>
                <span>{stage.label}</span>
                <i className={`${styles.temperature} ${temperatureClass(stage.temperature.level)}`}>
                  {stage.temperature.label}
                </i>
              </div>

              <div className={styles.stageNumbers}>
                <strong>{stage.count}</strong>
                <span>{brl.format(stage.value)}</span>
              </div>

              <div className={styles.probability} aria-label={`${stage.averageProbability}% de chance calibrada`}>
                <span style={{ width: `${stage.averageProbability}%` }} />
              </div>

              <div className={styles.stageMeta}>
                <span>{stage.averageProbability}% chance calibrada</span>
                <span data-momentum={momentum}>{momentumLabel(momentum)}</span>
              </div>

              <div className={styles.stageSignals}>
                {stage.stalled > 0 && <b>{stage.stalled} travada{stage.stalled > 1 ? "s" : ""}</b>}
                {stage.highPriority > 0 && <em>{stage.highPriority} alta prioridade</em>}
                {stage.count === 0 && <small>Sem oportunidades</small>}
              </div>

              {bottleneck && <span className={styles.bottleneckFlag}>GARGALO</span>}
              {index < flow.stages.length - 1 && <span className={styles.arrow}>→</span>}
            </a>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <div>
          <span>Valor ativo</span>
          <strong>{brl.format(flow.activeValue)}</strong>
        </div>
        <div>
          <span>Valor em risco</span>
          <strong>{brl.format(flow.atRiskValue)}</strong>
        </div>
        <div className={styles.bottleneckSummary}>
          <span>Prioridade do fluxo</span>
          <strong>{flow.bottleneck.label}</strong>
          <small>{flow.bottleneck.reason}</small>
        </div>
        <div className={styles.nextAction}>
          <span>Próxima ação</span>
          <strong>{flow.bottleneck.nextAction}</strong>
          <a href={flow.bottleneck.stage ? `/oportunidades?stage=${flow.bottleneck.stage}` : "/oportunidades"}>
            Abrir etapa
          </a>
        </div>
      </footer>
    </article>
  );
}
