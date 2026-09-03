"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  OPPORTUNITY_VIEW_STORAGE_KEY,
  resolveOpportunityView,
  type OpportunityView,
} from "../../lib/opportunities/view-preference";
import styles from "./OpportunityViewToggle.module.css";
import { leadQualificationHref } from "../../lib/commercial-navigation";

type OpportunityRow = {
  id: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  city: string | null;
  desiredVehicle: string | null;
  status: string;
  leadCategory: string | null;
  probability: number;
  nextAction: string | null;
  nextFollowUp: Date | string | null;
  referencePrice: number | null;
  estimatedMin: number;
  estimatedMax: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const VIEW_OPTIONS: Array<{ value: OpportunityView; label: string }> = [
  { value: "list", label: "Lista" },
  { value: "details", label: "Detalhes" },
  { value: "cards", label: "Cards" },
];

const priorityLabels: Record<string, string> = {
  hot: "Alta prioridade",
  warm: "Em negociação",
  review: "Requer análise",
  new: "Novo cadastro",
};

const stageLabels: Record<string, string> = {
  new: "Novo",
  contacted: "Contato",
  qualified: "Qualificação",
  store: "Loja",
  sent_to_store: "Loja",
  proposal: "Proposta",
  closed: "Fechado",
  lost: "Perdido",
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function getInterest(row: OpportunityRow) {
  if (row.desiredVehicle) return row.desiredVehicle;
  if (row.brand && row.model) return `${row.brand} ${row.model}`;
  return "Interesse a definir";
}

function getStage(row: OpportunityRow) {
  return stageLabels[row.status] ?? row.status.replaceAll("_", " ");
}

function formatDate(value: Date | string | null) {
  if (!value) return "a definir";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "a definir" : date.toLocaleDateString("pt-BR");
}

function setStoredView(view: OpportunityView) {
  window.localStorage.setItem(OPPORTUNITY_VIEW_STORAGE_KEY, view);
}

function OpportunityMeta({ item, includeUpdate = false }: { item: OpportunityRow; includeUpdate?: boolean }) {
  return (
    <div className={styles.meta}>
      <span className={styles.stage}>{getStage(item)}</span>
      <span className={styles.priority}>{priorityLabels[item.leadCategory ?? "new"] ?? "Novo cadastro"}</span>
      <strong>{item.probability}%</strong>
      {includeUpdate && <span>Atualizado {formatDate(item.updatedAt)}</span>}
    </div>
  );
}

export function OpportunityViewList({ rows }: { rows: OpportunityRow[] }) {
  const [view, setView] = useState<OpportunityView>("details");

  useEffect(() => {
    const stored = window.localStorage.getItem(OPPORTUNITY_VIEW_STORAGE_KEY);
    const resolved = resolveOpportunityView(stored);
    // Read after hydration so browser preferences cannot diverge from the server markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(resolved);
    if (stored !== resolved) setStoredView(resolved);
  }, []);

  function changeView(nextView: OpportunityView) {
    setView(nextView);
    setStoredView(nextView);
  }

  if (rows.length === 0) return null;

  return (
    <div>
      <div className={styles.toggle} aria-label="Modo de visualização da qualificação" role="tablist">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.value === view}
            className={option.value === view ? styles.activeToggle : ""}
            onClick={() => changeView(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === "list" && (
        <div className={styles.list} aria-label="Lista de qualificações">
          {rows.map((item) => (
            <Link key={item.id} href={leadQualificationHref(item.id)} className={styles.listRow}>
              <div className={styles.primary}>
                <strong>{item.name || "Cliente em revisão"}</strong>
                <span>{getInterest(item)}</span>
              </div>
              <OpportunityMeta item={item} />
              <div className={styles.action}>
                <span>Próxima ação</span>
                <strong>{item.nextAction || "Sem ação registrada"}</strong>
              </div>
              <div className={styles.followUp}>
                <span>Follow-up {formatDate(item.nextFollowUp)}</span>
                <small>Atualizado {formatDate(item.updatedAt)}</small>
              </div>
            </Link>
          ))}
        </div>
      )}

      {view === "details" && (
        <div className={styles.details}>
          {rows.map((item) => (
            <Link key={item.id} href={leadQualificationHref(item.id)} className={styles.detailRow}>
              <div className={styles.primary}>
                <strong>{item.name || "Cliente em revisão"}</strong>
                <span>{getInterest(item)}</span>
                <small>{item.city || "Cidade não informada"}</small>
              </div>
              <OpportunityMeta item={item} includeUpdate />
              <div className={styles.context}>
                <span>Próxima ação</span>
                <strong>{item.nextAction || "Sem ação registrada"}</strong>
                <small>Follow-up {formatDate(item.nextFollowUp)}</small>
              </div>
              <span className={styles.open}>Abrir</span>
            </Link>
          ))}
        </div>
      )}

      {view === "cards" && (
        <div className={styles.cards}>
          {rows.map((item) => (
            <Link key={item.id} href={leadQualificationHref(item.id)} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.primary}>
                  <strong>{item.name || "Cliente em revisão"}</strong>
                  <span>{getInterest(item)}</span>
                </div>
                <strong className={styles.probability}>{item.probability}%</strong>
              </div>
              <OpportunityMeta item={item} />
              <div className={styles.cardContext}>
                <span>Próxima ação</span>
                <strong>{item.nextAction || "Sem ação registrada"}</strong>
                <small>Follow-up {formatDate(item.nextFollowUp)}</small>
              </div>
              <div className={styles.cardFooter}>
                <span>{item.referencePrice && item.referencePrice > 0 ? `FIPE ${brl.format(item.referencePrice)}` : item.city || "Cidade não informada"}</span>
                <b>Abrir</b>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
