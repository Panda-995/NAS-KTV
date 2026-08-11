ALTER TABLE `dedup_tasks` ADD `scan_id` text;--> statement-breakpoint
CREATE INDEX `dedup_tasks_scan_id_index` ON `dedup_tasks` (`scan_id`);
