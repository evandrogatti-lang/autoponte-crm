"use client";

import { useMemo, useState } from "react";

type Journey = {
  id: "compra" | "troca" | "consigna";
  label: string;
  client: string;
  initials: string;
  vehicle: string;
  value: string;
  color: string;
  stages: Array<{ title: string; area: string; event: string; clientView: string; crm: string }>;
};

const journeys: Journey[] = [
  {
    id: "compra", label: "Compra direta", client: "Marina Oliveira", initials: "MO", vehicle: "SUV Urban 1.5 Turbo", value: "R$ 119.900", color: "lime",
    stages: [
      { title: "Cadastro", area: "Portal", event: "Marina chega por um anúncio e informa nome, WhatsApp, e-mail, cidade e consentimentos.", clientView: "Cadastro confirmado e protocolo AP-1001 criado.", crm: "Lead novo • origem Instagram • autorização de contato registrada." },
      { title: "Primeiro atendimento", area: "Assistente IA", event: "A IA identifica uso familiar, orçamento de R$ 125 mil, entrada de R$ 30 mil e preferência por SUV automático.", clientView: "Resumo enviado no chat e por e-mail, sem repetir perguntas.", crm: "Perfil de compra estruturado • prioridade alta • compra em até 30 dias." },
      { title: "Recomendação", area: "AutoPonte Match", event: "O SUV Urban recebe 92% de compatibilidade por preço, categoria, ano, câmbio e localização.", clientView: "Oferta explicada com botão para detalhes e simulação.", crm: "Correspondência aprovada para contato • estoque da Loja Avenida." },
      { title: "Simulação", area: "Crédito", event: "Entrada de R$ 30 mil e saldo simulado em 48 meses. A condição é marcada como orientativa.", clientView: "Parcela estimada e documentos necessários apresentados.", crm: "Simulação anexada • interesse confirmado • sem promessa de aprovação." },
      { title: "Encaminhamento", area: "CRM da loja", event: "A Loja Avenida recebe perfil, veículo, simulação, origem e histórico completo do atendimento.", clientView: "Marina é apresentada ao consultor Rafael pelo canal oficial.", crm: "SLA iniciado • responsável Rafael • visita agendada para sábado, 10h." },
      { title: "Acompanhamento", area: "AutoPonte", event: "Lembrete da visita, confirmação de disponibilidade e pesquisa após o test-drive.", clientView: "Linha do tempo mostra visita confirmada e proposta em análise.", crm: "Test-drive realizado • proposta enviada • retorno agendado para o mesmo dia." },
      { title: "Fechamento", area: "Loja parceira", event: "Crédito aprovado, contrato assinado e pagamento confirmado diretamente com a loja.", clientView: "Status alterado para compra concluída, com orientações de retirada.", crm: "Venda atribuída à AutoPonte • valor R$ 119.900 • documentos validados." },
      { title: "Pós-venda", area: "Relacionamento", event: "Marina recebe pesquisa de satisfação e lembretes de documentação e revisão.", clientView: "Canal permanece disponível para suporte pós-entrega.", crm: "Entrega concluída • NPS solicitado • oportunidade encerrada como ganha." },
    ],
  },
  {
    id: "troca", label: "Compra com troca", client: "Carlos Mendes", initials: "CM", vehicle: "Sedan Executive 2.0", value: "R$ 104.900", color: "blue",
    stages: [
      { title: "Cadastro", area: "Portal", event: "Carlos escolhe o Sedan Executive e informa que usará um Honda Fit 2018 como parte do pagamento.", clientView: "Compra e avaliação ficam vinculadas ao mesmo protocolo AP-2001.", crm: "Lead de compra com troca • consentimento e veículo desejado registrados." },
      { title: "Primeiro atendimento", area: "Assistente IA", event: "A IA coleta orçamento, entrada complementar, parcela desejada e dados básicos do Honda Fit.", clientView: "Carlos recebe uma lista guiada de fotos e documentos.", crm: "Perfil comprador + ativo de troca conectados na mesma oportunidade." },
      { title: "Fotos e FIPE", area: "AutoPonte Fotos", event: "Fotos externas, internas e avarias são enviadas. A FIPE é consultada automaticamente.", clientView: "Referência FIPE de R$ 64.300 e análise visual preliminar exibidas.", crm: "8 fotos armazenadas • enquadramento aprovado • pequena avaria no para-choque sinalizada." },
      { title: "Pré-avaliação", area: "Avaliação IA", event: "Faixa preliminar de R$ 54 mil a R$ 57 mil, condicionada à compra, documentos e vistoria cautelar.", clientView: "Diferença para a FIPE e critérios da oferta são explicados.", crm: "Lead classificado como quente • vistoria presencial solicitada." },
      { title: "Vistoria e proposta", area: "Operação", event: "Vistoria totalmente aprovada, sem apontamento grave, leilão ou dano estrutural. Oferta final: R$ 56.500.", clientView: "Carlos aceita a avaliação e autoriza usar o Fit na negociação.", crm: "Oferta aceita • laudo anexado • saldo do novo veículo recalculado." },
      { title: "Ponte comercial", area: "CRM da loja", event: "A loja recebe compra, troca, fotos, FIPE, laudo, oferta aceita e simulação do saldo.", clientView: "Um único consultor conduz a etapa comercial e contratual.", crm: "Sedan reservado • Fit marcado para entrada • documentação em conferência." },
      { title: "Fechamento", area: "Loja + AutoPonte", event: "Contrato do Sedan é assinado; o Fit entra por R$ 56.500 e o saldo é liquidado conforme aprovação.", clientView: "Carlos acompanha aprovação, assinatura e data de retirada.", crm: "Venda concluída • troca adquirida • rastreabilidade financeira registrada." },
      { title: "Novo estoque", area: "AutoPonte Match", event: "O Fit aprovado entra na preparação para revenda e é cruzado com compradores compatíveis.", clientView: "Carlos recebe comprovante de entrega e encerra sua participação no veículo.", crm: "Novo ativo em preparação • potenciais compradores encontrados • contato sujeito a revisão." },
    ],
  },
  {
    id: "consigna", label: "Consignação", client: "Renata Souza", initials: "RS", vehicle: "Jeep Renegade 2021", value: "Pretensão R$ 86.900", color: "amber",
    stages: [
      { title: "Cadastro", area: "AutoPonte Consigna", event: "Renata informa dados pessoais, veículo, preço pretendido, valor mínimo e consentimentos.", clientView: "Protocolo AP-3001 e acesso ao portal do proprietário são criados.", crm: "Solicitação de consignação • origem indicação • canal oficial ativado." },
      { title: "Pré-avaliação remota", area: "AutoPonte Fotos", event: "Renata envia 8 fotos para triagem de conservação, enquadramento e possíveis avarias.", clientView: "Fotos aceitas para pré-análise; vistoria presencial continua obrigatória.", crm: "Qualidade suficiente • risco visual baixo • agendamento recomendado." },
      { title: "Vistoria e contrato", area: "Operação", event: "Laudo aprovado sem histórico de leilão ou dano grave. Preço, despesas, prazo e autorizações são formalizados.", clientView: "Renata revisa e aceita o contrato de consignação.", crm: "Veículo aprovado • preço anunciado R$ 86.900 • mínimo autorizado R$ 83.000." },
      { title: "Preparação", area: "Estoque virtual", event: "Higienização, sessão profissional de fotos e descrição comercial são concluídas.", clientView: "Renata acompanha tarefas e autoriza a publicação final.", crm: "Anúncio pronto • checklist documental completo • publicação autorizada." },
      { title: "Divulgação e Match", area: "Marketing + IA", event: "Anúncio entra no portal e campanhas. A IA encontra quatro compradores compatíveis no banco.", clientView: "Painel mostra visualizações, contatos e visitas sem expor dados dos compradores.", crm: "4 matches • 7 leads • 2 visitas • mensagens revisadas antes do envio." },
      { title: "Oferta", area: "Canal oficial", event: "Surge proposta de R$ 84.500. Renata recebe valores, taxas e líquido estimado para decidir.", clientView: "Ela pode aceitar, recusar ou contrapropor pelo portal.", crm: "Oferta aguardando proprietário • prazo de resposta de 24 horas." },
      { title: "Autorização e venda", area: "Loja parceira", event: "Renata aceita R$ 84.500 e autoriza a venda. Comprador conclui crédito e contrato.", clientView: "Documentos e autorização ficam registrados na linha do tempo.", crm: "Proposta aceita • venda autorizada • transferência iniciada." },
      { title: "Repasse e encerramento", area: "Financeiro", event: "Transferência confirmada, despesas conciliadas e valor líquido repassado conforme contrato.", clientView: "Renata recebe demonstrativo, comprovante e confirmação de encerramento.", crm: "Consignação vendida • repasse concluído • documentos arquivados." },
    ],
  },
];

export default function DemonstracaoPage() {
  const [selected, setSelected] = useState<Journey["id"]>("compra");
  const [progress, setProgress] = useState<Record<Journey["id"], number>>({ compra: 0, troca: 0, consigna: 0 });
  const journey = journeys.find((item) => item.id === selected)!;
  const current = progress[selected];
  const stage = journey.stages[current];
  const completed = Object.values(progress).filter((value) => value === 7).length;
  const totalEvents = Object.values(progress).reduce((sum, value) => sum + value + 1, 0);
  const percent = useMemo(() => Math.round(((current + 1) / journey.stages.length) * 100), [current, journey]);
  function advance() { setProgress((state) => ({ ...state, [selected]: Math.min(7, state[selected] + 1) })); }
  function back() { setProgress((state) => ({ ...state, [selected]: Math.max(0, state[selected] - 1) })); }
  function resetAll() { setProgress({ compra: 0, troca: 0, consigna: 0 }); setSelected("compra"); }

  return <main className="demo-page">
    <header className="demo-header"><a className="brand" href="/"><span>AutoPonte</span> Veículos</a><div><span>Ambiente de demonstração</span><a href="/">Voltar ao portal</a></div></header>
    <section className="demo-hero"><div><p className="eyebrow">Operação integrada</p><h1>Três clientes. Uma visão completa da AutoPonte.</h1><p>Avance pelas jornadas para acompanhar o que o cliente vê, o que a IA organiza e o que chega ao CRM até o fechamento.</p></div><div className="demo-kpis"><article><span>Jornadas concluídas</span><strong>{completed}/3</strong></article><article><span>Eventos simulados</span><strong>{totalEvents}/24</strong></article><article><span>Envios reais</span><strong>0</strong></article></div></section>

    <nav className="journey-tabs" aria-label="Escolher jornada">{journeys.map((item) => <button key={item.id} className={selected === item.id ? "active" : ""} onClick={() => setSelected(item.id)}><span className={`journey-avatar ${item.color}`}>{item.initials}</span><span><b>{item.client}</b><small>{item.label}</small></span><em>{progress[item.id] + 1}/8</em></button>)}</nav>

    <section className="demo-shell">
      <div className="demo-main">
        <div className="demo-progress-head"><div><span>{journey.label}</span><h2>{journey.client}</h2><p>{journey.vehicle} • {journey.value}</p></div><div className="progress-value"><strong>{percent}%</strong><span>da jornada</span></div></div>
        <div className="stage-track">{journey.stages.map((item, index) => <button key={item.title} className={index === current ? "current" : index < current ? "done" : ""} onClick={() => setProgress((state) => ({ ...state, [selected]: index }))}><i>{index < current ? "✓" : index + 1}</i><span>{item.title}</span></button>)}</div>

        <article className="active-stage"><div className="stage-label"><span>Etapa {current + 1} de 8</span><b>{stage.area}</b></div><h2>{stage.title}</h2><p className="event-copy">{stage.event}</p><div className="integration-grid"><section><span className="integration-icon client">CL</span><div><small>VISÃO DO CLIENTE</small><p>{stage.clientView}</p></div></section><section><span className="integration-icon ai">IA</span><div><small>REGISTRO E AUTOMAÇÃO</small><p>{stage.crm}</p></div></section></div><div className="demo-actions"><button className="demo-back" onClick={back} disabled={current === 0}>← Etapa anterior</button><button className="demo-next" onClick={advance} disabled={current === 7}>{current === 7 ? "Jornada concluída" : "Avançar simulação →"}</button></div></article>
      </div>

      <aside className="demo-side"><section><span className="live-dot">● SIMULAÇÃO ATIVA</span><h3>Resumo da oportunidade</h3><dl><div><dt>Cliente</dt><dd>{journey.client}</dd></div><div><dt>Operação</dt><dd>{journey.label}</dd></div><div><dt>Veículo</dt><dd>{journey.vehicle}</dd></div><div><dt>Valor</dt><dd>{journey.value}</dd></div><div><dt>Responsável atual</dt><dd>{stage.area}</dd></div><div><dt>Status</dt><dd>{current === 7 ? "Concluído" : stage.title}</dd></div></dl></section><section className="demo-safety"><strong>Teste seguro</strong><p>Dados fictícios, sem mensagens, e-mails, reservas, contratos ou movimentações financeiras reais.</p><button onClick={resetAll}>Reiniciar as três jornadas</button></section><section className="demo-flow"><strong>Módulos conectados</strong><span>Portal e anúncios</span><i>↓</i><span>Atendimento IA</span><i>↓</i><span>Match, Fotos e FIPE</span><i>↓</i><span>CRM e loja parceira</span><i>↓</i><span>Acompanhamento e fechamento</span></section></aside>
    </section>
  </main>;
}
