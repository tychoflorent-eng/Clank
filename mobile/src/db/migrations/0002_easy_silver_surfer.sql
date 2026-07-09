CREATE TABLE `media_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`record_id` integer NOT NULL,
	`kind` text NOT NULL,
	`file_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `maintenance_records`(`id`) ON UPDATE no action ON DELETE cascade
);
