import {
  AIInsightCard, APButton, APPanel, CashFlowWidget, CommandPalette, DecisionPanel,
  EnterpriseSidebar, HeatMap, KPICard, MissionCard, MissionControlHeader,
  NotificationCenter, OpportunityScore, PipelineCard, PulseIndicator, Radar,
  SmartFilters, UniversalSearch, VehicleCard, WorkspaceGrid,
} from "../../components/apdl";

export default function APDLShowcasePage() {
  return <main className="ap-showcase-shell">
    <EnterpriseSidebar items={[{label:"Mission Control",href:"/crm",active:true},{label:"Clientes",href:"#"},{label:"Estoque",href:"#"},{label:"Trocas",href:"/oportunidades"},{label:"Match IA",href:"/matches"}]}/>
    <div className="ap-showcase-main">
      <MissionControlHeader title="APDL Foundation" subtitle="Biblioteca operacional, intuitiva e preparada para IA com custo controlado." actions={<APButton>Nova oportunidade</APButton>}/>
      <CommandPalette/>
      <SmartFilters filters={["Hoje","Esta semana","Minha loja","Alta prioridade"]}/>
      <WorkspaceGrid columns={4}>
        <KPICard label="Leads ativos" value="42" trend="+8 hoje" tone="success"/>
        <KPICard label="Conversão" value="24,8%" trend="+2,1 p.p."/>
        <KPICard label="Trocas pendentes" value="11" trend="R$ 730 mil" tone="warning"/>
        <KPICard label="Margem prevista" value="R$ 186 mil" trend="próximos 30 dias"/>
      </WorkspaceGrid>
      <div className="ap-showcase-layout">
        <div className="ap-showcase-content">
          <APPanel title="Missão do dia" action={<APButton variant="ghost">Ver todas</APButton>}>
            <div className="ap-stack">
              <MissionCard title="Retornar João Silva" description="Financiamento aprovado e veículo disponível. Sem contato há 18 horas." impact="Potencial: R$ 168 mil" tone="success" action={<APButton>WhatsApp</APButton>}/>
              <MissionCard title="Revisar avaliação do Compass" description="A margem projetada está acima da média, mas a vistoria exige revisão." impact="Margem estimada: R$ 13,2 mil" tone="warning" action={<APButton variant="secondary">Revisar</APButton>}/>
            </div>
          </APPanel>
          <APPanel title="Pipeline vivo">
            <WorkspaceGrid columns={3}>
              <PipelineCard customer="João Silva" vehicle="Corolla Cross 2024" nextAction="Ligar hoje" score={96} age="18h sem contato"/>
              <PipelineCard customer="Maria Costa" vehicle="Jeep Compass 2023" nextAction="Enviar proposta" score={88} age="2h desde resposta"/>
              <PipelineCard customer="Carlos Lima" vehicle="Civic Touring 2022" nextAction="Agendar vistoria" score={81} age="1 dia na etapa"/>
            </WorkspaceGrid>
          </APPanel>
          <APPanel title="Estoque inteligente">
            <WorkspaceGrid columns={2}>
              <VehicleCard vehicle="Toyota Corolla Cross XRX" price="R$ 169.900" meta="2024 · 18.400 km · SBC" score={92}/>
              <VehicleCard vehicle="Jeep Compass Limited" price="R$ 142.500" meta="2023 · 31.200 km · Santo André" score={84}/>
            </WorkspaceGrid>
          </APPanel>
        </div>
        <aside className="ap-showcase-rail">
          <APPanel title="Pulse"><PulseIndicator value={92}/></APPanel>
          <APPanel title="Copiloto"><AIInsightCard finding="Existe uma oportunidade de fechamento hoje" reason="Cliente respondeu recentemente, financiamento aprovado e veículo ainda disponível." confidence={94} action={<APButton variant="secondary">Abrir cliente</APButton>}/></APPanel>
          <APPanel title="Três decisões"><DecisionPanel decisions={[{title:"Ligar para João",detail:"Maior probabilidade de fechamento"},{title:"Revisar Compass",detail:"Margem acima da média"},{title:"Ajustar Civic",detail:"Preço 3,1% acima do mercado"}]}/></APPanel>
          <APPanel title="Radar"><Radar items={[{label:"Comercial",value:97},{label:"Estoque",value:84},{label:"Financeiro",value:90},{label:"Atendimento",value:95}]}/></APPanel>
          <APPanel title="Caixa"><CashFlowWidget available="R$ 1,52 mi" committed="R$ 730 mil" required="R$ 1,18 mi"/></APPanel>
          <APPanel title="Alertas"><NotificationCenter items={[{title:"2 reservas vencem hoje",tone:"warning"},{title:"1 documentação atrasada",tone:"danger"},{title:"7 oportunidades com score > 90",tone:"success"}]}/></APPanel>
        </aside>
      </div>
      <APPanel title="Mapa de calor"><HeatMap items={[{label:"Follow-ups",value:78},{label:"Avaliações",value:46},{label:"Documentos",value:21},{label:"Estoque parado",value:63}]}/></APPanel>
      <UniversalSearch/>
    </div>
  </main>;
}
