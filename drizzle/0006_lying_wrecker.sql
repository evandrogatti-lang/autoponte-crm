CREATE TABLE `buyer_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`whatsapp` text NOT NULL,
	`email` text NOT NULL,
	`city` text NOT NULL,
	`budget_max` integer NOT NULL,
	`down_payment` integer DEFAULT 0 NOT NULL,
	`max_monthly_payment` integer DEFAULT 0 NOT NULL,
	`vehicle_types` text DEFAULT '[]' NOT NULL,
	`preferred_models` text DEFAULT '' NOT NULL,
	`min_year` integer DEFAULT 0 NOT NULL,
	`max_mileage` integer DEFAULT 999999 NOT NULL,
	`transmission` text DEFAULT 'Indiferente' NOT NULL,
	`fuel` text DEFAULT 'Indiferente' NOT NULL,
	`use_case` text DEFAULT '' NOT NULL,
	`purchase_timeline` text DEFAULT 'Sem urgência' NOT NULL,
	`alerts_consent` integer DEFAULT false NOT NULL,
	`consent_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicle_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_profile_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`vehicle_label` text NOT NULL,
	`vehicle_price` integer DEFAULT 0 NOT NULL,
	`score` integer NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`message_draft` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'review_pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_matches_source_buyer_unique` ON `vehicle_matches` (`source_type`,`source_id`,`buyer_profile_id`);