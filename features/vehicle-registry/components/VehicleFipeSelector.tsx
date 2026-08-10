"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import styles from "./VehicleRegistry.module.css";

type Option = { codigo: string; nome: string };
type Quote = { price: number; brand: string; model: string; modelYear: number; fuel: string; fipeCode: string; referenceMonth: string };

export type VehicleFipeValue = {
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

export const emptyVehicleFipeValue: VehicleFipeValue = { brandCode: "", modelCode: "", yearCode: "", brand: "", model: "", modelYear: 0, fuel: "", fipeCode: "", referenceMonth: "", price: 0 };

async function load<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.json() as T | { error?: string };
  if (!response.ok) throw new Error(typeof body === "object" && body && "error" in body ? body.error || "Consulta FIPE indisponível." : "Consulta FIPE indisponível.");
  return body as T;
}

export function VehicleFipeSelector({ value, onChange, disabled = false }: { value: VehicleFipeValue; onChange: (value: VehicleFipeValue) => void; disabled?: boolean }) {
  const [brands, setBrands] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [years, setYears] = useState<Option[]>([]);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading("brands");
    load<Option[]>("/api/fipe?resource=brands")
      .then((items) => setBrands(items.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar as marcas."))
      .finally(() => setLoading(""));
  }, []);

  async function onBrand(event: ChangeEvent<HTMLSelectElement>) {
    const brandCode = event.target.value;
    const brand = brands.find((item) => item.codigo === brandCode)?.nome ?? "";
    onChange({ ...emptyVehicleFipeValue, brandCode, brand });
    setModels([]); setYears([]); setError("");
    if (!brandCode) return;
    setLoading("models");
    try { setModels((await load<Option[]>(`/api/fipe?resource=models&brand=${encodeURIComponent(brandCode)}`)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os modelos."); }
    finally { setLoading(""); }
  }

  async function onModel(event: ChangeEvent<HTMLSelectElement>) {
    const modelCode = event.target.value;
    const model = models.find((item) => item.codigo === modelCode)?.nome ?? "";
    onChange({ ...value, modelCode, model, yearCode: "", modelYear: 0, fuel: "", fipeCode: "", referenceMonth: "", price: 0 });
    setYears([]); setError("");
    if (!modelCode || !value.brandCode) return;
    setLoading("years");
    try { setYears(await load<Option[]>(`/api/fipe?resource=years&brand=${encodeURIComponent(value.brandCode)}&model=${encodeURIComponent(modelCode)}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os anos."); }
    finally { setLoading(""); }
  }

  async function onYear(event: ChangeEvent<HTMLSelectElement>) {
    const yearCode = event.target.value;
    onChange({ ...value, yearCode, modelYear: 0, fuel: "", fipeCode: "", referenceMonth: "", price: 0 });
    if (!yearCode || !value.brandCode || !value.modelCode) return;
    setLoading("quote"); setError("");
    try {
      const quote = await load<Quote>(`/api/fipe?resource=quote&brand=${encodeURIComponent(value.brandCode)}&model=${encodeURIComponent(value.modelCode)}&year=${encodeURIComponent(yearCode)}`);
      onChange({ ...value, yearCode, brand: quote.brand, model: quote.model, modelYear: quote.modelYear, fuel: quote.fuel, fipeCode: quote.fipeCode, referenceMonth: quote.referenceMonth, price: quote.price });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível consultar o valor FIPE."); }
    finally { setLoading(""); }
  }

  return <div className={styles.fipeBlock}>
    {error && <div className={styles.error}>{error}</div>}
    <div className={styles.grid3}>
      <label><span>Marca *</span><select value={value.brandCode} onChange={onBrand} disabled={disabled || loading === "brands"} required><option value="">{loading === "brands" ? "Carregando..." : "Selecione"}</option>{brands.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}</select></label>
      <label><span>Modelo / versão *</span><select value={value.modelCode} onChange={onModel} disabled={disabled || !value.brandCode || loading === "models"} required><option value="">{loading === "models" ? "Carregando..." : "Selecione"}</option>{models.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}</select></label>
      <label><span>Ano / combustível *</span><select value={value.yearCode} onChange={onYear} disabled={disabled || !value.modelCode || loading === "years"} required><option value="">{loading === "years" ? "Carregando..." : "Selecione"}</option>{years.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}</select></label>
    </div>
    <div className={styles.fipeSummary}>{loading === "quote" ? "Consultando FIPE..." : value.fipeCode ? <><strong>{value.brand} {value.model}</strong><span>{value.modelYear} · {value.fuel} · FIPE {value.fipeCode} · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value.price)} · {value.referenceMonth}</span></> : "Selecione marca, modelo e ano para preencher a identificação oficial."}</div>
  </div>;
}
