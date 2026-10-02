import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { customers } from "./customer-schema.ts";
import { identityLinkEvents } from "./identity-schema.ts";
import { buyerProfiles, tradeIns, vehicleMatches } from "./schema.ts";
import { memberships, tenants } from "./tenant-schema.ts";
import { tenantVehicles } from "./tenant-vehicle-schema.ts";

export const negotiations = pgTable("negotiations", {
  id: text("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  customerId: text("customer_id").notNull(),
  leadId: text("lead_id"),
  buyerProfileId: text("buyer_profile_id"),
  matchId: text("match_id").references(() => vehicleMatches.id, { onDelete: "restrict" }),
  tenantVehicleId: text("tenant_vehicle_id"),
  buyerProfileIdentityEventId: uuid("buyer_profile_identity_event_id").references(() => identityLinkEvents.id, { onDelete: "restrict" }),
  leadIdentityEventId: uuid("lead_identity_event_id").references(() => identityLinkEvents.id, { onDelete: "restrict" }),
  responsibleMembershipId: uuid("responsible_membership_id").notNull(),
  createdByMembershipId: uuid("created_by_membership_id").notNull(),
  origin: text("origin").notNull(),
  stage: text("stage").notNull().default("contact"),
  lifecycle: text("lifecycle").notNull().default("active"),
  closureReason: text("closure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  formalizedAt: timestamp("formalized_at", { withTimezone: true }),
}, t => [
  foreignKey({ name: "negotiations_vehicle_same_tenant_fkey", columns: [t.tenantId, t.tenantVehicleId], foreignColumns: [tenantVehicles.tenantId, tenantVehicles.id] }).onDelete("restrict"),
  check("negotiations_match_vehicle_check", sql`${t.matchId} is null or ${t.tenantVehicleId} is not null`),
  index("negotiations_vehicle_idx").on(t.tenantId, t.tenantVehicleId),
  foreignKey({ name: "negotiations_customer_same_tenant_fkey", columns: [t.tenantId, t.customerId], foreignColumns: [customers.tenantId, customers.id] }).onDelete("restrict"),
  foreignKey({ name: "negotiations_lead_same_tenant_fkey", columns: [t.tenantId, t.leadId], foreignColumns: [tradeIns.tenantId, tradeIns.id] }).onDelete("restrict"),
  foreignKey({ name: "negotiations_profile_same_tenant_fkey", columns: [t.tenantId, t.buyerProfileId], foreignColumns: [buyerProfiles.tenantId, buyerProfiles.id] }).onDelete("restrict"),
  foreignKey({ name: "negotiations_responsible_same_tenant_fkey", columns: [t.tenantId, t.responsibleMembershipId], foreignColumns: [memberships.tenantId, memberships.id] }).onDelete("restrict"),
  foreignKey({ name: "negotiations_creator_same_tenant_fkey", columns: [t.tenantId, t.createdByMembershipId], foreignColumns: [memberships.tenantId, memberships.id] }).onDelete("restrict"),
  check("negotiations_origin_check", sql`${t.origin} in ('match_manual','match_automated','manual','whatsapp','phone','walk_in','marketplace','reactivation')`),
  check("negotiations_stage_check", sql`${t.stage} in ('contact','qualification','negotiation','ready_for_formalization')`),
  check("negotiations_lifecycle_check", sql`${t.lifecycle} in ('active','formalized','closed')`),
  check("negotiations_closure_reason_check", sql`${t.closureReason} in ('lost','cancelled','expired','no_fit','inactive_customer')`),
  check("negotiations_match_origin_check", sql`(${t.origin} in ('match_manual','match_automated')) = (${t.matchId} is not null) and (${t.matchId} is null or ${t.buyerProfileId} is not null)`),
  check("negotiations_lifecycle_metadata_check", sql`(${t.lifecycle} = 'active' and ${t.closedAt} is null and ${t.closureReason} is null and ${t.formalizedAt} is null) or (${t.lifecycle} = 'formalized' and ${t.formalizedAt} is not null and ${t.closedAt} is null and ${t.closureReason} is null) or (${t.lifecycle} = 'closed' and ${t.closedAt} is not null and ((${t.formalizedAt} is null and ${t.closureReason} is not null) or (${t.formalizedAt} is not null and ${t.closureReason} is null)))`),
  check("negotiations_timestamp_check", sql`${t.updatedAt} >= ${t.createdAt} and (${t.closedAt} is null or ${t.closedAt} >= ${t.createdAt}) and (${t.formalizedAt} is null or ${t.formalizedAt} >= ${t.createdAt})`),
  check("negotiations_identity_provenance_check", sql`(${t.buyerProfileId} is null) = (${t.buyerProfileIdentityEventId} is null) and (${t.leadId} is null) = (${t.leadIdentityEventId} is null)`),
  uniqueIndex("negotiations_active_match_key").on(t.tenantId, t.matchId).where(sql`${t.matchId} is not null and ${t.lifecycle} in ('active','formalized')`),
  index("negotiations_customer_idx").on(t.tenantId, t.customerId),
  index("negotiations_lead_idx").on(t.tenantId, t.leadId),
  index("negotiations_profile_idx").on(t.tenantId, t.buyerProfileId),
  index("negotiations_match_idx").on(t.matchId),
  index("negotiations_responsible_idx").on(t.tenantId, t.responsibleMembershipId),
  index("negotiations_creator_idx").on(t.tenantId, t.createdByMembershipId),
  index("negotiations_profile_event_idx").on(t.buyerProfileIdentityEventId),
  index("negotiations_lead_event_idx").on(t.leadIdentityEventId),
]).enableRLS();
