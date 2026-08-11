CREATE TABLE `scan_results` (
	`id` integer PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`file_path` text NOT NULL,
	`status` text NOT NULL,
	`song_id` integer,
	`reason` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `scan_results_scan_id_idx` ON `scan_results` (`scan_id`);
