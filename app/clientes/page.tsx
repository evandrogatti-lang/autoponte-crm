import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { buyerProfiles, tradeIns } from "../../db/schema";
import { buildGmailComposeUrl, buildWhatsAppUrl, formatBrazilianPhone, normalizeEmail } from "../../lib/contact";
import { matchesClientNamePrefix } from "../../lib/clients/search";
import Link from "next/link";

export const dynamic = "force-dynamic";

type ClientOpportunity = {
  id: string;
  desiredVehicle: string;
  status: string;
  probability: number;
  nextAction: string;
  updatedAt: Date;
};

type ClientSummary = {
  key: string;
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  latestAt: Date;
  opportunities: ClientOpportunity[];
  profileCount: number;
};

function identityKey(email: string, whatsapp: string, name: string, city: string) {
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = buildWhatsAppUrl(whatsapp)?.split("/").pop() ?? "";
  if (cleanEmail) return `email:${cleanEmail}`;
  if (cleanPhone) return `phone:${cleanPhone}`;
  return `name:${name.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CL";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { new: "Novo", contacted: "Contato", qualified: "Qualificação", store: "Loja", proposal: "Proposta", closed: "Fechado", lost: "Perdido" };
  return labels[status] ?? status;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; q?: string }>;
}) {
  await requireChatGPTUser("/clientes");
  const query = await searchParams;
  const [opportunities, profiles] = await Promise.all([
    getDb().select().from(tradeIns).orderBy(desc(tradeIns.updatedAt)).limit(500),
    getDb().select().from(buyerProfiles).orderBy(desc(buyerProfiles.createdAt)).limit(500),
  ]);

  const clients = new Map<string, ClientSummary>();
  for (const row of opportunities) {
    const key = identityKey(row.email, row.whatsapp, row.name, row.city);
    const item: ClientOpportunity = { id: row.id, desiredVehicle: row.desiredVehicle, status: row.status, probability: row.probability, nextAction: row.nextAction, updatedAt: row.updatedAt };
    const current = clients.get(key);
    if (current) {
      current.opportunities.push(item);
      if (row.updatedAt > current.latestAt) current.latestAt = row.updatedAt;
    } else {
      clients.set(key, { key, name: row.name, whatsapp: row.whatsapp, email: row.email, city: row.city, latestAt: row.updatedAt, opportunities: [item], profileCount: 0 });
    }
  }
  for (const row of profiles) {
    const key = identityKey(row.email, row.whatsapp, row.name, row.city);
    const current = clients.get(key);
    if (current) {
      current.profileCount += 1;
      if (row.createdAt > current.latestAt) current.latestAt = row.createdAt;
    } else {
      clients.set(key, { key, name: row.name, whatsapp: row.whatsapp, email: row.email, city: row.city, latestAt: row.createdAt, opportunities: [], profileCount: 1 });
    }
  }

const rows = [...clients.values()].sort(
  (a, b) => b.latestAt.getTime() - a.latestAt.getTime()
);

const searchTerm = (query.q ?? "").trim();

const filteredRows = searchTerm
  ? rows.filter((row) => matchesClientNamePrefix(row.name, searchTerm))
  : rows;

const selected =
  filteredRows.find((row) => row.key === query.client) ??
  filteredRows[0];
  const whatsappUrl = selected ? buildWhatsAppUrl(selected.whatsapp) : null;
  const email = selected ? normalizeEmail(selected.email) : "";
  const emailUrl = selected && email ? buildGmailComposeUrl(email, "AutoPonte · acompanhamento comercial") : null;
  const primaryOpportunity = selected?.opportunities[0];
  const averageProbability = selected?.opportunities.length ? Math.round(selected.opportunities.reduce((sum, item) => sum + item.probability, 0) / selected.opportunities.length) : 0;

  return <main className="crm-page client-dense-page">
    <header className="crm-header client-topbar">
      <Link className="brand" href="/crm"><span>AutoPonte</span> Veículos</Link>
      <div><Link href="/crm">Mission Control</Link><Link className="active-nav" href="/clientes">Clientes</Link><Link href="/oportunidades">Oportunidades</Link><Link className="crm-header-cta" href="/oportunidades/nova">+ Nova oportunidade</Link></div>
    </header>

    <section className="client-dense-shell">
      <aside className="client-list-panel">
        <div className="client-list-header"><div><p className="eyebrow dark">CLIENTES</p><h1>Base comercial</h1></div><span>{rows.length}</span></div>
        <form method="GET" action="/clientes" className="client-search-form">
  <input
    type="search"
    name="q"
    defaultValue={query.q ?? ""}
    placeholder="Buscar por nome"
    aria-label="Buscar clientes"
  />
</form>
        <div className="client-list-scroll">
          {filteredRows.map((client) => <Link key={client.key} href={`/clientes?client=${encodeURIComponent(client.key)}`} className={`client-list-item ${selected?.key === client.key ? "selected" : ""}`}>
            <span className="client-avatar compact">{initials(client.name)}</span>
            <span><strong>{client.name}</strong><small>{client.city || "Cidade não informada"} · {client.opportunities.length} oportunidade{client.opportunities.length === 1 ? "" : "s"}</small></span>
            <b>{client.opportunities[0]?.probability ?? 0}%</b>
          </Link>)}
        </div>
      </aside>

      <section className="client-detail-panel">
        {!selected ? <div className="crm-empty client-empty"><strong>Nenhum cliente cadastrado.</strong><span>Crie a primeira oportunidade para iniciar a base comercial.</span><Link href="/oportunidades/nova">Cadastrar primeira oportunidade</Link></div> : <>
          <div className="client-detail-actions">
            {whatsappUrl ? <a className="quick-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a> : <span className="quick-disabled">WhatsApp indisponível</span>}
            {emailUrl ? <a href={emailUrl} target="_blank" rel="noreferrer">Enviar e-mail</a> : <span className="quick-disabled">E-mail indisponível</span>}
            {primaryOpportunity ? <Link href={`/oportunidades/${primaryOpportunity.id}`}>Abrir oportunidade</Link> : <Link href="/oportunidades/nova">Nova oportunidade</Link>}
          </div>

          <article className="client-identity-card">
            <div className="client-identity-main"><span className="client-avatar large">{initials(selected.name)}</span><div><div className="client-name-row"><h2>{selected.name}</h2><span>Cliente ativo</span></div><p>{formatBrazilianPhone(selected.whatsapp) || "WhatsApp não informado"} · {email || "E-mail não informado"} · {selected.city || "Cidade não informada"}</p></div></div>
            <dl className="client-kpi-strip">
              <div><dt>Oportunidades</dt><dd>{selected.opportunities.length}</dd></div>
              <div><dt>Probabilidade média</dt><dd>{averageProbability}%</dd></div>
              <div><dt>Perfis compradores</dt><dd>{selected.profileCount}</dd></div>
              <div><dt>Última atividade</dt><dd>{selected.latestAt.toLocaleDateString("pt-BR")}</dd></div>
            </dl>
          </article>

          <div className="client-detail-grid">
            <article className="client-section-card client-opportunities-card">
              <header><div><span>OPORTUNIDADES</span><h3>Resumo comercial</h3></div><Link href="/oportunidades/nova">Adicionar</Link></header>
              {selected.opportunities.length === 0 ? <p className="client-muted">Nenhuma oportunidade ativa.</p> : <div className="client-opportunity-list">{selected.opportunities.slice(0, 5).map((item) => <Link href={`/oportunidades/${item.id}`} key={item.id}>
                <span><strong>{item.desiredVehicle || "Veículo a definir"}</strong><small>{item.nextAction || "Próxima ação não definida"}</small></span>
                <span className="client-opportunity-meta"><b>{item.probability}%</b><em>{statusLabel(item.status)}</em></span>
              </Link>)}</div>}
            </article>

            <article className="client-section-card">
              <header><div><span>CONTEXTO</span><h3>Leitura rápida</h3></div></header>
              <div className="client-context-grid">
               <div><span>Próxima ação</span><strong>{primaryOpportunity?.nextAction || "Sem compromisso agendado"}</strong></div>
                <div><span>Demanda principal</span><strong>{primaryOpportunity?.desiredVehicle || "Ainda não definida"}</strong></div>
               <div><span>Canal preferencial</span><strong>{whatsappUrl ? "WhatsApp" : email ? "E-mail" : "Não definido"}</strong></div>
                <div><span>Etapa atual</span><strong>{primaryOpportunity ? statusLabel(primaryOpportunity.status) : "Sem oportunidade"}</strong></div>
              </div>
            </article>

            <article className="client-section-card client-recommendation-card">
              <header><div><span>RECOMENDAÇÃO EXPLICADA</span><h3>{primaryOpportunity ? "Continuar acompanhamento comercial" : "Estruturar primeira demanda"}</h3></div></header>
              <p><b>Por que agora:</b> {primaryOpportunity ? `A oportunidade está em ${statusLabel(primaryOpportunity.status).toLowerCase()} e a última atividade ocorreu em ${selected.latestAt.toLocaleDateString("pt-BR")}.` : "O cliente ainda não possui oportunidade vinculada, portanto não há contexto suficiente para uma ação comercial específica."}</p>
              <p><b>Impacto esperado:</b> {primaryOpportunity ? "Manter o contexto atualizado, reduzir perda por demora e avançar a próxima ação registrada." : "Criar uma demanda estruturada para permitir matching e recomendações relevantes."}</p>
              {primaryOpportunity ? <Link href={`/oportunidades/${primaryOpportunity.id}`}>Ver contexto completo</Link> : <Link href="/oportunidades/nova">Criar oportunidade</Link>}
            </article>

            <article className="client-section-card client-activity-card">
              <header><div><span>ATIVIDADE</span><h3>Últimos registros</h3></div></header>
              <div className="client-activity-list">{selected.opportunities.slice(0, 4).map((item) => <div key={item.id}><i /><span><strong>{statusLabel(item.status)} · {item.desiredVehicle || "Veículo a definir"}</strong><small>Atualizado em {item.updatedAt.toLocaleDateString("pt-BR")}</small></span></div>)}</div>
            </article>
          </div>
        </>}
      </section>
    </section>
  </main>;
}
