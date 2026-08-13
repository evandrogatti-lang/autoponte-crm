export type VehicleFilterParams = {
  q?: string;
  status?: string;
  origin?: string;
  brand?: string;
  model?: string;
  partner?: string;
  yearMin?: string;
  yearMax?: string;
  priceMin?: string;
  priceMax?: string;
  fipeMin?: string;
  fipeMax?: string;
  condition?: string;
  age?: string;
};

type FilterableVehicle = {
  brand: string;
  model: string;
  plate: string;
  stockCode: string;
  ownerName: string;
  partnerId: string;
  modelYear: number;
  askingPrice: number;
  fipeValue: number;
  vehicleCondition: string;
  listingDate: string;
  acquisitionDate: string;
  createdAt: Date;
  status: string;
  sourceType: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function textIncludes(value: string, query: string) {
  return normalizeText(value).includes(query);
}

function numericValue(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function vehicleAgeDays(vehicle: Pick<FilterableVehicle, "listingDate" | "acquisitionDate" | "createdAt">) {
  const value = vehicle.listingDate || vehicle.acquisitionDate || vehicle.createdAt;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

export function vehicleListValue(vehicle: Pick<FilterableVehicle, "askingPrice" | "fipeValue">) {
  return vehicle.askingPrice || vehicle.fipeValue || 0;
}

export function filterVehicleList<T extends FilterableVehicle>(
  rows: T[],
  filters: VehicleFilterParams,
  partnerNames: Map<string, string> = new Map()
) {
  const query = filters.q ? normalizeText(filters.q) : "";
  const yearMin = numericValue(filters.yearMin);
  const yearMax = numericValue(filters.yearMax);
  const priceMin = numericValue(filters.priceMin);
  const priceMax = numericValue(filters.priceMax);
  const fipeMin = numericValue(filters.fipeMin);
  const fipeMax = numericValue(filters.fipeMax);

  return rows.filter((vehicle) => {
    const value = vehicleListValue(vehicle);
    const age = vehicleAgeDays(vehicle);
    const haystack = [vehicle.brand, vehicle.model, vehicle.plate, vehicle.stockCode, vehicle.ownerName, partnerNames.get(vehicle.partnerId)]
      .filter(Boolean)
      .join(" ");
    const statusOk = !filters.status || filters.status === "all" || (filters.status === "active" ? !["sold", "unavailable"].includes(vehicle.status) : vehicle.status === filters.status);
    const ageOk = !filters.age || (filters.age === "0-30" ? age !== null && age <= 30 : filters.age === "31-60" ? age !== null && age >= 31 && age <= 60 : filters.age === "61-90" ? age !== null && age >= 61 && age <= 90 : filters.age === "91+" ? age !== null && age >= 91 : true);

    return (
      (!query || textIncludes(haystack, query)) &&
      (!filters.origin || filters.origin === "all" || vehicle.sourceType === filters.origin) &&
      statusOk &&
      (!filters.brand || normalizeText(vehicle.brand) === normalizeText(filters.brand)) &&
      (!filters.model || normalizeText(vehicle.model) === normalizeText(filters.model)) &&
      (!filters.partner || vehicle.partnerId === filters.partner) &&
      (yearMin === null || vehicle.modelYear >= yearMin) &&
      (yearMax === null || vehicle.modelYear <= yearMax) &&
      (priceMin === null || value >= priceMin) &&
      (priceMax === null || value <= priceMax) &&
      (fipeMin === null || vehicle.fipeValue >= fipeMin) &&
      (fipeMax === null || vehicle.fipeValue <= fipeMax) &&
      (!filters.condition || vehicle.vehicleCondition === filters.condition) &&
      ageOk
    );
  });
}

export function buildVehicleListHref(pathname: string, filters: VehicleFilterParams & { scope?: string }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "all") query.set(key, value);
  }
  const value = query.toString();
  return value ? `${pathname}?${value}` : pathname;
}

export function activeVehicleFilterChips(filters: VehicleFilterParams, labels: { partners?: Map<string, string>; origins?: Record<string, string>; statuses?: Record<string, string> } = {}) {
  const values: Array<[string, string | undefined]> = [
    ["Busca", filters.q],
    ["Status", filters.status && filters.status !== "all" ? labels.statuses?.[filters.status] || filters.status : undefined],
    ["Origem", filters.origin && filters.origin !== "all" ? labels.origins?.[filters.origin] || filters.origin : undefined],
    ["Marca", filters.brand],
    ["Modelo", filters.model],
    ["Parceiro", filters.partner ? labels.partners?.get(filters.partner) || filters.partner : undefined],
    ["Ano mínimo", filters.yearMin],
    ["Ano máximo", filters.yearMax],
    ["Preço mínimo", filters.priceMin],
    ["Preço máximo", filters.priceMax],
    ["FIPE mínima", filters.fipeMin],
    ["FIPE máxima", filters.fipeMax],
    ["Condição", filters.condition],
    ["Tempo em estoque", filters.age],
  ];
  return values.filter((entry): entry is [string, string] => Boolean(entry[1]));
}