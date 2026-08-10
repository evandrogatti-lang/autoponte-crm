import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const partners = pgTable("partners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull().default(""),
  document: text("document").notNull().default(""),
  partnerType: text("partner_type").notNull().default("dealer"),
  status: text("status").notNull().default("active"),
  contactName: text("contact_name").notNull().default(""),
  phoneDdi: text("phone_ddi").notNull().default("55"),
  phoneLocal: text("phone_local").notNull().default(""),
  phoneE164: text("phone_e164").notNull().default(""),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  integrationMode: text("integration_mode").notNull().default("manual"),
  externalSystem: text("external_system").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
