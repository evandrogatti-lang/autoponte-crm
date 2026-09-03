export const commercialRoutes = {
  missionControl: "/crm",
  leads: "/leads",
  newLead: "/leads/novo",
  qualification: "/leads",
  match: "/matches",
  matchIntake: "/atendimento",
  negotiations: "/negociacoes",
  funnel: "/funil",
  tradeEvaluation: "/#troca",
  proposals: "/propostas",
  sales: "/entregas",
} as const;

export const commercialLabels = {
  lead: "Lead",
  qualification: "Qualificação",
  match: "Match",
  negotiation: "Negociação",
  sale: "Venda",
} as const;

export function leadQualificationHref(id: string) {
  return `${commercialRoutes.leads}/${encodeURIComponent(id)}`;
}

export function negotiationHref(id: string) {
  return `${commercialRoutes.negotiations}/${encodeURIComponent(id)}`;
}

export type CommercialSearchParams = Record<string, string | string[] | undefined>;

export function withSearchParams(path: string, values: CommercialSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, item);
    }
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}
