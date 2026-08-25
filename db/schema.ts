import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const tradeIns = pgTable("trade_ins", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  version: text("version").notNull(),
  year: text("year").notNull(),
  mileage: integer("mileage").notNull(),
  condition: text("condition").notNull(),
  desiredVehicle: text("desired_vehicle").notNull().default(""),
  desiredBrandCode: text("desired_brand_code").notNull().default(""),
  desiredBrand: text("desired_brand").notNull().default(""),
  desiredModelKey: text("desired_model_key").notNull().default(""),
  desiredModel: text("desired_model").notNull().default(""),
  desiredVersionCode: text("desired_version_code").notNull().default(""),
  desiredVersion: text("desired_version").notNull().default(""),
  desiredYearMin: integer("desired_year_min").notNull().default(0),
  desiredYearMax: integer("desired_year_max").notNull().default(0),
  desiredPriceMin: integer("desired_price_min").notNull().default(0),
  desiredPriceMax: integer("desired_price_max").notNull().default(0),
  desiredSearchScope: text("desired_search_scope").notNull().default("legacy"),
  referencePrice: integer("reference_price").notNull(),
  fipeCode: text("fipe_code").notNull().default(""),
  fipeMonth: text("fipe_month").notNull().default(""),
  estimatedMin: integer("estimated_min").notNull(),
  estimatedMax: integer("estimated_max").notNull(),
  photoKeys: text("photo_keys").notNull(),
  status: text("status").notNull().default("pre_evaluated"),
  leadCategory: text("lead_category").notNull().default("new"),
  nextFollowUp: text("next_follow_up").notNull().default(""),
  lastContactAt: text("last_contact_at").notNull().default(""),
  notes: text("notes").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  probability: integer("probability").notNull().default(0),
  confidenceScore: integer("confidence_score").notNull().default(0),
  temperatureScore: integer("temperature_score").notNull().default(0),
  momentum: text("momentum").notNull().default("stable"),
  priorityScore: integer("priority_score").notNull().default(0),
  recommendationAction: text("recommendation_action").notNull().default(""),
  recommendationChannel: text("recommendation_channel").notNull().default(""),
  recommendationUrgency: text("recommendation_urgency").notNull().default(""),
  recommendationRationale: text("recommendation_rationale").notNull().default(""),
  consentAt: text("consent_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const opportunityEvents = pgTable("opportunity_events", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().references(() => tradeIns.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"),
  actorName: text("actor_name").notNull().default("Sistema AutoPonte"),
  actorEmail: text("actor_email").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("opportunity_events_opportunity_created_idx").on(table.opportunityId, table.createdAt),
]);

export const consignments = pgTable("consignments", {
  id: text("id").primaryKey(),
  accessTokenHash: text("access_token_hash").notNull(),
  ownerName: text("owner_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  year: text("year").notNull(),
  mileage: integer("mileage").notNull(),
  plate: text("plate").notNull().default(""),
  askingPrice: integer("asking_price").notNull(),
  minimumPrice: integer("minimum_price").notNull(),
  photoKeys: text("photo_keys").notNull().default("[]"),
  status: text("status").notNull().default("intake_received"),
  consentAt: text("consent_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const buyerProfiles = pgTable("buyer_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  budgetMax: integer("budget_max").notNull(),
  downPayment: integer("down_payment").notNull().default(0),
  maxMonthlyPayment: integer("max_monthly_payment").notNull().default(0),
  vehicleTypes: text("vehicle_types").notNull().default("[]"),
  preferredModels: text("preferred_models").notNull().default(""),
  minYear: integer("min_year").notNull().default(0),
  maxMileage: integer("max_mileage").notNull().default(999999),
  transmission: text("transmission").notNull().default("Indiferente"),
  fuel: text("fuel").notNull().default("Indiferente"),
  useCase: text("use_case").notNull().default(""),
  purchaseTimeline: text("purchase_timeline").notNull().default("Sem urgência"),
  alertsConsent: boolean("alerts_consent").notNull().default(false),
  consentAt: text("consent_at").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicleMatches = pgTable("vehicle_matches", {
  id: text("id").primaryKey(),
  buyerProfileId: text("buyer_profile_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  vehicleLabel: text("vehicle_label").notNull(),
  vehiclePrice: integer("vehicle_price").notNull().default(0),
  score: integer("score").notNull(),
  reasons: text("reasons").notNull().default("[]"),
  messageDraft: text("message_draft").notNull().default(""),
  status: text("status").notNull().default("review_pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: text("reviewed_at").notNull().default(""),
}, (table) => [
  uniqueIndex("vehicle_matches_source_buyer_unique").on(table.sourceType, table.sourceId, table.buyerProfileId),
]);

/** Passwords stay exclusively with the authentication provider. */
export const crmRoles = pgTable("crm_roles", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("crm_roles_code_unique").on(table.code)]);

export const crmUsers = pgTable("crm_users", {
  id: text("id").primaryKey(),
  authUserId: text("auth_user_id").notNull().default(""),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  roleId: text("role_id").notNull().references(() => crmRoles.id),
  storeId: text("store_id").notNull().default(""),
  status: text("status").notNull().default("invited"),
  lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("crm_users_email_unique").on(table.email),
  index("crm_users_status_idx").on(table.status),
  index("crm_users_role_idx").on(table.roleId),
]);

export const crmRolePermissions = pgTable("crm_role_permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id").notNull().references(() => crmRoles.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
}, (table) => [uniqueIndex("crm_role_permission_unique").on(table.roleId, table.permission)]);

export const crmAuditLogs = pgTable("crm_audit_logs", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull().default(""),
  actorEmail: text("actor_email").notNull().default(""),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull().default(""),
  detail: text("detail").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("crm_audit_logs_created_idx").on(table.createdAt)]);

export const sellerProfiles = pgTable("seller_profiles", {
  id: text("id").primaryKey(),
  crmUserId: text("crm_user_id").notNull().references(() => crmUsers.id, { onDelete: "cascade" }),
  partnerId: text("partner_id").notNull().default(""),
  status: text("status").notNull().default("active"),
  availabilityStatus: text("availability_status").notNull().default("available"),
  capacity: integer("capacity").notNull().default(1),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("seller_profiles_crm_user_unique").on(table.crmUserId),
  index("seller_profiles_partner_status_idx").on(table.partnerId, table.status),
]);

export const sellerSpecialties = pgTable("seller_specialties", {
  id: text("id").primaryKey(),
  sellerProfileId: text("seller_profile_id").notNull().references(() => sellerProfiles.id, { onDelete: "cascade" }),
  specialty: text("specialty").notNull(),
  active: boolean("active").notNull().default(true),
}, (table) => [uniqueIndex("seller_specialties_profile_value_unique").on(table.sellerProfileId, table.specialty)]);

export const sellerAvailability = pgTable("seller_availability", {
  id: text("id").primaryKey(),
  sellerProfileId: text("seller_profile_id").notNull().references(() => sellerProfiles.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("available"),
  source: text("source").notNull().default("autoponte"),
  note: text("note").notNull().default(""),
}, (table) => [index("seller_availability_profile_time_idx").on(table.sellerProfileId, table.startsAt)]);

export const sellerAppointments = pgTable("seller_appointments", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().references(() => tradeIns.id, { onDelete: "cascade" }),
  sellerProfileId: text("seller_profile_id").notNull().references(() => sellerProfiles.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
  source: text("source").notNull().default("autoponte"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("seller_appointments_seller_time_idx").on(table.sellerProfileId, table.startsAt)]);

export const sellerAssignments = pgTable("seller_assignments", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().references(() => tradeIns.id, { onDelete: "cascade" }),
  sellerProfileId: text("seller_profile_id").notNull().references(() => sellerProfiles.id),
  assignedByUserId: text("assigned_by_user_id").notNull().default(""),
  status: text("status").notNull().default("assigned"),
  outcome: text("outcome").notNull().default(""),
  reason: text("reason").notNull().default(""),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  firstContactAt: timestamp("first_contact_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("seller_assignments_opportunity_status_idx").on(table.opportunityId, table.status),
  index("seller_assignments_seller_status_idx").on(table.sellerProfileId, table.status),
]);

export { vehicleDataProvenance, vehicleScores } from "./vehicle-intelligence-schema.ts";
