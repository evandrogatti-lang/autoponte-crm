import { AIInsightCard, APButton, APPanel, CashFlowWidget, DecisionPanel, NotificationCenter, Timeline } from "../apdl";
import type { MissionControlViewModel } from "../../lib/mission-control/model";
import { brl } from "./format";

export function DecisionRail({ model }: { model: MissionControlViewModel }) {
  const hottest = [...model.opportunities].sort((a,b)=>b.probability-a.probability)[0];
  return <aside className="mc-decision-rail">
    <APPanel title="Copiloto operacional">
      <AIInsightCard
        finding={`${hottest.name} deve ser priorizado agora`}
        reason={`${hottest.probability}% de chance, ${hottest.next.toLowerCase()} e ${brl.format(hottest.marginPotential)} de margem potencial.`}
        confidence={92}
        action={<APButton variant="secondary">Preparar contato</APButton>}
      />
      <DecisionPanel decisions={[
        { title: "Atacar retornos vencidos", detail: `${model.immediateActions} ações exigem resposta hoje.` },
        { title: "Reservar capital", detail: `${brl.format(model.capitalNeeded)} para trocas em curso.` },
        { title: "Revisar propostas", detail: `${model.proposalCount} negociações estão em decisão.` },
      ]}/>
    </APPanel>
    <APPanel title="Agenda operacional">
      <Timeline events={[
        { time: "09:30", title: "Retornar Mariana", detail: "Proposta Jeep Compass" },
        { time: "11:00", title: "Avaliar Honda City", detail: "Vistoria e fotos" },
        { time: "14:30", title: "Revisar documentação", detail: "Financiamento Lucas" },
        { time: "16:00", title: "Contato com parceiro", detail: "Confirmar disponibilidade" },
      ]}/>
    </APPanel>
    <APPanel title="Caixa e capacidade">
      <CashFlowWidget available={brl.format(model.activeValue)} committed={brl.format(model.capitalNeeded)} required={brl.format(Math.max(0, model.capitalNeeded - model.projectedMargin))}/>
    </APPanel>
    <APPanel title="Alertas">
      <NotificationCenter items={[
        { title: `${model.immediateActions} retornos imediatos`, tone: "danger" },
        { title: `${model.highPriority} leads de alta prioridade`, tone: "warning" },
        { title: "Banco e APIs operacionais", tone: "success" },
      ]}/>
    </APPanel>
  </aside>;
}
