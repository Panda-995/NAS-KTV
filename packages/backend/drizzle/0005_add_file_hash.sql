ALTER TABLE `songs` ADD `file_hash` text;--> statement-breakpoint
CREATE INDEX `songs_file_hash_index` ON `songs` (`file_hash`);
