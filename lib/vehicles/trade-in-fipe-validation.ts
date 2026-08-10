import { getFipeQuote } from "../fipe";

export class TradeInFipeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradeInFipeValidationError";
  }
}

export type TradeInFipeCodes = {
  brandCode: string;
  modelCode: string;
  yearCode: string;
};

function code(value: unknown, label: string, pattern: RegExp) {
  if (typeof value !== "string" || !pattern.test(value.trim())) {
    throw new TradeInFipeValidationError(`${label} FIPE inválido.`);
  }
  return value.trim();
}

export function parseTradeInFipeCodes(input: Record<string, unknown>): TradeInFipeCodes {
  return {
    brandCode: code(input.brandCode, "Marca", /^[0-9]+$/),
    modelCode: code(input.modelCode, "Modelo", /^[0-9]+$/),
    yearCode: code(input.yearCode, "Ano", /^[0-9]{4,5}-[0-9]+$/),
  };
}

export async function resolveTradeInFipe(codes: TradeInFipeCodes) {
  try {
    return await getFipeQuote(codes.brandCode, codes.modelCode, codes.yearCode);
  } catch (cause) {
    throw new TradeInFipeValidationError(cause instanceof Error ? cause.message : "Não foi possível validar o veículo de troca na FIPE.");
  }
}
