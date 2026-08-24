import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { vehicles } from "./vehicle-schema";

export const vehicleIdentities = pgTable("vehicle_identities", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  version: text("version").notNull().default(""),
  manufactureYear: integer("manufacture_year").notNull().default(0),
  modelYear: integer("model_year").notNull().default(0),
  seats: integer("seats").notNull().default(0),
  drivetrain: text("drivetrain").notNull().default(""),
  gears: integer("gears").notNull().default(0),
  torque: text("torque").notNull().default(""),
  interiorColor: text("interior_color").notNull().default(""),
  vinVerified: boolean("vin_verified").notNull().default(false),
  plateVerified: boolean("plate_verified").notNull().default(false),
  identityConfidence: integer("identity_confidence").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_identities_vehicle_unique").on(table.vehicleId),
]);

export const vehicleOrigins = pgTable("vehicle_origins", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  originType: text("origin_type").notNull(),
  entryReason: text("entry_reason").notNull().default(""),
  entryChannel: text("entry_channel").notNull().default(""),
  opportunityId: text("opportunity_id").notNull().default(""),
  previousOwnerId: text("previous_owner_id").notNull().default(""),
  responsibleUserId: text("responsible_user_id").notNull().default(""),
  storeId: text("store_id").notNull().default(""),
  enteredAt: timestamp("entered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("vehicle_origins_vehicle_idx").on(table.vehicleId)]);

export const vehicleCosts = pgTable("vehicle_costs", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  costType: text("cost_type").notNull(),
  amount: integer("amount").notNull().default(0),
  description: text("description").notNull().default(""),
  supplier: text("supplier").notNull().default(""),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("vehicle_costs_vehicle_type_idx").on(table.vehicleId, table.costType)]);

export const vehiclePrices = pgTable("vehicle_prices", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  priceType: text("price_type").notNull(),
  amount: integer("amount").notNull().default(0),
  referenceSource: text("reference_source").notNull().default(""),
  reason: text("reason").notNull().default(""),
  createdBy: text("created_by").notNull().default(""),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("vehicle_prices_vehicle_type_date_idx").on(table.vehicleId, table.priceType, table.validFrom)]);

export const vehicleFeatures = pgTable("vehicle_features", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  featureCode: text("feature_code").notNull(),
  category: text("category").notNull(),
  value: text("value").notNull().default("true"),
  source: text("source").notNull().default("manual"),
  confidence: integer("confidence").notNull().default(100),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_features_vehicle_code_unique").on(table.vehicleId, table.featureCode),
  index("vehicle_features_search_idx").on(table.featureCode, table.value),
]);

export const vehicleInspections = pgTable("vehicle_inspections", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  inspectionType: text("inspection_type").notNull().default("intake"),
  status: text("status").notNull().default("pending"),
  inspectorUserId: text("inspector_user_id").notNull().default(""),
  overallScore: integer("overall_score").notNull().default(0),
  estimatedRepairCost: integer("estimated_repair_cost").notNull().default(0),
  notes: text("notes").notNull().default(""),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("vehicle_inspections_vehicle_date_idx").on(table.vehicleId, table.createdAt)]);

export const vehicleInspectionItems = pgTable("vehicle_inspection_items", {
  id: text("id").primaryKey(),
  inspectionId: text("inspection_id").notNull().references(() => vehicleInspections.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  itemCode: text("item_code").notNull(),
  status: text("status").notNull().default("not_inspected"),
  severity: text("severity").notNull().default("none"),
  repairCostEstimate: integer("repair_cost_estimate").notNull().default(0),
  notes: text("notes").notNull().default(""),
  mediaId: text("media_id").notNull().default(""),
}, (table) => [index("vehicle_inspection_items_inspection_idx").on(table.inspectionId)]);

export const vehicleDocuments = pgTable("vehicle_documents", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  status: text("status").notNull().default("unknown"),
  value: text("value").notNull().default(""),
  fileUrl: text("file_url").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_documents_vehicle_type_unique").on(table.vehicleId, table.documentType),
]);

export const vehicleMedia = pgTable("vehicle_media", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(),
  category: text("category").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  position: integer("position").notNull().default(0),
  qualityScore: integer("quality_score").notNull().default(0),
  aiVerified: boolean("ai_verified").notNull().default(false),
  isCover: boolean("is_cover").notNull().default(false),
  processingStatus: text("processing_status").notNull().default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("vehicle_media_vehicle_category_idx").on(table.vehicleId, table.category),
]);

export const vehicleAiTags = pgTable("vehicle_ai_tags", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  category: text("category").notNull().default("semantic"),
  confidence: integer("confidence").notNull().default(0),
  source: text("source").notNull().default("rule"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_ai_tags_vehicle_tag_unique").on(table.vehicleId, table.tag),
  index("vehicle_ai_tags_tag_idx").on(table.tag),
]);

export const vehicleAiFeatures = pgTable("vehicle_ai_features", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  featureCode: text("feature_code").notNull(),
  numericValue: integer("numeric_value").notNull().default(0),
  textValue: text("text_value").notNull().default(""),
  confidence: integer("confidence").notNull().default(0),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_ai_features_vehicle_code_unique").on(table.vehicleId, table.featureCode),
  index("vehicle_ai_features_code_numeric_idx").on(table.featureCode, table.numericValue),
]);

export const vehicleScores = pgTable("vehicle_scores", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  scoreType: text("score_type").notNull(),
  score: integer("score").notNull().default(0),
  breakdown: text("breakdown").notNull().default("{}"),
  version: text("version").notNull().default("v1"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("vehicle_scores_vehicle_type_unique").on(table.vehicleId, table.scoreType),
]);

export const vehicleEvents = pgTable("vehicle_events", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  actorUserId: text("actor_user_id").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("vehicle_events_vehicle_created_idx").on(table.vehicleId, table.createdAt)]);
