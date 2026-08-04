"use client";

import { useEffect, useMemo, useState } from "react";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type Decision = "pending" | "accepted" | "declined" | "countered";
type MaintenanceDecision = "pending" | "approved" | "declined";

const timeline = [
  { title: "Veículo recebido", detail: "Checklist de entrada e 2 chaves confirmados", date: "28 jul. • 10:20", done: true },
  { title: "Fotos profissionais aprovadas", detail: "12 imagens e relatório visual disponíveis", date: "28 jul. • 16:45", done: true },
  { title: "Anúncio publicado", detail: "Divulgação ativa no AutoPonte Veículos", date: "29 jul. • 09:10", done: true },
  { title: "Proposta aguardando você", detail: "Validade até amanhã, às 18h", date: "Hoje • 11:32", done: false },
];

export default function ConsignmentPage() {
  const [offerDecision, setOfferDecision] = useState<Decision>("pending");
  const [maintenanceDecision, setMaintenanceDecision] = useState<MaintenanceDecision>("pending");
  const [counterValue, setCounterValue] = useState(67600);
  const [counterOpen, setCounterOpen] = useState(false);
  const [withdrawalRequested, setWithdrawalRequested] = useState(false);
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [ownerName, setOwnerName] = useState("Evandro Gatti");
  const [vehicle, setVehicle] = useState({ protocol: "APC-2407", name: "Sedan Executive 2.0", year: "2022/2023", mileage: 42100, askingPrice: 71900, minimumPrice: 65000 });
  const [liveProfile, setLiveProfile] = useState(false);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("protocolo");
    const token = params.get("token");
    if (!id && !token) return;
    if (!id || !token) { setAccessError("O link de acompanhamento está incompleto."); return; }
    fetch(`/api/consignments?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json() as Record<string, string | number> & { error?: string };
        if (!response.ok) throw new Error(data.error || "Não foi possível abrir o acompanhamento.");
        setOwnerName(String(data.owner_name));
        setVehicle({ protocol: String(data.id).slice(0, 8).toUpperCase(), name: String(data.vehicle_name), year: String(data.year), mileage: Number(data.mileage), askingPrice: Number(data.asking_price), minimumPrice: Number(data.minimum_price) });
        setLiveProfile(true);
      })
      .catch((problem) => setAccessError(problem instanceof Error ? problem.message : "Não foi possível abrir o acompanhamento."));
  }, []);

  const offerStatus = useMemo(() => ({
    pending: "Aguardando sua decisão",
    accepted: "Proposta aceita",
    declined: "Proposta recusada",
    countered: `Contraproposta de ${brl.format(counterValue)} enviada`,
  }[offerDecision]), [counterValue, offerDecision]);

  function decideOffer(decision: Decision) {
    setOfferDecision(decision);
    setCounterOpen(false);
  }

  return (
    <main className="consignment-page">
      <header className="consignment-header">
        <a className="brand" href="/"><span>AutoPonte</span> Consigna</a>
        <div className="owner-identity">
          <span>Portal do proprietário</span>
          <strong>{ownerName}</strong>
          <a href="/">Sair e voltar ao site</a>
        </div>
      </header>

      <section className="consignment-banner">
        <div>
          <p className="eyebrow">Acompanhamento transparente</p>
          <h1>Seu carro em consignação, sem ficar no escuro.</h1>
          <p>Este é o canal oficial para acompanhar o anúncio, responder propostas, autorizar serviços e solicitar a retirada do veículo.</p>
        </div>
        <div className="consignment-vehicle-card">
          <img src="/vehicle-sedan.png" alt="Sedan Executive 2.0 consignado" />
          <div><span>{vehicle.protocol}</span><strong>{vehicle.name}</strong><small>{vehicle.year} • {vehicle.mileage.toLocaleString("pt-BR")} km</small></div>
        </div>
      </section>

      <nav className="owner-tabs" aria-label="Seções do portal do consignante">
        {[
          ["visao-geral", "Visão geral"],
          ["propostas", "Propostas", liveProfile ? "" : "1"],
          ["manutencao", "Manutenção", liveProfile ? "" : "1"],
          ["documentos", "Documentos"],
          ["mensagens", "Mensagens"],
        ].map(([id, label, count]) => (
          <button className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} key={id}>
            {label}{count && <b>{count}</b>}
          </button>
        ))}
      </nav>

      <div className="consignment-shell">
        {accessError && <p className="portal-access-error" role="alert">{accessError} Você ainda pode navegar pela demonstração abaixo.</p>}
        {liveProfile && <div className="live-profile-note"><strong>Solicitação registrada</strong><span>Este acompanhamento foi criado com os dados enviados. Propostas, documentos e desempenho serão liberados conforme o avanço da consignação.</span></div>}
        {activeTab === "visao-geral" && <>
          <section className="owner-metrics" aria-label="Resumo do anúncio">
            <article><span>Status</span><strong className="status-live">{liveProfile ? "Análise inicial" : "Anúncio ativo"}</strong><small>{liveProfile ? "Aguardando contato AutoPonte" : "Publicado há 5 dias"}</small></article>
            <article><span>Preço pretendido</span><strong>{brl.format(vehicle.askingPrice)}</strong><small>Valor mínimo para análise: {brl.format(vehicle.minimumPrice)}</small></article>
            <article><span>Desempenho</span><strong>{liveProfile ? "Ainda não publicado" : "482 visualizações"}</strong><small>{liveProfile ? "Métricas após aprovação" : "17 contatos • 3 visitas"}</small></article>
            <article><span>Próxima ação</span><strong>{liveProfile ? "Confirmar vistoria" : "Responder proposta"}</strong><small>{liveProfile ? "A equipe fará o contato" : "Validade: amanhã, 18h"}</small></article>
          </section>

          <section className="owner-grid">
            <article className="owner-panel activity-panel">
              <div className="panel-heading"><div><p className="eyebrow dark">Andamento</p><h2>Histórico do veículo</h2></div><span>Atualizado agora</span></div>
              <ol className="vehicle-timeline">
                {timeline.map((item) => <li className={item.done ? "done" : "current"} key={item.title}>
                  <i aria-hidden="true" />
                  <div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.date}</small></div>
                </li>)}
              </ol>
            </article>

            <aside className="owner-panel official-channel">
              <span className="channel-icon">✓</span>
              <h2>Canal oficial AutoPonte</h2>
              <p>Notificações chegam por WhatsApp e e-mail, mas propostas, autorizações e alterações ficam registradas aqui.</p>
              <button onClick={() => setActiveTab("mensagens")}>Abrir mensagens</button>
            </aside>
          </section>
        </>}

        {activeTab === "propostas" && liveProfile && <div className="owner-panel crm-empty">Nenhuma proposta disponível. Você será avisado por WhatsApp e e-mail quando houver uma decisão a tomar.</div>}
        {activeTab === "propostas" && !liveProfile && <section className="decision-layout">
          <article className="owner-panel proposal-card">
            <div className="proposal-top"><div><p className="eyebrow dark">Proposta recebida hoje</p><h2>{brl.format(67000)}</h2></div><span className={`decision-status ${offerDecision}`}>{offerStatus}</span></div>
            <div className="proposal-breakdown">
              <div><span>Valor proposto</span><strong>{brl.format(67000)}</strong></div>
              <div><span>Preparação autorizada</span><strong>− {brl.format(480)}</strong></div>
              <div className="net"><span>Valor líquido previsto</span><strong>{brl.format(66520)}</strong></div>
            </div>
            <p className="proposal-note">Pagamento à vista. Sem veículo na troca. Proposta válida até amanhã, às 18h. A aceitação inicia a conferência documental, mas não substitui a assinatura dos documentos da venda.</p>
            {offerDecision === "pending" && <div className="decision-actions">
              <button className="accept" onClick={() => decideOffer("accepted")}>Aceitar proposta</button>
              <button onClick={() => setCounterOpen(true)}>Fazer contraproposta</button>
              <button className="quiet" onClick={() => decideOffer("declined")}>Recusar</button>
            </div>}
            {counterOpen && <div className="counter-box">
              <label>Valor da contraproposta<input type="number" min="67000" step="100" value={counterValue} onChange={(event) => setCounterValue(Number(event.target.value))} /></label>
              <button onClick={() => decideOffer("countered")}>Enviar {brl.format(counterValue)}</button>
            </div>}
            {offerDecision !== "pending" && <button className="reset-demo" onClick={() => setOfferDecision("pending")}>Restaurar demonstração</button>}
          </article>
          <aside className="owner-panel security-note"><strong>Decisão registrada</strong><p>Na versão operacional, cada aceite exigirá confirmação de identidade e produzirá registro de data, hora, conteúdo e versão da proposta.</p></aside>
        </section>}

        {activeTab === "manutencao" && liveProfile && <div className="owner-panel crm-empty">Nenhuma manutenção solicitada. Qualquer orçamento dependerá de sua autorização registrada.</div>}
        {activeTab === "manutencao" && !liveProfile && <section className="decision-layout">
          <article className="owner-panel maintenance-card">
            <div className="panel-heading"><div><p className="eyebrow dark">Autorização necessária</p><h2>Polimento técnico localizado</h2></div><span className={`maintenance-status ${maintenanceDecision}`}>{maintenanceDecision === "pending" ? "Pendente" : maintenanceDecision === "approved" ? "Autorizado" : "Recusado"}</span></div>
            <div className="maintenance-content"><img src="/vehicle-sedan.png" alt="Detalhe ilustrativo do veículo" /><div><p>Foram identificados riscos leves na porta traseira direita. O serviço melhora a apresentação sem intervenção de pintura.</p><dl><div><dt>Orçamento</dt><dd>{brl.format(480)}</dd></div><div><dt>Prazo</dt><dd>1 dia útil</dd></div><div><dt>Pagamento</dt><dd>Desconto somente após a venda</dd></div></dl></div></div>
            {maintenanceDecision === "pending" ? <div className="decision-actions"><button className="accept" onClick={() => setMaintenanceDecision("approved")}>Autorizar serviço</button><button className="quiet" onClick={() => setMaintenanceDecision("declined")}>Não autorizar</button></div> : <button className="reset-demo" onClick={() => setMaintenanceDecision("pending")}>Rever decisão</button>}
          </article>
          <aside className="owner-panel security-note"><strong>Nenhuma surpresa</strong><p>Nenhuma despesa é executada sem autorização registrada, salvo situações previstas expressamente no contrato de consignação.</p></aside>
        </section>}

        {activeTab === "documentos" && <section className="owner-panel documents-panel">
          <div className="panel-heading"><div><p className="eyebrow dark">Cofre documental</p><h2>Documentos e termos</h2></div><span>2 de 4 disponíveis</span></div>
          <div className="document-list">
            <article><i>PDF</i><div><strong>Contrato de consignação</strong><small>Assinado em 28 jul. • versão 1</small></div><button>Visualizar</button></article>
            <article><i>PDF</i><div><strong>Checklist de entrada</strong><small>12 fotos • quilometragem e acessórios</small></div><button>Visualizar</button></article>
            <article className="pending-doc"><i>—</i><div><strong>Autorização de venda</strong><small>Disponível após o aceite de uma proposta</small></div><span>Pendente</span></article>
            <article className="pending-doc"><i>—</i><div><strong>Transferência do veículo</strong><small>Integração oficial prevista para etapa posterior</small></div><span>Futura</span></article>
          </div>
        </section>}

        {activeTab === "mensagens" && <section className="messages-layout">
          <article className="owner-panel message-thread">
            <div className="panel-heading"><div><p className="eyebrow dark">Atendimento AutoPonte</p><h2>Conversa oficial</h2></div><span>Online</span></div>
            <div className="message agent"><small>AutoPonte • hoje, 11:34</small><p>Olá, Evandro. Recebemos uma proposta pelo seu veículo e deixamos todas as condições disponíveis na área “Propostas”. Posso esclarecer alguma dúvida?</p></div>
            <div className="message owner"><small>Você • hoje, 11:42</small><p>O valor líquido já considera o serviço de polimento?</p></div>
            <div className="message agent"><small>AutoPonte • hoje, 11:44</small><p>Sim. O demonstrativo apresenta o valor proposto, o serviço autorizado e o líquido previsto.</p></div>
            <form onSubmit={(event) => event.preventDefault()} className="message-compose"><label><span className="sr-only">Digite sua mensagem</span><input placeholder="Escreva uma mensagem…" /></label><button>Enviar</button></form>
          </article>
          <aside className="owner-panel withdrawal-card">
            <p className="eyebrow dark">Desistência ou venda externa</p><h2>Retirar do estoque</h2>
            <p>A solicitação passa por conferência de propostas, reservas, serviços e condições previstas no contrato.</p>
            {withdrawalRequested ? <div className="withdrawal-confirmation"><strong>Solicitação registrada</strong><span>A equipe entrará em contato para conferir as condições e combinar a entrega.</span></div> : <button onClick={() => setWithdrawalRequested(true)}>Solicitar retirada do veículo</button>}
          </aside>
        </section>}
      </div>

      <footer className="consignment-footer"><span>Ambiente demonstrativo • dados ilustrativos</span><a href="/">AutoPonte Veículos</a></footer>
    </main>
  );
}
