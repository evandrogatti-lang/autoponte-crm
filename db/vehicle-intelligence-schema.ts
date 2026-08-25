import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { vehicles } from "./vehicle-schema.ts";

export const vehicleEvidenceObservations = pgTable("vehicle_evidence_observations", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "restrict" }),
  evidenceType: text("evidence_type").notNull(),
  value: jsonb("value_jsonb").notNull(),
  valueHash: text("value_hash").notNull(),
  source: text("source").notNull(),
  confidence: integer("confidence").notNull(),
  verified: boolean("verified").notNull().default(false),
  externalRef: text("external_ref").notNull().default(""),
  metadata: jsonb("metadata").notNull().default({}),
  submittedBy: text("submitted_by").notNull(),
  verifiedBy: text("verified_by").notNull().default(""),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  supersedesObservationId: text("supersedes_observation_id").references((): AnyPgColumn => vehicleEvidenceObservations.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_evidence_observations_external_identity_unique")
    .on(table.vehicleId, table.evidenceType, table.source, table.externalRef)
    .where(sql`${table.externalRef} <> ''`),
  index("vehicle_evidence_observations_vehicle_type_captured_idx").on(table.vehicleId, table.evidenceType, table.capturedAt),
  index("vehicle_evidence_observations_vehicle_idx").on(table.vehicleId),
  index("vehicle_evidence_observations_supersedes_idx").on(table.supersedesObservationId),
]);

export const vehicleScores = pgTable("vehicle_scores", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  scoreType: text("score_type").notNull(),
  score: integer("score").notNull(),
  breakdown: text("breakdown").notNull().default("{}"),
  confidence: integer("confidence").notNull().default(0),
  status: text("status").notNull().default("INSUFFICIENT_DATA"),
  version: text("version").notNull().default("v1"),
  calculatorVersion: text("calculator_version").notNull().default("legacy"),
  components: jsonb("components").notNull().default([]),
  reasonCodes: jsonb("reason_codes").notNull().default([]),
  inputSnapshot: jsonb("input_snapshot").notNull().default({}),
  inputSnapshotHash: text("input_snapshot_hash").notNull().default(""),
  evidenceSummary: jsonb("evidence_summary").notNull().default({}),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_scores_vehicle_type_version_calculator_hash_unique").on(table.vehicleId, table.scoreType, table.version, table.calculatorVersion, table.inputSnapshotHash),
  index("vehicle_scores_vehicle_type_version_calculated_idx").on(table.vehicleId, table.scoreType, table.version, table.calculatedAt),
  index("vehicle_scores_vehicle_calculated_idx").on(table.vehicleId, table.calculatedAt),
]);

export const vehicleDataProvenance = pgTable("vehicle_data_provenance", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  valueHash: text("value_hash").notNull().default(""),
  source: text("source").notNull(),
  confidence: integer("confidence").notNull(),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  observationId: text("observation_id").references(() => vehicleEvidenceObservations.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_data_provenance_vehicle_field_unique").on(table.vehicleId, table.fieldName),
  index("vehicle_data_provenance_vehicle_idx").on(table.vehicleId),
  index("vehicle_data_provenance_observation_idx").on(table.observationId),
]);
