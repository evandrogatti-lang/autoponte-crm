"use client";

import { useMemo, useState } from "react";
import {
  parseVehicleOptionalItems,
  serializeVehicleOptionalItems,
  VEHICLE_OPTIONAL_GROUPS,
} from "../../../lib/vehicles/vehicle-optionals";
import styles from "./VehicleRegistry.module.css";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

type Props = {
  initialValue: string;
  disabled?: boolean;
  name?: string;
};

export function VehicleOptionalsField({ initialValue, disabled = false, name = "optionalItems" }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(() => parseVehicleOptionalItems(initialValue));
  const [otherEnabled, setOtherEnabled] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  const catalog = useMemo(
    () =>
      VEHICLE_OPTIONAL_GROUPS.flatMap((group) =>
        group.items.map((item) => ({ label: item, group: group.name }))
      ),
    []
  );

  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => normalizeText(item))),
    [selected]
  );

  const filtered = useMemo(() => {
    const normalized = normalizeText(query);
    if (!normalized) return catalog;
    return catalog.filter((item) => normalizeText(item.label).includes(normalized));
  }, [catalog, query]);

  function toggleItem(label: string) {
    const key = normalizeText(label);
    setSelected((current) => {
      const has = current.some((item) => normalizeText(item) === key);
      if (has) return current.filter((item) => normalizeText(item) !== key);
      return [...current, label];
    });
  }

  function removeChip(label: string) {
    const key = normalizeText(label);
    setSelected((current) => current.filter((item) => normalizeText(item) !== key));
  }

  function addOtherItem() {
    const value = otherValue.trim();
    if (!value) return;
    toggleItem(value);
    setOtherValue("");
  }

  return (
    <div className={styles.optionalField}>
      <input type="hidden" name={name} value={serializeVehicleOptionalItems(selected)} />
      <label className={styles.optionalSearch}>
        <span>Pesquisar opcionais</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: câmera, couro, teto"
          disabled={disabled}
        />
      </label>

      <div className={styles.optionalList} role="group" aria-label="Catálogo de opcionais">
        {filtered.map((item) => {
          const key = normalizeText(item.label);
          const checked = selectedKeys.has(key);
          return (
            <label key={`${item.group}-${item.label}`} className={styles.optionalItem}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleItem(item.label)}
                disabled={disabled}
              />
              <span>{item.label}</span>
              <small>{item.group}</small>
            </label>
          );
        })}
      </div>

      <label className={styles.optionalOther}>
        <input
          type="checkbox"
          checked={otherEnabled}
          onChange={(event) => setOtherEnabled(event.target.checked)}
          disabled={disabled}
        />
        <span>Outro</span>
      </label>

      {otherEnabled ? (
        <div className={styles.optionalOtherRow}>
          <input
            value={otherValue}
            onChange={(event) => setOtherValue(event.target.value)}
            placeholder="Descreva outro opcional"
            disabled={disabled}
          />
          <button type="button" onClick={addOtherItem} disabled={disabled || !otherValue.trim()}>
            Adicionar
          </button>
        </div>
      ) : null}

      <div className={styles.optionalChips} aria-live="polite">
        {selected.length === 0 ? <span className={styles.optionalHint}>Nenhum opcional selecionado.</span> : null}
        {selected.map((item) => (
          <button
            key={`chip-${item}`}
            type="button"
            className={styles.optionalChip}
            onClick={() => removeChip(item)}
            disabled={disabled}
          >
            {item} <b aria-hidden>×</b>
          </button>
        ))}
      </div>
    </div>
  );
}

