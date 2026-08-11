CREATE TABLE `dedup_tasks` (
	`id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`checked` integer DEFAULT 0,
	`removed` integer DEFAULT 0,
	`duplicates` text,
	`error` text
);--> statement-breakpoint
CREATE TABLE `dedup_exceptions` (
	`id` integer PRIMARY KEY NOT NULL,
	`file_path` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `dedup_exceptions_file_path_unique` ON `dedup_exceptions` (`file_path`);
