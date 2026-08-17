import * as citiesByUfRaw from "./cities-by-uf.json";

export const BR_STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
] as const;

export type BrStateCode = (typeof BR_STATES)[number]["code"];

const citiesByUfEntries = Object.entries(citiesByUfRaw as Record<string, string[] | string>).map(
  ([code, value]) => [code, Array.isArray(value) ? value : [value]]
);
const citiesByUf = Object.fromEntries(citiesByUfEntries) as Record<string, string[]>;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function normalizeUf(value: string) {
  return value.trim().slice(0, 2).toUpperCase();
}

export function findStateByInput(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const asCode = normalizeUf(raw);
  const byCode = BR_STATES.find((item) => item.code === asCode);
  if (byCode) return byCode;
  const normalized = normalizeText(raw.replace(/^[A-Z]{2}\s*-\s*/i, ""));
  return BR_STATES.find((item) => normalizeText(item.name) === normalized) ?? null;
}

export function stateLabel(code: string) {
  const state = BR_STATES.find((item) => item.code === normalizeUf(code));
  return state ? `${state.code} - ${state.name}` : code;
}

export function getCitiesByUf(uf: string) {
  const code = normalizeUf(uf);
  const rows = citiesByUf[code];
  return Array.isArray(rows) ? rows : [];
}

export function filterCitiesByPrefix(uf: string, query: string, limit = 120) {
  const normalized = normalizeText(query);
  const rows = getCitiesByUf(uf);
  if (!normalized) return rows.slice(0, limit);
  return rows.filter((city) => normalizeText(city).startsWith(normalized)).slice(0, limit);
}
