import { HeatMap, KPICard, PulseIndicator, Radar, WorkspaceGrid } from "../apdl";
import type { MissionControlViewModel } from "../../lib/mission-control/model";
import { brl } from "./format";

export function OperationOverview({ model }: { model: MissionControlViewModel }) {
  return <section className="mc-overview">
    <div className="mc-pulse-panel">
      <PulseIndicator value={model.operationScore} label="Pulso"/>
      <div><span>SAÚDE DA OPERAÇÃO</span><h2>Operação saudável</h2><p>O principal ponto de atenção são retornos vencidos e oportunidades sem próxima ação.</p></div>
    </div>
    <Radar items={[
      { label: "Comercial", value: 97 },
      { label: "Estoque", value: 84 },
      { label: "Financeiro", value: 90 },
      { label: "Atendimento", value: Math.max(70, 94 - model.immediateActions) },
    ]}/>
    <HeatMap items={[
      { label: "Conversão", value: Math.max(15, model.conversion) },
      { label: "Retornos", value: Math.min(100, model.immediateActions * 18) },
      { label: "Trocas", value: 64 },
      { label: "Documentos", value: 38 },
    ]}/>
    <WorkspaceGrid columns={4}>
      <KPICard label="Oportunidades ativas" value={String(model.activeCount)} trend={`${model.highPriority} prioritárias`} tone="success"/>
      <KPICard label="Potencial do funil" value={brl.format(model.activeValue)} trend={`${model.proposalCount} propostas`} tone="neutral"/>
      <KPICard label="Capital necessário" value={brl.format(model.capitalNeeded)} trend="Trocas em curso" tone="warning"/>
      <KPICard label="Conversão" value={`${model.conversion}%`} trend={`Ticket ${brl.format(model.averageTicket)}`} tone="ai"/>
    </WorkspaceGrid>
  </section>;
}
