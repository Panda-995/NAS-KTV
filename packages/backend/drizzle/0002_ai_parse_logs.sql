ALTER TABLE `ai_parse_tasks` ADD COLUMN `request_messages` text;
--> statement-breakpoint
ALTER TABLE `ai_parse_tasks` ADD COLUMN `response_raw` text;
--> statement-breakpoint
ALTER TABLE `ai_parse_tasks` ADD COLUMN `original_title` text;
--> statement-breakpoint
ALTER TABLE `ai_parse_tasks` ADD COLUMN `original_artist_id` integer;
--> statement-breakpoint
ALTER TABLE `ai_parse_tasks` ADD COLUMN `original_artist_name` text;
