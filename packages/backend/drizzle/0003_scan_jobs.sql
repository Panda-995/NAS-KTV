CREATE TABLE `scan_jobs` (
	`id` integer PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`scan_path` text NOT NULL,
	`status` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`new_songs` integer DEFAULT 0,
	`updated_songs` integer DEFAULT 0,
	`skipped_songs` integer DEFAULT 0,
	`error_count` integer DEFAULT 0,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `scan_jobs_scan_id_index` ON `scan_jobs` (`scan_id`);
