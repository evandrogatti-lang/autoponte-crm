import { getFipeBrands, getFipeModels } from "../fipe";
import {
  buildDesiredVehicleLabel,
  buildFipeModelGroups,
  desiredVehicleSearchScope,
} from "./desired-profile";
import type { DesiredVehicleProfile, DesiredVehicleProfileInput, FipeOption } from "./desired-profile";

export class DesiredVehicleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DesiredVehicleValidationError";
  }
}

function text(value: unknown, field: string, maximum: number, required = false) {
  if (typeof value !== "string") {
    if (required) throw new DesiredVehicleValidationError(`${field} é obrigatório.`);
    return "";
  }
  const clean = value.trim();
  if (required && !clean) throw new DesiredVehicleValidationError(`${field} é obrigatório.`);
  if (clean.length > maximum) throw new DesiredVehicleValidationError(`${field} excede o limite permitido.`);
  return clean;
}

function integer(value: unknown, field: string, minimum: number, maximum: number, required = true) {
  if ((value === "" || value === null || value === undefined) && !required) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new DesiredVehicleValidationError(`${field} inválido.`);
  }
  return parsed;
}

export function parseDesiredVehicleProfileInput(input: unknown): DesiredVehicleProfileInput {
  if (!input || typeof input !== "object") throw new DesiredVehicleValidationError("Informe o veículo desejado.");
  const payload = input as Record<string, unknown>;
  const currentYear = new Date().getFullYear();
  const profile: DesiredVehicleProfileInput = {
    brandCode: text(payload.brandCode, "Marca", 30, true),
    brand: text(payload.brand, "Marca", 120, true),
    modelKey: text(payload.modelKey, "Modelo", 140),
    model: text(payload.model, "Modelo", 160),
    versionCode: text(payload.versionCode, "Versão", 30),
    version: text(payload.version, "Versão", 240),
    yearMin: integer(payload.yearMin, "Ano mínimo", 1950, currentYear + 2),
    yearMax: integer(payload.yearMax, "Ano máximo", 1950, currentYear + 2),
    priceMin: integer(payload.priceMin, "Valor mínimo", 0, 10_000_000, false),
    priceMax: integer(payload.priceMax, "Valor máximo", 3_000, 10_000_000),
  };

  if (!/^\d+$/.test(profile.brandCode)) throw new DesiredVehicleValidationError("Código da marca FIPE inválido.");
  if (profile.modelKey && !profile.model) throw new DesiredVehicleValidationError("Modelo inválido.");
  if (profile.model && !profile.modelKey) throw new DesiredVehicleValidationError("Modelo inválido.");
  if (profile.versionCode && (!profile.version || !profile.modelKey)) throw new DesiredVehicleValidationError("Versão inválida.");
  if (profile.yearMin > profile.yearMax) throw new DesiredVehicleValidationError("O ano mínimo não pode ser maior que o ano máximo.");
  if (profile.priceMin > profile.priceMax) throw new DesiredVehicleValidationError("O valor mínimo não pode ser maior que o valor máximo.");
  return profile;
}

export async function resolveDesiredVehicleProfile(input: DesiredVehicleProfileInput): Promise<DesiredVehicleProfile> {
  let brands;
  let models: FipeOption[] = [];
  try {
    brands = await getFipeBrands();
    if (input.modelKey || input.versionCode) models = await getFipeModels(input.brandCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "A consulta FIPE está indisponível.";
    throw new DesiredVehicleValidationError(message);
  }

  const officialBrand = brands.find((brand) => brand.codigo === input.brandCode);
  if (!officialBrand || officialBrand.nome.trim().toLocaleLowerCase("pt-BR") !== input.brand.trim().toLocaleLowerCase("pt-BR")) {
    throw new DesiredVehicleValidationError("A marca selecionada não corresponde ao catálogo FIPE.");
  }

  const groups = buildFipeModelGroups(models);
  const group = input.modelKey ? groups.find((candidate) => candidate.key === input.modelKey) : undefined;
  if (input.modelKey && (!group || group.label.toLocaleLowerCase("pt-BR") !== input.model.toLocaleLowerCase("pt-BR"))) {
    throw new DesiredVehicleValidationError("O modelo selecionado não corresponde ao catálogo FIPE.");
  }

  if (input.versionCode) {
    const version = group?.versions.find((candidate) => candidate.codigo === input.versionCode);
    if (!version || version.nome.toLocaleLowerCase("pt-BR") !== input.version.toLocaleLowerCase("pt-BR")) {
      throw new DesiredVehicleValidationError("A versão selecionada não corresponde ao catálogo FIPE.");
    }
  }

  const normalized: DesiredVehicleProfileInput = {
    ...input,
    brand: officialBrand.nome,
    model: group?.label ?? "",
    version: input.versionCode ? group?.versions.find((candidate) => candidate.codigo === input.versionCode)?.nome ?? "" : "",
  };

  return {
    ...normalized,
    searchScope: desiredVehicleSearchScope(normalized),
    label: buildDesiredVehicleLabel(normalized),
  };
}
