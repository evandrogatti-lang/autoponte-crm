import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { vehicles } from "./vehicle-schema.ts";

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_data_provenance_vehicle_field_unique").on(table.vehicleId, table.fieldName),
  index("vehicle_data_provenance_vehicle_idx").on(table.vehicleId),
]);
