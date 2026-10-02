import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { consignments, tradeIns } from "./schema.ts";
import { memberships, tenants } from "./tenant-schema.ts";
import { vehicles } from "./vehicle-schema.ts";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Curated global technical identity only. No automatic FIPE/legacy-code promotion.
export const vehicleSpecifications = pgTable("vehicle_specifications", {
  id: text("id").primaryKey(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  modelYear: integer("model_year").notNull(),
  fuel: text("fuel").notNull().default(""),
  transmission: text("transmission").notNull().default(""),
  evidenceSource: text("evidence_source").notNull(),
  evidenceReference: text("evidence_reference").notNull(),
  ...timestamps(),
}, t => [
  check("vehicle_specifications_brand_check", sql`length(btrim(${t.brand})) between 1 and 120`),
  check("vehicle_specifications_model_check", sql`length(btrim(${t.model})) between 1 and 240`),
  check("vehicle_specifications_year_check", sql`${t.modelYear} between 1886 and 2200`),
  check("vehicle_specifications_evidence_check", sql`length(btrim(${t.evidenceSource})) between 1 and 100 and length(btrim(${t.evidenceReference})) between 1 and 1000`),
]).enableRLS();

export const tenantVehicles = pgTable("tenant_vehicles", {
  id: text("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  vehicleSpecificationId: text("vehicle_specification_id").references(() => vehicleSpecifications.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("qualification"),
  createdByMembershipId: uuid("created_by_membership_id").notNull(),
  registrationReason: text("registration_reason").notNull(),
  ...timestamps(),
}, t => [
  unique("tenant_vehicles_tenant_id_id_key").on(t.tenantId, t.id),
  foreignKey({ name: "tenant_vehicles_creator_same_tenant_fkey", columns: [t.tenantId, t.createdByMembershipId], foreignColumns: [memberships.tenantId, memberships.id] }).onDelete("restrict"),
  check("tenant_vehicles_status_check", sql`${t.status} in ('qualification','available','unavailable')`),
  check("tenant_vehicles_reason_check", sql`length(btrim(${t.registrationReason})) between 1 and 1000`),
  index("tenant_vehicles_specification_idx").on(t.vehicleSpecificationId),
  index("tenant_vehicles_creator_idx").on(t.tenantId, t.createdByMembershipId),
]).enableRLS();

// One explicitly confirmed source per link, using typed FKs rather than polymorphic IDs.
export const tenantVehicleSourceLinks = pgTable("tenant_vehicle_source_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  tenantVehicleId: text("tenant_vehicle_id").notNull(),
  inventoryVehicleId: text("inventory_vehicle_id").references(() => vehicles.id, { onDelete: "restrict" }),
  tradeInId: text("trade_in_id"),
  consignmentId: text("consignment_id").references(() => consignments.id, { onDelete: "restrict" }),
  confirmedByMembershipId: uuid("confirmed_by_membership_id").notNull(),
  reason: text("reason").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  foreignKey({ name: "tenant_vehicle_links_vehicle_same_tenant_fkey", columns: [t.tenantId, t.tenantVehicleId], foreignColumns: [tenantVehicles.tenantId, tenantVehicles.id] }).onDelete("restrict"),
  foreignKey({ name: "tenant_vehicle_links_actor_same_tenant_fkey", columns: [t.tenantId, t.confirmedByMembershipId], foreignColumns: [memberships.tenantId, memberships.id] }).onDelete("restrict"),
  foreignKey({ name: "tenant_vehicle_links_lead_same_tenant_fkey", columns: [t.tenantId, t.tradeInId], foreignColumns: [tradeIns.tenantId, tradeIns.id] }).onDelete("restrict"),
  check("tenant_vehicle_links_source_check", sql`num_nonnulls(${t.inventoryVehicleId},${t.tradeInId},${t.consignmentId})=1`),
  check("tenant_vehicle_links_reason_check", sql`length(btrim(${t.reason})) between 1 and 1000`),
  uniqueIndex("tenant_vehicle_links_inventory_key").on(t.inventoryVehicleId),
  uniqueIndex("tenant_vehicle_links_trade_in_key").on(t.tradeInId),
  uniqueIndex("tenant_vehicle_links_consignment_key").on(t.consignmentId),
  index("tenant_vehicle_links_vehicle_idx").on(t.tenantId, t.tenantVehicleId),
  index("tenant_vehicle_links_actor_idx").on(t.tenantId, t.confirmedByMembershipId),
  index("tenant_vehicle_links_lead_idx").on(t.tenantId, t.tradeInId),
]).enableRLS();
