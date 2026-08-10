import styles from "./Leads.module.css";
import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";
import { InventoryShell } from "../../features/vehicle-registry/components/InventoryShell";

export const dynamic = "force-dynamic";

const stageLabels: Record<string, string> = {
  new: "Lead",
  contacted: "Contato",
  qualified: "Qualificação",
  sent_to_store: "Loja",
  proposal: "Proposta",
  closed: "Fechado",
  lost: "Perdido",
  pre_evaluated: "Pré-avaliado",
};

const priorityLabels: Record<string, string> = {
  new: "Nova",
  warm: "Em negociação",
  hot: "Alta prioridade",
  review: "Requer análise",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireChatGPTUser("/leads");

  const { q = "" } = await searchParams;
  const query = q.trim().toLocaleLowerCase("pt-BR");

  const rows = await getDb()
    .select()
    .from(tradeIns)
    .orderBy(desc(tradeIns.updatedAt))
    .limit(500);

  // Potenciais clientes = registros ainda nas fases iniciais do funil.
  const leadRows = rows.filter((row) =>
    ["new", "contacted", "qualified", "pre_evaluated"].includes(row.status)
  );

  const filteredRows = leadRows.filter((row) => {
    if (!query) return true;

    const haystack = [
      row.name,
      row.whatsapp,
      row.email,
      row.city,
      row.desiredVehicle,
      row.brand,
      row.model,
      row.nextAction,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return haystack.includes(query);
  });

  const highPriority = leadRows.filter(
    (row) => row.leadCategory === "hot"
  ).length;

  const contacted = leadRows.filter(
    (row) => row.status === "contacted"
  ).length;

  const qualified = leadRows.filter(
    (row) => row.status === "qualified"
  ).length;

  return (
    <InventoryShell
      breadcrumb={
        <>
          Central de Operações
          <span>›</span>
          Potenciais clientes
        </>
      }
    >
      <main style={{ padding: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start",
            marginBottom: "22px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#087a5e",
                fontWeight: 800,
              }}
            >
              Comercial
            </p>

            <h1 style={{ margin: "5px 0 4px" }}>
              Potenciais clientes
            </h1>

            <p style={{ margin: 0, color: "#647886" }}>
              Leads em fase inicial de contato e qualificação comercial.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <a
              href="/crm"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                color: "inherit",
              }}
            >
              ← Voltar ao CRM
            </a>

            <a
              href="/oportunidades/nova"
              style={{
                textDecoration: "none",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#087a5e",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              + Novo potencial cliente
            </a>
          </div>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <article style={metricStyle}>
            <span style={metricLabelStyle}>Potenciais ativos</span>
            <strong style={metricValueStyle}>{leadRows.length}</strong>
          </article>

          <article style={metricStyle}>
            <span style={metricLabelStyle}>Alta prioridade</span>
            <strong style={metricValueStyle}>{highPriority}</strong>
          </article>

          <article style={metricStyle}>
            <span style={metricLabelStyle}>Em contato</span>
            <strong style={metricValueStyle}>{contacted}</strong>
          </article>

          <article style={metricStyle}>
            <span style={metricLabelStyle}>Qualificados</span>
            <strong style={metricValueStyle}>{qualified}</strong>
          </article>
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #dfe6ea",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px",
              borderBottom: "1px solid #e5eaed",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <form
              method="GET"
              action="/leads"
              style={{
                display: "flex",
                gap: "8px",
                flex: 1,
                maxWidth: "520px",
              }}
            >
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Buscar nome, telefone, e-mail, cidade ou interesse..."
                aria-label="Buscar potenciais clientes"
                style={{
                  flex: 1,
                  border: "1px solid #d8e0e5",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  font: "inherit",
                }}
              />

              <button
                type="submit"
                style={{
                  border: 0,
                  borderRadius: "8px",
                  padding: "10px 14px",
                  background: "#087a5e",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Buscar
              </button>
            </form>

            <span style={{ fontSize: "12px", color: "#71828d" }}>
              {filteredRows.length} resultado
              {filteredRows.length === 1 ? "" : "s"}
            </span>
          </div>

          {filteredRows.length === 0 ? (
            <div
              style={{
                padding: "45px 20px",
                textAlign: "center",
                color: "#647886",
              }}
            >
              <strong style={{ display: "block", marginBottom: "6px" }}>
                Nenhum potencial cliente encontrado.
              </strong>

              <span>
                Tente outro termo ou cadastre uma nova oportunidade.
              </span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#fbfcfd" }}>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle}>Cidade</th>
                    <th style={thStyle}>Interesse</th>
                    <th style={thStyle}>Etapa</th>
                    <th style={thStyle}>Prioridade</th>
                    <th style={thStyle}>Probabilidade</th>
                    <th style={thStyle}>Próxima ação</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((lead) => (
              <tr key={lead.id} className={styles.clickableRow}>
                  <td style={tdStyle}>
                    <a
                  href={`/oportunidades/${lead.id}`}
                  className={styles.rowLink}
                >
                  {lead.name}
               </a>

                        <small style={smallStyle}>
                          {lead.whatsapp || lead.email || "Sem contato"}
                        </small>
                      </td>

                      <td style={tdStyle}>
                        {lead.city || "Não informada"}
                      </td>

                      <td style={tdStyle}>
                        {lead.desiredVehicle ||
                          (lead.brand && lead.model
                            ? `${lead.brand} ${lead.model}`
                            : "A definir")}
                      </td>

                      <td style={tdStyle}>
                        {stageLabels[lead.status] ?? lead.status}
                      </td>

                      <td style={tdStyle}>
                        {priorityLabels[lead.leadCategory] ??
                          lead.leadCategory}
                      </td>

                      <td style={tdStyle}>
                        <strong>{lead.probability}%</strong>
                      </td>

                      <td style={tdStyle}>
                        {lead.nextAction || "Sem próxima ação definida"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </InventoryShell>
  );
}

const metricStyle = {
  background: "#fff",
  border: "1px solid #dfe6ea",
  borderRadius: "10px",
  padding: "14px",
};

const metricLabelStyle = {
  display: "block",
  fontSize: "11px",
  color: "#617582",
};

const metricValueStyle = {
  display: "block",
  fontSize: "22px",
  color: "#102a39",
  marginTop: "3px",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "11px 12px",
  color: "#5b6b76",
  fontSize: "11px",
  borderBottom: "1px solid #dfe6ea",
  whiteSpace: "nowrap" as const,
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #edf1f3",
  color: "#1b3441",
  verticalAlign: "middle" as const,
};

const smallStyle = {
  display: "block",
  color: "#71828d",
  fontSize: "10px",
  marginTop: "3px",
};