"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  buildDesiredVehicleLabel,
  buildFipeModelGroups,
  emptyDesiredVehicleProfile,
} from "../../../lib/vehicles/desired-profile";
import type {
  DesiredVehicleProfileInput,
  FipeModelGroup,
  FipeOption,
} from "../../../lib/vehicles/desired-profile";
import styles from "./DesiredVehicleSelector.module.css";

export type DesiredVehicleSelectorValue = DesiredVehicleProfileInput;

type Props = {
  value: DesiredVehicleSelectorValue;
  onChange: (value: DesiredVehicleSelectorValue) => void;
  disabled?: boolean;
  compact?: boolean;
  idPrefix?: string;
};

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear + 2 - 1950 + 1 }, (_, index) => currentYear + 2 - index);

async function getOptions(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json() as Array<{ codigo: string | number; nome: string }> | { error?: string };
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(!Array.isArray(data) && data.error ? data.error : "Não foi possível carregar o catálogo FIPE.");
  }

  // A API FIPE pode devolver `codigo` como número em alguns endpoints.
  // O <select> sempre devolve string; normalizar aqui evita que a versão
  // apareça na lista, mas volte para "Todas as versões" após o clique.
  return data.map((option) => ({
    codigo: String(option.codigo),
    nome: String(option.nome ?? "").trim(),
  })).filter((option) => option.codigo && option.nome);
}

export function DesiredVehicleSelector({ value, onChange, disabled = false, compact = false, idPrefix = "desired" }: Props) {
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [groups, setGroups] = useState<FipeModelGroup[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingBrands(true);
    getOptions("/api/fipe?resource=brands")
      .then((items) => { if (active) setBrands(items.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as marcas FIPE."); })
      .finally(() => { if (active) setLoadingBrands(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!value.brandCode) {
      setGroups([]);
      return;
    }
    let active = true;
    setLoadingModels(true);
    setError("");
    getOptions(`/api/fipe?resource=models&brand=${encodeURIComponent(value.brandCode)}`)
      .then((items) => { if (active) setGroups(buildFipeModelGroups(items)); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os modelos FIPE."); })
      .finally(() => { if (active) setLoadingModels(false); });
    return () => { active = false; };
  }, [value.brandCode]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === value.modelKey),
    [groups, value.modelKey],
  );

  function selectBrand(event: ChangeEvent<HTMLSelectElement>) {
    const option = brands.find((brand) => brand.codigo === event.target.value);
    onChange({
      ...emptyDesiredVehicleProfile(),
      yearMin: value.yearMin,
      yearMax: value.yearMax,
      priceMin: value.priceMin,
      priceMax: value.priceMax,
      brandCode: option?.codigo ?? "",
      brand: option?.nome ?? "",
    });
  }

  function selectModel(event: ChangeEvent<HTMLSelectElement>) {
    const group = groups.find((item) => item.key === event.target.value);
    onChange({
      ...value,
      modelKey: group?.key ?? "",
      model: group?.label ?? "",
      versionCode: "",
      version: "",
    });
  }

  function selectVersion(event: ChangeEvent<HTMLSelectElement>) {
    const selectedCode = String(event.target.value);
    const option = selectedGroup?.versions.find((version) => String(version.codigo) === selectedCode);
    onChange({
      ...value,
      versionCode: option ? String(option.codigo) : "",
      version: option?.nome ?? "",
    });
  }

  function updateNumber(field: "yearMin" | "yearMax" | "priceMin" | "priceMax", raw: string) {
    const parsed = raw === "" ? 0 : Number(raw);
    onChange({ ...value, [field]: Number.isFinite(parsed) ? parsed : 0 });
  }

  const summary = value.brand && value.priceMax > 0 && value.yearMin > 0 && value.yearMax > 0
    ? buildDesiredVehicleLabel(value)
    : "Selecione a marca e informe ano e valor máximo para formar a demanda.";

  return (
    <div className={`${styles.selector} ${compact ? styles.compact : ""}`}>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <div className={styles.grid}>
        <label className={styles.field} htmlFor={`${idPrefix}-brand`}>
          <span>Marca *</span>
          <select id={`${idPrefix}-brand`} value={value.brandCode} onChange={selectBrand} required disabled={disabled || loadingBrands}>
            <option value="">{loadingBrands ? "Carregando marcas FIPE..." : "Selecione a marca"}</option>
            {brands.map((brand) => <option key={brand.codigo} value={brand.codigo}>{brand.nome}</option>)}
          </select>
        </label>

        <label className={styles.field} htmlFor={`${idPrefix}-model`}>
          <span>Modelo</span>
          <select id={`${idPrefix}-model`} value={value.modelKey} onChange={selectModel} disabled={disabled || !value.brandCode || loadingModels}>
            <option value="">{loadingModels ? "Carregando modelos..." : "Todos os modelos"}</option>
            {groups.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}
          </select>
        </label>

        <label className={styles.field} htmlFor={`${idPrefix}-version`}>
          <span>Versão</span>
          <select id={`${idPrefix}-version`} value={value.versionCode} onChange={selectVersion} disabled={disabled || !selectedGroup}>
            <option value="">Todas as versões</option>
            {selectedGroup?.versions.map((version) => <option key={version.codigo} value={version.codigo}>{version.nome}</option>)}
          </select>
        </label>

        <label className={styles.field} htmlFor={`${idPrefix}-year-min`}>
          <span>Ano mínimo *</span>
          <select id={`${idPrefix}-year-min`} value={value.yearMin || ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateNumber("yearMin", event.target.value)} required disabled={disabled}>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        <label className={styles.field} htmlFor={`${idPrefix}-year-max`}>
          <span>Ano máximo *</span>
          <select id={`${idPrefix}-year-max`} value={value.yearMax || ""} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateNumber("yearMax", event.target.value)} required disabled={disabled}>
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>

        <label className={styles.field} htmlFor={`${idPrefix}-price-min`}>
          <span>Valor mínimo</span>
          <input id={`${idPrefix}-price-min`} type="number" min="0" step="1000" value={value.priceMin || ""} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumber("priceMin", event.target.value)} placeholder="Opcional" disabled={disabled} />
        </label>

        <label className={styles.field} htmlFor={`${idPrefix}-price-max`}>
          <span>Valor máximo *</span>
          <input id={`${idPrefix}-price-max`} type="number" min="3000" step="1000" value={value.priceMax || ""} onChange={(event: ChangeEvent<HTMLInputElement>) => updateNumber("priceMax", event.target.value)} placeholder="Ex.: 150000" required disabled={disabled} />
        </label>
      </div>
      <p className={styles.helper}>A ausência de modelo ou versão representa flexibilidade comercial, não cadastro incompleto.</p>
      <div className={styles.summary}><strong>Demanda estruturada</strong>{summary}</div>
    </div>
  );
}
