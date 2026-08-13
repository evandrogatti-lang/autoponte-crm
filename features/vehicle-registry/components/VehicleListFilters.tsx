"use client";

import type { FormEvent } from "react";
import type { VehicleFilterParams } from "../vehicle-list-filters";
import styles from "./VehicleListFilters.module.css";

type Option = { value: string; label: string };

type VehicleListFiltersProps = {
  action: string;
  clearHref: string;
  filters: VehicleFilterParams;
  resultCount: number;
  totalCount: number;
  chips: Array<[string, string]>;
  brands: string[];
  models: string[];
  partners?: Option[];
  origins?: Option[];
  statuses: Option[];
  hidden?: Record<string, string>;
};

export function VehicleListFilters({ action, clearHref, filters, resultCount, totalCount, chips, brands, models, partners, origins, statuses, hidden = {} }: VehicleListFiltersProps) {
  const advancedActive = Boolean(filters.brand || filters.model || filters.partner || filters.yearMin || filters.yearMax || filters.priceMin || filters.priceMax || filters.fipeMin || filters.fipeMax || filters.condition || filters.age);
  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();

    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value) params.set(name, value);
    }

    const query = params.toString();
    window.location.assign(query ? `${action}?${query}` : action);
  };

  return <section className={styles.filters} aria-label="Filtros da lista">
    <div className={styles.summary}>
      <strong>{resultCount} {resultCount === 1 ? "registro encontrado" : "registros encontrados"}</strong>
      <span>de {totalCount}</span>
      <a href={clearHref}>Limpar filtros</a>
    </div>
    <form action={action} className={styles.form} onSubmit={applyFilters}>
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <label className={styles.search}><span>Busca</span><input name="q" defaultValue={filters.q} placeholder="Buscar por veículo, placa ou código" /></label>
      <label><span>Status</span><select name="status" defaultValue={filters.status || "all"}><option value="all">Todos</option>{statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      {origins ? <label><span>Origem</span><select name="origin" defaultValue={filters.origin || "all"}><option value="all">Todas</option>{origins.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
      <button type="submit">Aplicar filtros</button>
      <details className={styles.advanced} open={advancedActive || undefined}>
        <summary>Mais filtros</summary>
        <div className={styles.advancedGrid}>
          <label><span>Marca</span><select name="brand" defaultValue={filters.brand || ""}><option value="">Todas</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>
          <label><span>Modelo</span><select name="model" defaultValue={filters.model || ""}><option value="">Todos</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
          {partners ? <label><span>Parceiro</span><select name="partner" defaultValue={filters.partner || ""}><option value="">Todos</option>{partners.map((partner) => <option key={partner.value} value={partner.value}>{partner.label}</option>)}</select></label> : null}
          <label><span>Ano de</span><input name="yearMin" type="number" min="1900" defaultValue={filters.yearMin} /></label>
          <label><span>Ano até</span><input name="yearMax" type="number" min="1900" defaultValue={filters.yearMax} /></label>
          <label><span>Preço mínimo</span><input name="priceMin" type="number" min="0" defaultValue={filters.priceMin} /></label>
          <label><span>Preço máximo</span><input name="priceMax" type="number" min="0" defaultValue={filters.priceMax} /></label>
          <label><span>FIPE mínima</span><input name="fipeMin" type="number" min="0" defaultValue={filters.fipeMin} /></label>
          <label><span>FIPE máxima</span><input name="fipeMax" type="number" min="0" defaultValue={filters.fipeMax} /></label>
          <label><span>Condição</span><select name="condition" defaultValue={filters.condition || ""}><option value="">Todas</option><option value="excellent">Excelente</option><option value="good">Boa</option><option value="regular">Regular</option><option value="needs_repair">Necessita reparos</option></select></label>
          <label><span>Tempo em estoque</span><select name="age" defaultValue={filters.age || ""}><option value="">Todos</option><option value="0-30">Até 30 dias</option><option value="31-60">31 a 60 dias</option><option value="61-90">61 a 90 dias</option><option value="91+">Mais de 90 dias</option></select></label>
        </div>
      </details>
    </form>
    {chips.length ? <div className={styles.chips} aria-label="Filtros aplicados">{chips.map(([label, value]) => <span key={`${label}-${value}`}>{label}: {value}</span>)}</div> : null}
  </section>;
}