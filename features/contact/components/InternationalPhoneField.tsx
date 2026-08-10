"use client";

import { useId } from "react";
import { KNOWN_DDI_CODES } from "../../../lib/contact";
import styles from "./InternationalPhoneField.module.css";

const featured = [
  ["55", "Brasil"], ["49", "Alemanha"], ["351", "Portugal"], ["44", "Reino Unido"], ["1", "EUA/Canadá"],
  ["34", "Espanha"], ["33", "França"], ["39", "Itália"], ["41", "Suíça"], ["43", "Áustria"], ["54", "Argentina"]
] as const;

type Props = {
  ddi: string;
  nationalNumber: string;
  onDdiChange: (value: string) => void;
  onNationalNumberChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
};

export function InternationalPhoneField({ ddi, nationalNumber, onDdiChange, onNationalNumberChange, required, disabled, label = "WhatsApp" }: Props) {
  const listId = useId();
  return (
    <label className={styles.field}>
      <span>{label}{required ? " *" : ""}</span>
      <div className={styles.row}>
        <div className={styles.ddiWrap}>
          <span>+</span>
          <input aria-label="Código DDI" list={listId} value={ddi} onChange={(event) => onDdiChange(event.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="55" required={required} disabled={disabled} />
          <datalist id={listId}>
            {featured.map(([code, country]) => <option key={`${code}-${country}`} value={code}>{country}</option>)}
            {KNOWN_DDI_CODES.map((code) => <option key={code} value={code} />)}
          </datalist>
        </div>
        <input aria-label="Número de telefone" value={nationalNumber} onChange={(event) => onNationalNumberChange(event.target.value.replace(/[^0-9\s()-]/g, ""))} inputMode="tel" autoComplete="tel-national" placeholder="11 99999-9999" required={required} disabled={disabled} />
      </div>
      <small>Formato internacional: +DDI seguido do número local.</small>
    </label>
  );
}
