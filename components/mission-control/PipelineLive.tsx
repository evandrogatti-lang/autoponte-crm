import Link from "next/link";
import { APPanel, PipelineCard } from "../apdl";
import type { MissionControlViewModel, MissionOpportunity } from "../../lib/mission-control/model";

const stages: Array<{id: MissionOpportunity["stage"]; label: string}> = [
  { id: "new", label: "Novos" },
  { id: "contacted", label: "Contato" },
  { id: "qualified", label: "Qualificados" },
  { id: "store", label: "Com a loja" },
  { id: "proposal", label: "Propostas" },
  { id: "closed", label: "Resultados" },
];

export function PipelineLive({ model }: { model: MissionControlViewModel }) {
  return <APPanel title="Funil comercial ativo" action={<Link href="/funil">Abrir funil completo →</Link>}>
    <div className="mc-pipeline">
      {stages.map(stage => {
        const items = model.opportunities.filter(item => item.stage === stage.id).slice(0,3);
        return <section className="mc-pipeline-column" key={stage.id}>
          <header><h3>{stage.label}</h3><span>{model.opportunities.filter(item => item.stage === stage.id).length}</span></header>
          <div>{items.length ? items.map(item => <PipelineCard key={item.id} customer={item.name} vehicle={item.interest} nextAction={item.next} score={item.probability} age={item.offered}/>) : <p className="mc-empty">Sem qualificações nesta etapa.</p>}</div>
        </section>;
      })}
    </div>
  </APPanel>;
}
