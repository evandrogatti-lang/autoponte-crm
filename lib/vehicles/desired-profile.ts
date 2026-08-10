export type FipeOption = { codigo: string; nome: string };

export type FipeModelGroup = {
  key: string;
  label: string;
  versions: FipeOption[];
};

export type DesiredVehicleProfileInput = {
  brandCode: string;
  brand: string;
  modelKey: string;
  model: string;
  versionCode: string;
  version: string;
  yearMin: number;
  yearMax: number;
  priceMin: number;
  priceMax: number;
};

export type DesiredVehicleProfile = DesiredVehicleProfileInput & {
  searchScope: "brand" | "model" | "version" | "legacy";
  label: string;
};

const structuralSecondWords = new Set([
  "CROSS", "PLUS", "SEDAN", "HATCH", "SPORT", "ROVER", "CRUISER", "CHEROKEE",
  "COUPE", "WAGON", "SW", "SPACE", "PICASSO", "FASTBACK", "COUNTRYMAN", "CLUBMAN",
]);

const trimAndEngineWords = new Set([
  "EX", "EXL", "LX", "LXS", "LXL", "XEI", "XLI", "GLI", "ALTIS", "TOURING", "ADVANCE",
  "COMFORT", "COMFORTLINE", "HIGHLINE", "TRENDLINE", "PREMIER", "LT", "LTZ", "RS", "SS",
  "LIMITED", "LONGITUDE", "TRAILHAWK", "SPORT", "S", "SE", "SEL", "TITANIUM", "FREESTYLE",
  "PLATINUM", "EXCLUSIVE", "INTENSE", "ZEN", "ICONIC", "GRIFFE", "ALLURE", "FEEL", "SHINE",
  "DRIVE", "PRECISION", "VOLCANO", "RANCH", "ENDURANCE", "FREEDOM", "AUDACE", "IMPETUS",
  "DYNAMIC", "DYNAMIQUE", "AUTHENTIQUE", "ELEGANCE", "AVANTGARDE", "AMG", "M", "S-LINE",
]);

function normalizedTokens(name: string) {
  return name.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
}

function comparableToken(token: string) {
  return token.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[(),]/g, "");
}

function isEngineOrTrimToken(token: string) {
  const normalized = comparableToken(token);
  return trimAndEngineWords.has(normalized)
    || /^\d+(\.\d+)?$/.test(normalized)
    || /^\d+(\.\d+)?[A-Z]+$/.test(normalized)
    || /^\d{1,2}V$/.test(normalized)
    || /^(FLEX|GASOLINA|DIESEL|HYBRID|HIBRIDO|AUT|MAN|CVT|TURBO)$/.test(normalized);
}

function prefixKey(tokens: string[], length: number) {
  return tokens.slice(0, length).map(comparableToken).join(" ");
}

function inferFamilyLength(tokens: string[], allTokens: string[][]) {
  const maximum = Math.min(4, Math.max(1, tokens.length - 1));
  for (let length = maximum; length >= 2; length -= 1) {
    if (tokens.slice(1, length).some(isEngineOrTrimToken)) continue;
    const key = prefixKey(tokens, length);
    const count = allTokens.filter((candidate) => candidate.length >= length && prefixKey(candidate, length) === key).length;
    if (count >= 2) return length;
  }
  if (tokens[1] && structuralSecondWords.has(comparableToken(tokens[1]))) return 2;
  return 1;
}

export function buildFipeModelGroups(options: FipeOption[]): FipeModelGroup[] {
  const valid = options.filter((option) => /^\d+$/.test(option.codigo) && option.nome.trim());
  const allTokens = valid.map((option) => normalizedTokens(option.nome));
  const groups = new Map<string, FipeModelGroup>();

  valid.forEach((option, index) => {
    const tokens = allTokens[index];
    const familyLength = inferFamilyLength(tokens, allTokens);
    const label = tokens.slice(0, familyLength).join(" ");
    const key = prefixKey(tokens, familyLength).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const current = groups.get(key) ?? { key, label, versions: [] };
    current.versions.push(option);
    groups.set(key, current);
  });

  return [...groups.values()]
    .map((group) => ({ ...group, versions: [...group.versions].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")) }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function desiredVehicleSearchScope(input: DesiredVehicleProfileInput): DesiredVehicleProfile["searchScope"] {
  if (input.versionCode && input.version) return "version";
  if (input.modelKey && input.model) return "model";
  return "brand";
}

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function buildDesiredVehicleLabel(input: DesiredVehicleProfileInput) {
  const selected = input.version || input.model;
  const vehicle = selected
    ? selected.toLocaleLowerCase("pt-BR").startsWith(input.brand.toLocaleLowerCase("pt-BR")) ? selected : `${input.brand} ${selected}`
    : input.brand;
  const years = input.yearMin === input.yearMax ? String(input.yearMin) : `${input.yearMin}–${input.yearMax}`;
  const prices = input.priceMin > 0 ? `${brl(input.priceMin)}–${brl(input.priceMax)}` : `até ${brl(input.priceMax)}`;
  const flexibility = input.version ? "" : input.model ? " · todas as versões" : " · todos os modelos";
  return `${vehicle}${flexibility} · ${years} · ${prices}`;
}

export function emptyDesiredVehicleProfile(): DesiredVehicleProfileInput {
  const currentYear = new Date().getFullYear();
  return {
    brandCode: "",
    brand: "",
    modelKey: "",
    model: "",
    versionCode: "",
    version: "",
    yearMin: currentYear - 3,
    yearMax: currentYear + 1,
    priceMin: 0,
    priceMax: 0,
  };
}
