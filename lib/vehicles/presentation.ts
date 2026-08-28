import type { VehicleLifecycleState } from "./lifecycle.ts";

export const VEHICLE_STATUS_LABELS: Readonly<Record<string, string>> = {
  available: "Disponível",
  evaluation: "Em avaliação",
  reserved: "Reservado",
  sold: "Vendido",
  unavailable: "Indisponível",
};

export const VEHICLE_LIFECYCLE_LABELS: Readonly<Record<VehicleLifecycleState, string>> = {
  PENDING_ENTRY: "Entrada pendente",
  IN_STOCK: "Em estoque",
  PREPARATION: "Preparação",
  READY: "Pronto",
  PUBLISHED: "Publicado",
  AVAILABLE: "Disponível",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  DELIVERED: "Entregue",
};

export function vehicleLifecycleLabel(value: string) {
  return VEHICLE_LIFECYCLE_LABELS[value as VehicleLifecycleState] ?? value;
}
