CREATE TABLE `diagrams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`uploaded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `maintenance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`date` text NOT NULL,
	`mileage` integer,
	`type` text NOT NULL,
	`description` text,
	`performed_by` text,
	`cost` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `motorcycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `ownership_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`motorcycle_id` integer NOT NULL,
	`type` text NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`note` text,
	FOREIGN KEY (`motorcycle_id`) REFERENCES `motorcycles`(`id`) ON UPDATE no action ON DELETE cascade
);
