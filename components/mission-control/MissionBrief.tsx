import { APBadge, APButton, MissionCard, MissionControlHeader, SmartFilters } from "../apdl";
import type { MissionControlViewModel } from "../../lib/mission-control/model";
import { brl } from "./format";

export function MissionBrief({ model }: { model: MissionControlViewModel }) {
  const ranked = [...model.opportunities]
    .filter(item => item.stage !== "closed")
    .sort((a,b) => (b.probability + b.marginPotential / 1000) - (a.probability + a.marginPotential / 1000))
    .slice(0,3);
  const impact = ranked.reduce((sum,item)=>sum+item.value,0);
  return <>
    <MissionControlHeader
      title={model.greeting}
      subtitle={`Hoje existem ${model.immediateActions} ações imediatas e ${model.highPriority} oportunidades prioritárias.`}
      actions={<APBadge tone="success">Operação online</APBadge>}
    />
    <div className="mc-filter-row"><SmartFilters filters={["Hoje", "Todas as lojas", "Todos os vendedores"]}/></div>
    <section className="mc-mission-zone">
      <div className="mc-mission-intro">
        <span>MISSÃO DO DIA</span>
        <h2>Três decisões podem movimentar {brl.format(impact)}.</h2>
        <p>Prioridades ordenadas por probabilidade, urgência e margem potencial.</p>
      </div>
      <div className="mc-mission-list">
        {ranked.map((item,index)=><MissionCard
          key={item.id}
          tone={index === 0 ? "success" : index === 1 ? "warning" : "ai"}
          title={`${index + 1}. ${item.name} — ${item.interest}`}
          description={`${item.next}. ${item.probability}% de probabilidade; risco ${item.risk}.`}
          impact={`${brl.format(item.value)} em negócio · ${brl.format(item.marginPotential)} de margem potencial`}
          action={<APButton variant={index === 0 ? "primary" : "secondary"}>Abrir ação</APButton>}
        />)}
      </div>
    </section>
  </>;
}
