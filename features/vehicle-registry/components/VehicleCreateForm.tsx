"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  emptyVehicleFipeValue,
  type VehicleFipeValue,
  VehicleFipeSelector,
} from "./VehicleFipeSelector";
import styles from "./VehicleRegistry.module.css";

type PartnerOption = { id: string; name: string };

export type VehicleFormInitialData = {
  inventoryScope: "autoponte" | "partner";
  partnerId: string;
  sourceType: string;
  status: string;
  plate: string;
  chassis: string;
  stockCode: string;
  mileage: number;
  color: string;
  transmission: string;
  bodyType: string;
  doors: number;
  engine: string;
  power: string;
  renavam: string;
  registrationState: string;
  city: string;
  vehicleCondition: string;
  documentStatus: string;
  inspectionStatus: string;
  acquisitionDate: string;
  listingDate: string;
  optionalItems: string;
  ownerName: string;
  askingPrice: number;
  acquisitionCost: number;
  notes: string;
  fipe: VehicleFipeValue;
};

const defaultInitialData: VehicleFormInitialData = {
  inventoryScope: "autoponte",
  partnerId: "",
  sourceType: "autoponte_inventory",
  status: "available",
  plate: "",
  chassis: "",
  stockCode: "",
  mileage: 0,
  color: "",
  transmission: "",
  bodyType: "",
  doors: 0,
  engine: "",
  power: "",
  renavam: "",
  registrationState: "",
  city: "",
  vehicleCondition: "good",
  documentStatus: "regular",
  inspectionStatus: "pending",
  acquisitionDate: "",
  listingDate: "",
  optionalItems: "",
  ownerName: "",
  askingPrice: 0,
  acquisitionCost: 0,
  notes: "",
  fipe: emptyVehicleFipeValue,
};

export function VehicleCreateForm({
  partners,
  mode = "create",
  vehicleId,
  cancelHref,
  initialData = defaultInitialData,
}: {
  partners: PartnerOption[];
  mode?: "create" | "edit";
  vehicleId?: string;
  cancelHref?: string;
  initialData?: VehicleFormInitialData;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const initialPartner = params.get("partner") || initialData.partnerId || "";
  const returnTo = params.get("returnTo") || "";
  const [fipe, setFipe] = useState(initialData.fipe);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scope, setScope] = useState<"autoponte" | "partner">(
    initialData.inventoryScope === "partner" || initialPartner ? "partner" : "autoponte"
  );
  const [partnerId, setPartnerId] = useState(initialPartner);

  const sourceDefault = useMemo(
    () => (scope === "partner" ? "partner_inventory" : "autoponte_inventory"),
    [scope]
  );
  const computedCancelHref =
    cancelHref || (mode === "edit" && vehicleId ? `/veiculos/${vehicleId}` : "/veiculos");

  async function submit(formData: FormData) {
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = Object.fromEntries(formData.entries());
    Object.assign(payload, {
      brandCode: fipe.brandCode,
      modelCode: fipe.modelCode,
      yearCode: fipe.yearCode,
      inventoryScope: scope,
      partnerId: scope === "partner" ? partnerId : "",
    });

    const isEdit = mode === "edit" && vehicleId;
    const endpoint = isEdit
      ? `/api/vehicles?id=${encodeURIComponent(vehicleId)}`
      : "/api/vehicles";
    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: string; href?: string };
      if (!response.ok) {
        throw new Error(
          body.error || (isEdit ? "Não foi possível atualizar o veículo." : "Não foi possível cadastrar o veículo.")
        );
      }

      if (isEdit && vehicleId) {
        setSuccess("Veículo atualizado com sucesso.");
        const href = body.href || `/veiculos/${vehicleId}`;
        const nextParams = new URLSearchParams();
        if (returnTo) nextParams.set("returnTo", returnTo);
        nextParams.set("updated", "1");
        const separator = href.includes("?") ? "&" : "?";
        router.push(`${href}${separator}${nextParams.toString()}`);
      } else {
        router.push(body.href || "/veiculos");
      }
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : isEdit
            ? "Não foi possível atualizar o veículo."
            : "Não foi possível cadastrar o veículo."
      );
      setSaving(false);
      return;
    }
  }

  return (
    <form className={styles.form} action={submit}>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.warning} role="status">
          {success}
        </div>
      )}

      <section className={styles.card}>
        <header>
          <div>
            <span>CLASSIFICAÇÃO DO ESTOQUE</span>
            <h2>AutoPonte ou parceiro</h2>
          </div>
        </header>
        <div className={styles.grid4}>
          <label>
            <span>Estoque *</span>
            <select
              name="inventoryScope"
              value={scope}
              onChange={(e) => setScope(e.target.value as "autoponte" | "partner")}
            >
              <option value="autoponte">Estoque AutoPonte</option>
              <option value="partner">Estoque de parceiro</option>
            </select>
          </label>

          {scope === "partner" && (
            <label>
              <span>Parceiro *</span>
              <select
                name="partnerId"
                value={partnerId}
                required
                onChange={(e) => setPartnerId(e.target.value)}
              >
                <option value="">Selecionar parceiro</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span>Origem *</span>
            <select
              key={sourceDefault}
              name="sourceType"
              defaultValue={initialData.sourceType || sourceDefault}
            >
              <option value="autoponte_inventory">Estoque AutoPonte</option>
              <option value="dealer_inventory">Estoque de loja própria</option>
              <option value="partner_inventory">Estoque parceiro</option>
              <option value="consignment">Consignação</option>
              <option value="trade_in">Veículo de troca</option>
              <option value="new_vehicle">Veículo 0 km</option>
            </select>
          </label>

          <label>
            <span>Status *</span>
            <select name="status" defaultValue={initialData.status}>
              <option value="available">Disponível</option>
              <option value="evaluation">Em avaliação</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
              <option value="unavailable">Indisponível</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <header>
          <div>
            <span>IDENTIFICAÇÃO</span>
            <h2>Dados oficiais do veículo</h2>
          </div>
        </header>
        <VehicleFipeSelector value={fipe} onChange={setFipe} disabled={saving} />
        <div className={styles.grid4}>
          <label>
            <span>Placa</span>
            <input name="plate" placeholder="ABC1D23" maxLength={8} defaultValue={initialData.plate} />
          </label>
          <label>
            <span>Chassi</span>
            <input name="chassis" maxLength={24} defaultValue={initialData.chassis} />
          </label>
          <label>
            <span>Código interno</span>
            <input name="stockCode" placeholder="AP-00125" defaultValue={initialData.stockCode} />
          </label>
          <label>
            <span>Quilometragem</span>
            <input name="mileage" type="number" min="0" defaultValue={initialData.mileage} />
          </label>
          <label>
            <span>Cor</span>
            <input name="color" defaultValue={initialData.color} />
          </label>
          <label>
            <span>Câmbio</span>
            <select name="transmission" defaultValue={initialData.transmission}>
              <option value="">Selecionar</option>
              <option>Automático</option>
              <option>Manual</option>
              <option>CVT</option>
              <option>Automatizado</option>
            </select>
          </label>
          <label>
            <span>Carroceria</span>
            <input name="bodyType" defaultValue={initialData.bodyType} />
          </label>
          <label>
            <span>Portas</span>
            <input name="doors" type="number" min="0" max="8" defaultValue={initialData.doors || ""} />
          </label>
          <label>
            <span>Motor</span>
            <input name="engine" defaultValue={initialData.engine} />
          </label>
          <label>
            <span>Potência</span>
            <input name="power" defaultValue={initialData.power} />
          </label>
          <label>
            <span>RENAVAM</span>
            <input name="renavam" inputMode="numeric" defaultValue={initialData.renavam} />
          </label>
          <label>
            <span>UF</span>
            <input name="registrationState" maxLength={2} defaultValue={initialData.registrationState} />
          </label>
          <label>
            <span>Cidade</span>
            <input name="city" defaultValue={initialData.city} />
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <header>
          <div>
            <span>CONDIÇÃO E DOCUMENTAÇÃO</span>
            <h2>Estado operacional</h2>
          </div>
        </header>
        <div className={styles.grid4}>
          <label>
            <span>Condição</span>
            <select name="vehicleCondition" defaultValue={initialData.vehicleCondition}>
              <option value="excellent">Excelente</option>
              <option value="good">Boa</option>
              <option value="regular">Regular</option>
              <option value="needs_repair">Necessita reparos</option>
            </select>
          </label>
          <label>
            <span>Documentação</span>
            <select name="documentStatus" defaultValue={initialData.documentStatus}>
              <option value="regular">Regular</option>
              <option value="pending">Com pendência</option>
              <option value="financed">Financiado</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </label>
          <label>
            <span>Vistoria</span>
            <select name="inspectionStatus" defaultValue={initialData.inspectionStatus}>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovada</option>
              <option value="approved_notes">Aprovada com apontamentos</option>
              <option value="rejected">Reprovada</option>
            </select>
          </label>
          <label>
            <span>Data de aquisição</span>
            <input name="acquisitionDate" type="date" defaultValue={initialData.acquisitionDate} />
          </label>
          <label>
            <span>Data de anúncio</span>
            <input name="listingDate" type="date" defaultValue={initialData.listingDate} />
          </label>
        </div>
        <label className={styles.full}>
          <span>Opcionais e equipamentos</span>
          <textarea name="optionalItems" rows={2} defaultValue={initialData.optionalItems} />
        </label>
      </section>

      <section className={styles.card}>
        <header>
          <div>
            <span>COMERCIAL</span>
            <h2>Valores e responsável</h2>
          </div>
        </header>
        <div className={styles.grid4}>
          <label>
            <span>Proprietário / loja</span>
            <input name="ownerName" defaultValue={initialData.ownerName} />
          </label>
          <label>
            <span>Preço pedido</span>
            <input name="askingPrice" type="number" min="0" defaultValue={initialData.askingPrice || ""} />
          </label>
          <label>
            <span>Custo de aquisição</span>
            <input
              name="acquisitionCost"
              type="number"
              min="0"
              defaultValue={initialData.acquisitionCost || ""}
            />
          </label>
        </div>
        <label className={styles.full}>
          <span>Observações</span>
          <textarea name="notes" rows={3} defaultValue={initialData.notes} />
        </label>
      </section>

      <div className={styles.actions}>
        <Link href={computedCancelHref}>
          {mode === "edit" ? "Cancelar" : "Voltar"}
        </Link>
        <button type="submit" disabled={saving || !fipe.fipeCode}>
          {saving
            ? mode === "edit"
              ? "Salvando..."
              : "Cadastrando..."
            : mode === "edit"
              ? "Salvar alterações"
              : "Cadastrar veículo"}
        </button>
      </div>
    </form>
  );
}
