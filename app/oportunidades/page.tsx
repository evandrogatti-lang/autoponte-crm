import { requireChatGPTUser } from "../chatgpt-auth";

type Opportunity = {
  id: string; name: string; whatsapp: string; email: string; city: string;
  brand: string; model: string; year: string; mileage: number; condition: string;
  desired_vehicle: string; reference_price: number; estimated_min: number; estimated_max: number;
  photo_keys: string; status: string; lead_category: string; next_follow_up: string; created_at: string;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const labels: Record<string, string> = { hot: "Alta prioridade", warm: "Em negociação", review: "Requer análise", new: "Novo cadastro" };

export default async function OpportunitiesPage() {
  await requireChatGPTUser("/oportunidades");
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare("SELECT * FROM trade_ins ORDER BY created_at DESC LIMIT 200").all<Opportunity>();
  const rows = result.results ?? [];
  return <main className="crm-page">
    <header className="crm-header"><a className="brand" href="/"><span>AutoPonte</span> Veículos</a><div><strong>Carteira de oportunidades</strong><a href="/crm">CRM integrado</a><a href="/matches">AutoPonte Match</a><a href="/">Voltar ao site</a></div></header>
    <section className="crm-summary">
      <div><span>Cadastros</span><strong>{rows.length}</strong></div>
      <div><span>Alta prioridade</span><strong>{rows.filter((r) => r.lead_category === "hot").length}</strong></div>
      <div><span>Retornos pendentes</span><strong>{rows.filter((r) => r.next_follow_up && new Date(r.next_follow_up) <= new Date()).length}</strong></div>
    </section>
    <section className="crm-content">
      <div className="crm-title"><div><p className="eyebrow dark">Avaliações recebidas</p><h1>Leads de troca organizados para retomada</h1></div><p>Os cadastros ficam preservados com contatos, veículo desejado, referência FIPE, faixa preliminar e fotos.</p></div>
      {rows.length === 0 ? <div className="crm-empty">Nenhuma avaliação recebida até o momento.</div> : <div className="opportunity-grid">{rows.map((item) => {
        const photos = JSON.parse(item.photo_keys || "[]") as string[];
        const wa = item.whatsapp.replace(/\D/g, "");
        return <article className="opportunity-card" key={item.id}>
          {photos[0] ? <img src={`/api/opportunities/photo?key=${encodeURIComponent(photos[0])}`} alt={`${item.brand} ${item.model}`} /> : <div className="opportunity-placeholder">Sem foto</div>}
          <div className="opportunity-body">
            <div className="opportunity-tags"><span className={`lead-${item.lead_category}`}>{labels[item.lead_category] ?? labels.new}</span><span>{item.status.replaceAll("_", " ")}</span></div>
            <h2>{item.brand} {item.model}</h2><p>{item.year} • {item.mileage.toLocaleString("pt-BR")} km • {item.city}</p>
            <dl><div><dt>FIPE</dt><dd>{brl.format(item.reference_price)}</dd></div><div><dt>Faixa de troca</dt><dd>{brl.format(item.estimated_min)}–{brl.format(item.estimated_max)}</dd></div></dl>
            <p className="desired"><strong>Interesse:</strong> {item.desired_vehicle}</p>
            <p className="contact-name">{item.name}</p><p className="contact-date">Recebido em {new Date(item.created_at + "Z").toLocaleDateString("pt-BR")} • próximo retorno {item.next_follow_up ? new Date(item.next_follow_up).toLocaleDateString("pt-BR") : "a definir"}</p>
            <div className="crm-actions"><a href={`https://wa.me/55${wa}`} target="_blank" rel="noreferrer">WhatsApp</a><a href={`mailto:${item.email}`}>E-mail</a></div>
          </div>
        </article>;
      })}</div>}
    </section>
  </main>;
}
