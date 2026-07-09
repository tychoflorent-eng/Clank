-- Dev installs from the pre-vehicle (motorcycle-era) schema never had this
-- migration recorded, so it runs on top of their old tables. Clear those out
-- first; children before `motorcycles` so cascading FKs don't object.
DROP TABLE IF EXISTS `maintenance_records`;
--> statement-breakpoint
DROP TABLE IF EXISTS `diagrams`;
--> statement-breakpoint
DROP TABLE IF EXISTS `ownership_events`;
--> statement-breakpoint
DROP TABLE IF EXISTS `motorcycles`;
--> statement-breakpoint
CREATE TABLE `diagrams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `maintenance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`mileage` integer,
	`type` text NOT NULL,
	`part_number` text,
	`description` text,
	`performed_by` text,
	`cost` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ownership_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`type` text NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`note` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`year` integer NOT NULL,
	`nickname` text,
	`vin` text,
	`plate` text,
	`color` text,
	`mileage` integer,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
