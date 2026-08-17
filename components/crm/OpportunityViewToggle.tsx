"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

type OpportunityView = "compact" | "table" | "cards";

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
  photoKeys: string | null;
  createdAt: Date | string;
};

const STORAGE_KEY = "autoponte-opportunity-view";
const DEFAULT_VIEW: OpportunityView = "compact";
const VIEW_OPTIONS: Array<{ value: OpportunityView; label: string }> = [
  { value: "compact", label: "Compacto" },
  { value: "table", label: "Tabela" },
  { value: "cards", label: "Cards" },
];

const labels: Record<string, string> = {
  hot: "Alta prioridade",
  warm: "Em negociação",
  review: "Requer análise",
  new: "Novo cadastro",
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function isValidView(value: string | null): value is OpportunityView {
  return value === "compact" || value === "table" || value === "cards";
}

function safePhotos(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function getDisplayTitle(row: OpportunityRow) {
  if (row.brand && row.model) return `${row.brand} ${row.model}`;
  return row.desiredVehicle || "Oportunidade comercial";
}

function formatNextFollowUp(row: OpportunityRow) {
  if (!row.nextFollowUp) return "a definir";
  const date = row.nextFollowUp instanceof Date ? row.nextFollowUp : new Date(row.nextFollowUp);
  if (Number.isNaN(date.getTime())) return "a definir";
  return date.toLocaleDateString("pt-BR");
}

function formatPastDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function OpportunityViewList({ rows }: { rows: OpportunityRow[] }) {
  const [view, setView] = useState<OpportunityView>(DEFAULT_VIEW);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidView(stored)) {
      setView(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, view);
    }
  }, [view]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        aria-label="Modo de visualização da oportunidade"
        role="tablist"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {VIEW_OPTIONS.map((option) => {
          const active = option.value === view;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(option.value)}
              style={{
                border: active ? "1px solid #0d5b52" : "1px solid #dfe6ea",
                background: active ? "#eaf7f3" : "#fff",
                color: active ? "#0b3b36" : "#36515d",
                borderRadius: "999px",
                padding: "8px 14px",
                fontWeight: 800,
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: active ? "inset 0 0 0 1px rgba(13,91,82,0.15)" : "none",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {view === "compact" && (
        <div style={{ display: "grid", gap: "12px" }}>
          {rows.map((item) => {
            const photos = safePhotos(item.photoKeys);
            return (
              <Link
                key={item.id}
                href={`/oportunidades/${item.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "112px minmax(0, 1fr)",
                  gap: "12px",
                  alignItems: "stretch",
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid #dfe6ea",
                  borderRadius: "14px",
                  background: "#fff",
                  overflow: "hidden",
                  minHeight: "128px",
                  boxShadow: "0 8px 20px rgba(25,51,74,0.04)",
                }}
              >
                {photos[0] ? (
                  <img
                    src={`/api/opportunities/photo?key=${encodeURIComponent(photos[0])}`}
                    alt={getDisplayTitle(item)}
                    style={{ width: "100%", height: "100%", objectFit: "cover", background: "#e9eef2" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      background: "#eef3f7",
                      color: "#647886",
                      fontWeight: 700,
                      fontSize: "12px",
                    }}
                  >
                    Sem foto
                  </div>
                )}

                <div style={{ padding: "12px 14px 12px 0", minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        background: item.leadCategory ? "#edf7db" : "#eef3f7",
                        color: "#2d4a1b",
                        borderRadius: "999px",
                        padding: "4px 8px",
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {labels[item.leadCategory ?? "new"] ?? "Novo cadastro"}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        color: "#36515d",
                        background: "#f0f5f8",
                        borderRadius: "999px",
                        padding: "4px 8px",
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "start" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 style={{ margin: 0, fontSize: "18px", lineHeight: 1.2, color: "#0d2233", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {getDisplayTitle(item)}
                      </h2>
                      <p style={{ margin: "6px 0 0", color: "#536b7a", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.city || "Cidade não informada"} · {item.mileage ? `${item.mileage.toLocaleString("pt-BR")} km` : "Quilometragem a definir"}
                      </p>
                    </div>
                    <strong style={{ fontSize: "12px", color: "#0d5b52" }}>{item.probability}%</strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px", marginTop: "10px" }}>
                    <div>
                      <small style={{ display: "block", color: "#738796", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>FIPE</small>
                      <strong style={{ display: "block", fontSize: "13px", color: "#142d3f" }}>{item.referencePrice && item.referencePrice > 0 ? brl.format(item.referencePrice) : "Não informada"}</strong>
                    </div>
                    <div>
                      <small style={{ display: "block", color: "#738796", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>Próxima ação</small>
                      <strong style={{ display: "block", fontSize: "13px", color: "#142d3f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.nextAction || "Sem ação registrada"}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "10px", color: "#647886", fontSize: "12px" }}>
                    <span>{item.name || "Cliente em revisão"}</span>
                    <span>Retorno {formatNextFollowUp(item)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {view === "table" && (
        <div style={{ overflowX: "auto", border: "1px solid #dfe6ea", borderRadius: "12px", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
            <thead>
              <tr style={{ background: "#f7fafb" }}>
                <th style={{ ...cellStyle, textAlign: "left" }}>Cliente</th>
                <th style={{ ...cellStyle, textAlign: "left" }}>Veículo</th>
                <th style={{ ...cellStyle, textAlign: "left" }}>Etapa</th>
                <th style={{ ...cellStyle, textAlign: "left" }}>Próxima ação</th>
                <th style={{ ...cellStyle, textAlign: "left" }}>Probabilidade</th>
                <th style={{ ...cellStyle, textAlign: "left" }}>Atualização</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #edf1f4" }}>
                  <td style={cellStyle}>
                    <Link href={`/oportunidades/${item.id}`} style={{ color: "#0d2233", fontWeight: 800, textDecoration: "none" }}>
                      {item.name || "Cliente em revisão"}
                    </Link>
                  </td>
                  <td style={cellStyle}>{getDisplayTitle(item)}</td>
                  <td style={cellStyle}>{item.status.replaceAll("_", " ")}</td>
                  <td style={cellStyle}>{item.nextAction || "Sem ação registrada"}</td>
                  <td style={cellStyle}>{item.probability}%</td>
                  <td style={cellStyle}>{formatPastDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "16px" }}>
          {rows.map((item) => {
            const photos = safePhotos(item.photoKeys);
            return (
              <Link
                key={item.id}
                href={`/oportunidades/${item.id}`}
                style={{
                  display: "grid",
                  gap: "12px",
                  padding: "12px",
                  textDecoration: "none",
                  color: "inherit",
                  background: "#fff",
                  border: "1px solid #dfe6ea",
                  borderRadius: "14px",
                  boxShadow: "0 12px 24px rgba(25,51,74,0.04)",
                  minHeight: "260px",
                }}
              >
                {photos[0] ? (
                  <img
                    src={`/api/opportunities/photo?key=${encodeURIComponent(photos[0])}`}
                    alt={getDisplayTitle(item)}
                    style={{ width: "100%", height: "170px", objectFit: "cover", borderRadius: "10px" }}
                  />
                ) : (
                  <div style={{ height: "170px", borderRadius: "10px", background: "#eef3f7", display: "grid", placeItems: "center", color: "#647886", fontWeight: 700 }}>
                    Sem foto
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <strong style={{ fontSize: "16px", color: "#0d2233" }}>{getDisplayTitle(item)}</strong>
                  <span style={{ fontSize: "12px", color: "#0b5d50", fontWeight: 800 }}>{item.probability}%</span>
                </div>
                <p style={{ margin: 0, color: "#536b7a", fontSize: "12px" }}>{item.city || "Cidade não informada"}</p>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", color: "#536b7a", fontSize: "12px" }}>
                  <span>{item.status.replaceAll("_", " ")}</span>
                  <span>{item.nextAction || "Sem ação"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const cellStyle: CSSProperties = {
  padding: "12px 14px",
  fontSize: "13px",
  color: "#244154",
  verticalAlign: "top",
};
