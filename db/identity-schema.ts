import { sql } from "drizzle-orm";
import { bigint, check, foreignKey, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { customers } from "./customer-schema.ts";
import { buyerProfiles, tradeIns } from "./schema.ts";
import { memberships, tenants } from "./tenant-schema.ts";

export const leadCustomerLinks = pgTable("lead_customer_links", {
  leadId: text("lead_id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  customerId: text("customer_id").notNull(),
}, table => [
  foreignKey({ columns: [table.tenantId, table.leadId], foreignColumns: [tradeIns.tenantId, tradeIns.id] }).onDelete("restrict"),
  foreignKey({ columns: [table.tenantId, table.customerId], foreignColumns: [customers.tenantId, customers.id] }).onDelete("restrict"),
  index("lead_customer_links_customer_idx").on(table.tenantId, table.customerId),
]).enableRLS();

export const identityLinkEvents = pgTable("identity_link_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  buyerProfileId: text("buyer_profile_id"),
  leadId: text("lead_id"),
  previousCustomerId: text("previous_customer_id"),
  customerId: text("customer_id"),
  actorMembershipId: uuid("actor_membership_id").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  reason: text("reason").notNull(),
  source: text("source").notNull(),
  transactionId: bigint("transaction_id", { mode: "bigint" }).notNull().default(sql`txid_current()`),
}, table => [
  check("identity_link_events_check", sql`num_nonnulls(${table.buyerProfileId},${table.leadId})=1`),
  check("identity_link_events_check1", sql`${table.previousCustomerId} is distinct from ${table.customerId}`),
  check("identity_link_events_reason_check", sql`length(btrim(${table.reason})) between 1 and 1000`),
  check("identity_link_events_source_check", sql`length(btrim(${table.source})) between 1 and 100`),
  foreignKey({ columns: [table.tenantId, table.buyerProfileId], foreignColumns: [buyerProfiles.tenantId, buyerProfiles.id] }).onDelete("restrict"),
  foreignKey({ columns: [table.tenantId, table.leadId], foreignColumns: [tradeIns.tenantId, tradeIns.id] }).onDelete("restrict"),
  foreignKey({ columns: [table.tenantId, table.previousCustomerId], foreignColumns: [customers.tenantId, customers.id] }).onDelete("restrict"),
  foreignKey({ columns: [table.tenantId, table.customerId], foreignColumns: [customers.tenantId, customers.id] }).onDelete("restrict"),
  foreignKey({ columns: [table.tenantId, table.actorMembershipId], foreignColumns: [memberships.tenantId, memberships.id] }).onDelete("restrict"),
  index("identity_link_events_profile_idx").on(table.tenantId, table.buyerProfileId, table.confirmedAt),
  index("identity_link_events_lead_idx").on(table.tenantId, table.leadId, table.confirmedAt),
  index("identity_link_events_actor_idx").on(table.tenantId, table.actorMembershipId),
  index("identity_link_events_previous_customer_idx").on(table.tenantId, table.previousCustomerId),
  index("identity_link_events_customer_idx").on(table.tenantId, table.customerId),
]).enableRLS();
