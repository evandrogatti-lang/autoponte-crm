"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import styles from "./TradeInFipeSelector.module.css";

type FipeOption = { codigo: string; nome: string };
type FipeQuote = {
  price: number;
  priceFormatted: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  fipeCode: string;
  referenceMonth: string;
};

export type TradeInFipeValue = {
  brandCode: string;
  modelCode: string;
  yearCode: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  fipeCode: string;
  referenceMonth: string;
  price: number;
};

export const emptyTradeInFipeValue: TradeInFipeValue = {
  brandCode: "",
  modelCode: "",
  yearCode: "",
  brand: "",
  model: "",
  modelYear: 0,
  fuel: "",
  fipeCode: "",
  referenceMonth: "",
  price: 0,
};

type Props = {
  value: TradeInFipeValue;
  onChange: (value: TradeInFipeValue) => void;
  disabled?: boolean;
  idPrefix?: string;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json() as T | { error?: string };
  if (!response.ok) {
    throw new Error(typeof data === "object" && data && "error" in data && data.error ? data.error : "Não foi possível consultar a FIPE.");
  }
  return data as T;
}

export function TradeInFipeSelector({ value, onChange, disabled = false, idPrefix = "trade-fipe" }: Props) {
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [models, setModels] = useState<FipeOption[]>([]);
  const [years, setYears] = useState<FipeOption[]>([]);
  const [loading, setLoading] = useState<"brands" | "models" | "years" | "quote" | "">("brands");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getJson<FipeOption[]>("/api/fipe?resource=brands")
      .then((items) => { if (active) setBrands(items.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as marcas."); })
      .finally(() => { if (active) setLoading(""); });
    return () => { active = false; };
  }, []);

  async function selectBrand(event: ChangeEvent<HTMLSelectElement>) {
    const brandCode = event.target.value;
    const brand = brands.find((item) => item.codigo === brandCode)?.nome ?? "";
    onChange({ ...emptyTradeInFipeValue, brandCode, brand });
    setModels([]);
    setYears([]);
    setError("");
    if (!brandCode) return;
    setLoading("models");
    try {
      const items = await getJson<FipeOption[]>(`/api/fipe?resource=models&brand=${encodeURIComponent(brandCode)}`);
      setModels(items.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os modelos.");
    } finally {
      setLoading("");
    }
  }

  async function selectModel(event: ChangeEvent<HTMLSelectElement>) {
    const modelCode = event.target.value;
    const model = models.find((item) => item.codigo === modelCode)?.nome ?? "";
    onChange({ ...value, modelCode, model, yearCode: "", modelYear: 0, fuel: "", fipeCode: "", referenceMonth: "", price: 0 });
    setYears([]);
    setError("");
    if (!modelCode || !value.brandCode) return;
    setLoading("years");
    try {
      const items = await getJson<FipeOption[]>(`/api/fipe?resource=years&brand=${encodeURIComponent(value.brandCode)}&model=${encodeURIComponent(modelCode)}`);
      setYears(items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os anos.");
    } finally {
      setLoading("");
    }
  }

  async function selectYear(event: ChangeEvent<HTMLSelectElement>) {
    const yearCode = event.target.value;
    onChange({ ...value, yearCode, modelYear: 0, fuel: "", fipeCode: "", referenceMonth: "", price: 0 });
    setError("");
    if (!yearCode || !value.brandCode || !value.modelCode) return;
    setLoading("quote");
    try {
      const quote = await getJson<FipeQuote>(`/api/fipe?resource=quote&brand=${encodeURIComponent(value.brandCode)}&model=${encodeURIComponent(value.modelCode)}&year=${encodeURIComponent(yearCode)}`);
      onChange({
        ...value,
        yearCode,
        brand: quote.brand,
        model: quote.model,
        modelYear: quote.modelYear,
        fuel: quote.fuel,
        fipeCode: quote.fipeCode,
        referenceMonth: quote.referenceMonth,
        price: quote.price,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar o valor FIPE.");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className={styles.selector}>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <div className={styles.grid}>
        <label className={styles.field} htmlFor={`${idPrefix}-brand`}>
          <span>Marca *</span>
          <select id={`${idPrefix}-brand`} value={value.brandCode} onChange={selectBrand} disabled={disabled || loading === "brands"} required>
            <option value="">{loading === "brands" ? "Carregando marcas..." : "Selecione"}</option>
            {brands.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}
          </select>
        </label>
        <label className={`${styles.field} ${styles.model}`} htmlFor={`${idPrefix}-model`}>
          <span>Modelo / versão *</span>
          <select id={`${idPrefix}-model`} value={value.modelCode} onChange={selectModel} disabled={disabled || !value.brandCode || loading === "models"} required>
            <option value="">{loading === "models" ? "Carregando modelos..." : "Selecione"}</option>
            {models.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}
          </select>
        </label>
        <label className={styles.field} htmlFor={`${idPrefix}-year`}>
          <span>Ano / combustível *</span>
          <select id={`${idPrefix}-year`} value={value.yearCode} onChange={selectYear} disabled={disabled || !value.modelCode || loading === "years"} required>
            <option value="">{loading === "years" ? "Carregando anos..." : "Selecione"}</option>
            {years.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.summary} aria-live="polite">
        {loading === "quote" ? <span>Consultando valor FIPE...</span> : value.fipeCode ? <>
          <div><strong>{value.brand} {value.model}</strong><small>{value.modelYear} · {value.fuel} · código {value.fipeCode}</small></div>
          <div><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value.price)}</strong><small>{value.referenceMonth}</small></div>
        </> : <span>Selecione marca, modelo e ano para preencher os dados oficiais e o valor de referência.</span>}
      </div>
    </div>
  );
}
