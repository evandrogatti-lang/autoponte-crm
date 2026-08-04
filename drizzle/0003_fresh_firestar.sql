ALTER TABLE `trade_ins` ADD `lead_category` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `trade_ins` ADD `next_follow_up` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trade_ins` ADD `last_contact_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `trade_ins` ADD `notes` text DEFAULT '' NOT NULL;