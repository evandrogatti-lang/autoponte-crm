import styles from "./Leads.module.css";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";
import { InventoryShell } from "../../features/vehicle-registry/components/InventoryShell";
import Link from "next/link";

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

const filterKeys = [
  "q",
  "status",
  "priority",
  "city",
  "interest",
  "probabilityMin",
  "probabilityMax",
  "valueMin",
  "valueMax",
  "updatedFrom",
  "updatedTo",
] as const;

type LeadFilters = Record<(typeof filterKeys)[number], string>;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function toNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Partial<Record<(typeof filterKeys)[number], string | string[]>>>;
}) {
  await requireChatGPTUser("/leads");

  const requestedParams = await searchParams;
  const filters = filterKeys.reduce((result, key) => {
    const value = requestedParams[key];
    result[key] = (Array.isArray(value) ? value[0] : value ?? "").trim();
    return result;
  }, {} as LeadFilters);

  const canonicalParams = new URLSearchParams();
  filterKeys.forEach((key) => {
    if (filters[key]) canonicalParams.set(key, filters[key]);
  });
  const requestedQuery = new URLSearchParams(
    Object.entries(requestedParams).flatMap(([key, value]) =>
      Array.isArray(value) ? value.map((item) => [key, item]) : value ? [[key, value]] : []
    )
  ).toString();
  const canonicalQuery = canonicalParams.toString();

  if (requestedQuery !== canonicalQuery) {
    redirect(canonicalQuery ? `/leads?${canonicalQuery}` : "/leads");
  }

  const query = normalizeText(filters.q);
  const probabilityMin = toNumber(filters.probabilityMin);
  const probabilityMax = toNumber(filters.probabilityMax);
  const valueMin = toNumber(filters.valueMin);
  const valueMax = toNumber(filters.valueMax);
  const updatedFrom = filters.updatedFrom ? new Date(`${filters.updatedFrom}T00:00:00`) : null;
  const updatedTo = filters.updatedTo ? new Date(`${filters.updatedTo}T23:59:59.999`) : null;

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
    const interest = row.desiredVehicle || `${row.brand} ${row.model}`;
    const haystack = normalizeText(
      [row.name, row.whatsapp, row.email, row.city, interest, row.nextAction]
        .filter(Boolean)
        .join(" ")
    );
    const updatedAt = new Date(row.updatedAt);

    return (
      (!query || haystack.includes(query)) &&
      (!filters.city || row.city === filters.city) &&
      (!filters.interest || interest === filters.interest) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.priority || row.leadCategory === filters.priority) &&
      (probabilityMin === null || row.probability >= probabilityMin) &&
      (probabilityMax === null || row.probability <= probabilityMax) &&
      (valueMin === null || row.desiredPriceMax >= valueMin) &&
      (valueMax === null || row.desiredPriceMin <= valueMax) &&
      (!updatedFrom || updatedAt >= updatedFrom) &&
      (!updatedTo || updatedAt <= updatedTo)
    );
  });

  const cities = [...new Set(leadRows.map((row) => row.city).filter(Boolean))].sort((first, second) =>
    first.localeCompare(second, "pt-BR")
  );
  const interests = [
    ...new Set(
      leadRows
        .map((row) => row.desiredVehicle || `${row.brand} ${row.model}`)
        .filter(Boolean)
    ),
  ].sort((first, second) => first.localeCompare(second, "pt-BR"));
  const activeFilters = filterKeys.filter((key) => filters[key]);
  const currentHref = canonicalQuery ? `/leads?${canonicalQuery}` : "/leads";

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
            <Link
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
            </Link>

            <Link
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
            </Link>
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
          <div className={styles.filterPanel}>
            <form method="GET" action="/leads" className={styles.filterForm}>
              <div className={styles.primaryFilters}>
                <label className={styles.searchField}>
                  <span>Busca</span>
              <input
                type="search"
                name="q"
                    defaultValue={filters.q}
                    placeholder="Cliente, telefone, e-mail, cidade, interesse ou próxima ação"
                aria-label="Buscar potenciais clientes"
              />
                </label>

                <label className={styles.selectField}>
                  <span>Etapa</span>
                  <select name="status" defaultValue={filters.status}>
                    <option value="">Todas</option>
                    {Object.entries(stageLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.selectField}>
                  <span>Prioridade</span>
                  <select name="priority" defaultValue={filters.priority}>
                    <option value="">Todas</option>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <details className={styles.moreFilters} open={activeFilters.some((key) => !["q", "status", "priority"].includes(key))}>
                <summary>Mais filtros</summary>
                <div className={styles.secondaryFilters}>
                  <label className={styles.selectField}>
                    <span>Cidade</span>
                    <select name="city" defaultValue={filters.city}>
                      <option value="">Todas</option>
                      {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </label>

                  <label className={styles.selectField}>
                    <span>Interesse / veículo desejado</span>
                    <select name="interest" defaultValue={filters.interest}>
                      <option value="">Todos</option>
                      {interests.map((interest) => <option key={interest} value={interest}>{interest}</option>)}
                    </select>
                  </label>

                  <label className={styles.numberField}><span>Probabilidade mínima</span><input type="number" name="probabilityMin" min="0" max="100" defaultValue={filters.probabilityMin} /></label>
                  <label className={styles.numberField}><span>Probabilidade máxima</span><input type="number" name="probabilityMax" min="0" max="100" defaultValue={filters.probabilityMax} /></label>
                  <label className={styles.numberField}><span>Valor desejado mínimo</span><input type="number" name="valueMin" min="0" step="1000" defaultValue={filters.valueMin} /></label>
                  <label className={styles.numberField}><span>Valor desejado máximo</span><input type="number" name="valueMax" min="0" step="1000" defaultValue={filters.valueMax} /></label>
                  <label className={styles.dateField}><span>Atualizado a partir de</span><input type="date" name="updatedFrom" defaultValue={filters.updatedFrom} /></label>
                  <label className={styles.dateField}><span>Atualizado até</span><input type="date" name="updatedTo" defaultValue={filters.updatedTo} /></label>
                </div>
              </details>

              <button
                type="submit"
                className={styles.submitButton}
              >
                Aplicar filtros
              </button>
            </form>

            <span className={styles.resultCount}>
              {filteredRows.length} resultado
              {filteredRows.length === 1 ? "" : "s"}
            </span>
          </div>

          {activeFilters.length > 0 && (
            <div className={styles.activeFilters} aria-label="Filtros ativos">
              {activeFilters.map((key) => {
                const params = new URLSearchParams(canonicalParams);
                params.delete(key);
                const href = params.size ? `/leads?${params}` : "/leads";
                return <Link key={key} href={href} className={styles.filterChip}>{filterLabel(key, filters[key])} <span aria-hidden="true">×</span></Link>;
              })}
              <Link href="/leads" className={styles.clearFilters}>Limpar filtros</Link>
            </div>
          )}

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
            <div className={styles.tableWrapper}>
              <table
                className={styles.leadsTable}
              >
                <thead>
                  <tr style={{ background: "#fbfcfd" }}>
                    <th style={thStyle}>Cliente</th>
                    <th style={thStyle} className={styles.optionalColumn}>Cidade</th>
                    <th style={thStyle} className={styles.optionalColumn}>Interesse</th>
                    <th style={thStyle}>Etapa</th>
                    <th style={thStyle}>Prioridade</th>
                    <th style={thStyle}>Próxima ação</th>
                    <th style={thStyle}>Probabilidade</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((lead) => (
              <tr key={lead.id} className={styles.clickableRow}>
                  <td style={tdStyle}>
                    <Link
                  href={`/oportunidades/${lead.id}?returnTo=${encodeURIComponent(currentHref)}`}
                  className={styles.rowLink}
                >
                  {lead.name}
               </Link>

                        <small style={smallStyle}>
                          {lead.whatsapp || lead.email || "Sem contato"}
                        </small>
                      </td>

                      <td style={tdStyle} className={styles.optionalColumn}>
                        {lead.city || "Não informada"}
                      </td>

                      <td style={tdStyle} className={styles.optionalColumn}>
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
                        <strong style={{ color: lead.nextAction ? "#0d2233" : "#6a7d8b" }}>
                          {lead.nextAction || "Sem próxima ação definida"}
                        </strong>
                      </td>

                      <td style={tdStyle}>
                        <strong>{lead.probability}%</strong>
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

function filterLabel(key: keyof LeadFilters, value: string) {
  const labels: Record<keyof LeadFilters, string> = {
    q: `Busca: ${value}`,
    status: `Etapa: ${stageLabels[value] ?? value}`,
    priority: `Prioridade: ${priorityLabels[value] ?? value}`,
    city: `Cidade: ${value}`,
    interest: `Interesse: ${value}`,
    probabilityMin: `Probabilidade a partir de ${value}%`,
    probabilityMax: `Probabilidade até ${value}%`,
    valueMin: `Valor a partir de ${value}`,
    valueMax: `Valor até ${value}`,
    updatedFrom: `Atualizado desde ${value}`,
    updatedTo: `Atualizado até ${value}`,
  };

  return labels[key];
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