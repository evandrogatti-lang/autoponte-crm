CREATE TABLE `consignments` (
	`id` text PRIMARY KEY NOT NULL,
	`access_token_hash` text NOT NULL,
	`owner_name` text NOT NULL,
	`whatsapp` text NOT NULL,
	`email` text NOT NULL,
	`city` text NOT NULL,
	`vehicle_name` text NOT NULL,
	`year` text NOT NULL,
	`mileage` integer NOT NULL,
	`plate` text DEFAULT '' NOT NULL,
	`asking_price` integer NOT NULL,
	`minimum_price` integer NOT NULL,
	`status` text DEFAULT 'intake_received' NOT NULL,
	`consent_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
