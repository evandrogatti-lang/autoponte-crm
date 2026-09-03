import { desc, eq } from "drizzle-orm";
import { requireSellerOperations } from "../app-auth";
import { getDb } from "../../db";
import { buyerProfiles, vehicleMatches } from "../../db/schema";
import { buildWhatsAppUrl, cleanContactText, formatBrazilianPhone, normalizeEmail } from "../../lib/contact";
import Link from "next/link";
import { commercialRoutes } from "../../lib/commercial-navigation";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function safeReasons(value: string) {
  try {
    const parsed = JSON.parse(value || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function MatchesPage() {
  await requireSellerOperations("/matches");
  const rows = await getDb().select({
    id: vehicleMatches.id, vehicle_label: vehicleMatches.vehicleLabel, vehicle_price: vehicleMatches.vehiclePrice,
    score: vehicleMatches.score, reasons: vehicleMatches.reasons, message_draft: vehicleMatches.messageDraft,
    status: vehicleMatches.status, source_type: vehicleMatches.sourceType, created_at: vehicleMatches.createdAt,
    name: buyerProfiles.name, whatsapp: buyerProfiles.whatsapp, email: buyerProfiles.email,
    city: buyerProfiles.city, alerts_consent: buyerProfiles.alertsConsent,
  }).from(vehicleMatches).innerJoin(buyerProfiles, eq(buyerProfiles.id, vehicleMatches.buyerProfileId)).orderBy(desc(vehicleMatches.score), desc(vehicleMatches.createdAt)).limit(200);

  return <main className="crm-page"><header className="crm-header"><Link className="brand" href={commercialRoutes.missionControl}><span>AutoPonte</span> Veículos</Link><div><strong>Match</strong><Link href={commercialRoutes.missionControl}>Central de Operações</Link><Link href="/clientes">Clientes</Link><Link href="/veiculos">Veículos</Link><Link className="crm-header-cta" href={commercialRoutes.matchIntake}>+ Gerar Match</Link></div></header>
    <section className="crm-summary"><div><span>Correspondências</span><strong>{rows.length}</strong></div><div><span>Aguardando revisão</span><strong>{rows.filter((row) => row.status === "review_pending").length}</strong></div><div><span>Compatibilidade alta</span><strong>{rows.filter((row) => row.score >= 80).length}</strong></div></section>
    <section className="crm-content"><div className="crm-title"><div><p className="eyebrow dark">CLIENTE · VEÍCULO · TROCA · CONSIGNAÇÃO · FINANCIAMENTO</p><h1>Matches comerciais explicados</h1></div><p>Compatibilidades calculadas com dados reais, disponibilidade e consentimento antes de qualquer contato.</p></div>
      {rows.length === 0 ? <div className="crm-empty">Nenhuma correspondência ainda.</div> : <div className="match-queue">{rows.map((row) => {
        const reasons = safeReasons(row.reasons);
        const whatsappUrl = buildWhatsAppUrl(row.whatsapp, row.message_draft);
        const whatsappDisplay = formatBrazilianPhone(row.whatsapp);
        const email = normalizeEmail(row.email);
        const canContact = row.status === "review_pending" && row.alerts_consent && whatsappUrl;
        return <article className="match-card" key={row.id}><div className="match-card-score"><strong>{row.score}%</strong><span>compatível</span></div><div className="match-card-body"><div className="opportunity-tags"><span>{row.source_type === "trade_in" ? "Possível troca" : "Pré-consignação"}</span><span className={row.status === "review_pending" ? "lead-warm" : "lead-review"}>{row.status === "review_pending" ? "Revisar contato" : "Uso interno"}</span></div><h2>{row.vehicle_label}</h2><p>{brl.format(row.vehicle_price)} • potencial comprador em {row.city}</p><h3>{row.name}</h3><p>{whatsappDisplay || "WhatsApp não informado"} • {email || "E-mail não informado"}</p><ul>{reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}</ul><blockquote>{cleanContactText(row.message_draft) || "Mensagem ainda não preparada."}</blockquote>{canContact ? <a className="review-contact" href={whatsappUrl} target="_blank" rel="noreferrer">Revisar e abrir WhatsApp</a> : <p className="no-consent">{row.alerts_consent ? "WhatsApp válido não informado." : "Sem autorização para alertas."}</p>}</div></article>;
      })}</div>}
    </section></main>;
}
