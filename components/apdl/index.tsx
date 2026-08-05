import type { ReactNode } from "react";

export type Tone = "neutral" | "success" | "warning" | "danger" | "ai";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function APButton({ children, variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={cx("ap-button", `ap-button--${variant}`, className)} {...props}>{children}</button>;
}

export function APBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={cx("ap-badge", `ap-tone--${tone}`)}>{children}</span>;
}

export function APPanel({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return <section className={cx("ap-panel", className)}>{(title || action) && <header className="ap-panel__header"><h2>{title}</h2>{action}</header>}<div className="ap-panel__body">{children}</div></section>;
}

export function MissionControlHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <header className="ap-mission-header"><div><p className="ap-eyebrow">Mission Control</p><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="ap-mission-header__actions">{actions}</div></header>;
}

export function EnterpriseSidebar({ items }: { items: Array<{ label: string; href: string; active?: boolean }> }) {
  return <aside className="ap-sidebar"><strong className="ap-sidebar__brand">AutoPonte <span>OS</span></strong><nav>{items.map(item => <a key={item.label} href={item.href} className={item.active ? "is-active" : ""}>{item.label}</a>)}</nav></aside>;
}

export function ContextBar({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="ap-context-bar"><span>{label}</span><div>{children}</div></div>;
}

export function CommandPalette({ placeholder = "Buscar cliente, placa, veículo ou comando" }: { placeholder?: string }) {
  return <label className="ap-command"><span>⌕</span><input aria-label={placeholder} placeholder={placeholder}/><kbd>Ctrl K</kbd></label>;
}

export function WorkspaceGrid({ children, columns = 3 }: { children: ReactNode; columns?: 1 | 2 | 3 | 4 }) {
  return <div className={cx("ap-workspace-grid", `ap-workspace-grid--${columns}`)}>{children}</div>;
}

export function AdaptiveDrawer({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="ap-drawer"><header><h3>{title}</h3><button aria-label="Fechar">×</button></header>{children}</aside>;
}

export function MissionCard({ title, description, impact, action, tone = "neutral" }: { title: string; description: string; impact?: string; action?: ReactNode; tone?: Tone }) {
  return <article className={cx("ap-mission-card", `ap-tone-border--${tone}`)}><div><APBadge tone={tone}>Prioridade</APBadge><h3>{title}</h3><p>{description}</p>{impact && <strong>{impact}</strong>}</div>{action}</article>;
}

export function AIInsightCard({ finding, reason, confidence, action }: { finding: string; reason: string; confidence: number; action?: ReactNode }) {
  return <article className="ap-ai-insight"><APBadge tone="ai">Inteligência</APBadge><h3>{finding}</h3><p>{reason}</p><div className="ap-confidence"><span>Confiança</span><strong>{confidence}%</strong></div>{action}</article>;
}

export function PulseIndicator({ value, label = "Pulse" }: { value: number; label?: string }) {
  return <div className="ap-pulse" style={{"--ap-pulse": `${Math.max(0, Math.min(100, value)) * 3.6}deg`} as React.CSSProperties}><div><strong>{value}</strong><span>{label}</span></div></div>;
}

export function HeatMap({ items }: { items: Array<{ label: string; value: number }> }) {
  return <div className="ap-heatmap">{items.map(item => <div key={item.label}><span>{item.label}</span><div><i style={{width: `${Math.max(4, Math.min(100, item.value))}%`}}/></div><strong>{item.value}</strong></div>)}</div>;
}

export function OpportunityScore({ score, trend = "estável", risk = "baixo" }: { score: number; trend?: string; risk?: string }) {
  return <div className="ap-score"><strong>{score}</strong><div><span>Opportunity Score</span><small>{trend} · risco {risk}</small></div></div>;
}

export function DecisionPanel({ decisions }: { decisions: Array<{ title: string; detail: string }> }) {
  return <div className="ap-decisions">{decisions.slice(0,3).map((d,i)=><article key={d.title}><span>0{i+1}</span><div><strong>{d.title}</strong><p>{d.detail}</p></div></article>)}</div>;
}

export function PipelineCard({ customer, vehicle, nextAction, score, age }: { customer: string; vehicle: string; nextAction: string; score: number; age?: string }) {
  return <article className="ap-pipeline-card"><header><strong>{customer}</strong><APBadge tone={score >= 85 ? "success" : "warning"}>{score}</APBadge></header><p>{vehicle}</p>{age && <small>{age}</small>}<footer>{nextAction}</footer></article>;
}

export function Customer360({ name, subtitle, score, children }: { name: string; subtitle?: string; score?: number; children?: ReactNode }) {
  return <section className="ap-customer-360"><header><div className="ap-avatar">{name.slice(0,2).toUpperCase()}</div><div><h2>{name}</h2>{subtitle && <p>{subtitle}</p>}</div>{score !== undefined && <OpportunityScore score={score}/>}</header>{children}</section>;
}

export function Timeline({ events }: { events: Array<{ title: string; detail?: string; time: string }> }) {
  return <ol className="ap-timeline">{events.map(e=><li key={`${e.time}-${e.title}`}><time>{e.time}</time><div><strong>{e.title}</strong>{e.detail && <p>{e.detail}</p>}</div></li>)}</ol>;
}

export function QuickProposal({ value, vehicle, action }: { value: string; vehicle: string; action?: ReactNode }) {
  return <div className="ap-quick-proposal"><span>Proposta rápida</span><h3>{vehicle}</h3><strong>{value}</strong>{action}</div>;
}

export function TradeEvaluation({ vehicle, range, status }: { vehicle: string; range: string; status: string }) {
  return <div className="ap-trade-evaluation"><div><span>Avaliação de troca</span><h3>{vehicle}</h3></div><strong>{range}</strong><APBadge tone="warning">{status}</APBadge></div>;
}

export function WhatsAppWorkspace({ contact, preview }: { contact: string; preview: string }) {
  return <div className="ap-whatsapp"><div className="ap-avatar">WA</div><div><strong>{contact}</strong><p>{preview}</p></div><APButton variant="secondary">Abrir conversa</APButton></div>;
}

export function VehicleCard({ vehicle, price, meta, score }: { vehicle: string; price: string; meta: string; score?: number }) {
  return <article className="ap-vehicle-card"><div className="ap-vehicle-card__media">AP</div><div><h3>{vehicle}</h3><p>{meta}</p><strong>{price}</strong>{score !== undefined && <APBadge tone="success">Score {score}</APBadge>}</div></article>;
}

export function VehicleHealth({ days, demand, status }: { days: number; demand: string; status: Tone }) {
  return <div className="ap-vehicle-health"><APBadge tone={status}>{days} dias</APBadge><span>Demanda {demand}</span></div>;
}

export function PriceIntelligence({ current, market, recommendation }: { current: string; market: string; recommendation: string }) {
  return <div className="ap-price-intelligence"><div><span>Atual</span><strong>{current}</strong></div><div><span>Mercado</span><strong>{market}</strong></div><p>{recommendation}</p></div>;
}

export function InspectionGallery({ count, status }: { count: number; status: string }) {
  return <div className="ap-inspection"><div className="ap-inspection__grid">{Array.from({length: Math.min(count,4)}).map((_,i)=><span key={i}>{i+1}</span>)}</div><footer>{count} fotos · {status}</footer></div>;
}

export function MarginCalculator({ sale, cost, margin }: { sale: string; cost: string; margin: string }) {
  return <div className="ap-margin"><span>Margem estimada</span><strong>{margin}</strong><small>Venda {sale} · Custo {cost}</small></div>;
}

export function KPICard({ label, value, trend, tone = "neutral" }: { label: string; value: string; trend?: string; tone?: Tone }) {
  return <article className={cx("ap-kpi", `ap-tone-border--${tone}`)}><span>{label}</span><strong>{value}</strong>{trend && <small>{trend}</small>}</article>;
}

export function ForecastPanel({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="ap-forecast"><span>{title}</span><strong>{value}</strong><p>{detail}</p></div>;
}

export function Radar({ items }: { items: Array<{ label: string; value: number }> }) {
  return <div className="ap-radar">{items.map(i=><div key={i.label}><span>{i.label}</span><strong>{i.value}</strong></div>)}</div>;
}

export function CashFlowWidget({ available, committed, required }: { available: string; committed: string; required: string }) {
  return <div className="ap-cashflow"><div><span>Disponível</span><strong>{available}</strong></div><div><span>Comprometido</span><strong>{committed}</strong></div><div><span>Necessário</span><strong>{required}</strong></div></div>;
}

export function NotificationCenter({ items }: { items: Array<{ title: string; tone?: Tone }> }) {
  return <div className="ap-notifications">{items.map(i=><div key={i.title}><i className={cx("ap-dot", `ap-dot--${i.tone ?? "neutral"}`)}/><span>{i.title}</span></div>)}</div>;
}

export function SmartFilters({ filters }: { filters: string[] }) {
  return <div className="ap-filters">{filters.map((f,i)=><button key={f} className={i===0 ? "is-active" : ""}>{f}</button>)}</div>;
}

export function UniversalSearch({ placeholder = "Buscar em toda a AutoPonte" }: { placeholder?: string }) {
  return <div className="ap-universal-search"><span>⌕</span><input aria-label={placeholder} placeholder={placeholder}/></div>;
}
