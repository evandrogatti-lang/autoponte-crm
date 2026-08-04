const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1/carros";

export type FipeOption = { codigo: string; nome: string };

export type FipeQuote = {
  price: number;
  priceFormatted: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  fipeCode: string;
  referenceMonth: string;
};

export function parseFipeSubmission(input: Record<string, string>): FipeQuote {
  const price = Number(input.price);
  const modelYear = Number(input.modelYear);
  if (!Number.isFinite(price) || price < 3000 || price > 5_000_000) throw new Error("Valor FIPE inválido.");
  if (!Number.isInteger(modelYear) || modelYear < 1950 || modelYear > new Date().getFullYear() + 2) throw new Error("Ano FIPE inválido.");
  const required = [input.brand, input.model, input.fuel, input.fipeCode, input.referenceMonth];
  if (required.some((item) => !item || item.length > 180)) throw new Error("Dados FIPE incompletos.");
  if (!/^[0-9]{6}-[0-9]$/.test(input.fipeCode)) throw new Error("Código FIPE inválido.");
  return {
    price,
    priceFormatted: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price),
    brand: input.brand,
    model: input.model,
    modelYear,
    fuel: input.fuel,
    fipeCode: input.fipeCode,
    referenceMonth: input.referenceMonth,
  };
}

function code(value: string, pattern = /^[0-9]+$/) {
  if (!pattern.test(value)) throw new Error("Código FIPE inválido.");
  return value;
}

async function fipeFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${FIPE_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 429) throw new Error("Limite temporário de consultas FIPE atingido.");
  if (!response.ok) throw new Error("A consulta FIPE está indisponível no momento.");
  return response.json() as Promise<T>;
}

export function getFipeBrands() {
  return fipeFetch<FipeOption[]>("/marcas");
}

export async function getFipeModels(brandCode: string) {
  const result = await fipeFetch<{ modelos: FipeOption[] }>(`/marcas/${code(brandCode)}/modelos`);
  return result.modelos;
}

export function getFipeYears(brandCode: string, modelCode: string) {
  return fipeFetch<FipeOption[]>(`/marcas/${code(brandCode)}/modelos/${code(modelCode)}/anos`);
}

export async function getFipeQuote(brandCode: string, modelCode: string, yearCode: string): Promise<FipeQuote> {
  const result = await fipeFetch<{
    Valor: string;
    Marca: string;
    Modelo: string;
    AnoModelo: number;
    Combustivel: string;
    CodigoFipe: string;
    MesReferencia: string;
  }>(`/marcas/${code(brandCode)}/modelos/${code(modelCode)}/anos/${code(yearCode, /^[0-9]{4}-[0-9]+$/)}`);
  const price = Number(result.Valor.replace(/[^0-9,]/g, "").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) throw new Error("Valor FIPE inválido.");
  return {
    price,
    priceFormatted: result.Valor,
    brand: result.Marca,
    model: result.Modelo,
    modelYear: result.AnoModelo,
    fuel: result.Combustivel,
    fipeCode: result.CodigoFipe,
    referenceMonth: result.MesReferencia,
  };
}
