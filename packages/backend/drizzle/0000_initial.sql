-- Initial schema for nasktv
-- Generated from packages/shared/src/schema/*.ts

CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `username` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `role` text DEFAULT 'admin',
  `created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `artists` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text NOT NULL UNIQUE,
  `pinyin` text,
  `first_letter` text,
  `avatar` text,
  `bio` text,
  `song_count` integer DEFAULT 0,
  `created_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `songs` (
  `id` integer PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `artist_id` integer REFERENCES `artists`(`id`),
  `album_id` integer,
  `file_path` text NOT NULL UNIQUE,
  `file_type` text CHECK(`file_type` IN ('audio', 'video')),
  `duration` integer,
  `lyrics_path` text,
  `pitch_default` integer DEFAULT 0,
  `play_count` integer DEFAULT 0,
  `created_at` integer,
  `vocals_path` text,
  `instrumental_path` text,
  `separation_status` text CHECK(`separation_status` IN ('pending', 'processing', 'completed', 'failed')),
  `separation_model` text,
  `separation_started_at` integer,
  `separation_completed_at` integer,
  `separation_error` text,
  `ai_parsed` integer DEFAULT 0,
  `ai_parsed_at` integer,
  `ai_confidence` real,
  `ai_need_review` integer DEFAULT 0,
  `raw_tags` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `sort_order` integer DEFAULT 0,
  `created_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `category_items` (
  `id` integer PRIMARY KEY NOT NULL,
  `category_id` integer REFERENCES `categories`(`id`),
  `name` text NOT NULL,
  `sort_order` integer DEFAULT 0,
  `song_count` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `song_categories` (
  `id` integer PRIMARY KEY NOT NULL,
  `song_id` integer REFERENCES `songs`(`id`),
  `category_item_id` integer REFERENCES `category_items`(`id`),
  `source` text CHECK(`source` IN ('manual', 'ai'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` integer PRIMARY KEY NOT NULL,
  `code` text NOT NULL UNIQUE,
  `device_id` text NOT NULL UNIQUE,
  `name` text,
  `authorized` integer DEFAULT 0,
  `authorized_at` integer,
  `authorized_by` integer,
  `authorize_type` text CHECK(`authorize_type` IN ('permanent', 'temporary')),
  `authorize_expires_at` integer,
  `status` text CHECK(`status` IN ('pending', 'active', 'closed', 'revoked')),
  `device_info` text,
  `created_at` integer,
  `closed_at` integer,
  `last_active_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `room_queues` (
  `id` integer PRIMARY KEY NOT NULL,
  `room_id` integer REFERENCES `rooms`(`id`),
  `song_id` integer REFERENCES `songs`(`id`),
  `user_session_id` text,
  `status` text CHECK(`status` IN ('pending', 'playing', 'played', 'skipped')),
  `sort_order` integer DEFAULT 0,
  `requested_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `playlists` (
  `id` integer PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `cover` text,
  `description` text,
  `sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `playlist_songs` (
  `id` integer PRIMARY KEY NOT NULL,
  `playlist_id` integer REFERENCES `playlists`(`id`),
  `song_id` integer REFERENCES `songs`(`id`),
  `sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `separation_tasks` (
  `id` integer PRIMARY KEY NOT NULL,
  `song_id` integer REFERENCES `songs`(`id`),
  `status` text,
  `model` text,
  `priority` integer DEFAULT 0,
  `progress` real DEFAULT 0,
  `stage` text,
  `error` text,
  `created_at` integer,
  `started_at` integer,
  `completed_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_parse_tasks` (
  `id` integer PRIMARY KEY NOT NULL,
  `song_id` integer REFERENCES `songs`(`id`),
  `status` text,
  `model` text,
  `prompt_template` text,
  `result` text,
  `error` text,
  `confidence` real,
  `need_review` integer DEFAULT 0,
  `created_at` integer,
  `started_at` integer,
  `completed_at` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `play_history` (
  `id` integer PRIMARY KEY NOT NULL,
  `room_id` integer,
  `song_id` integer,
  `played_at` integer,
  `duration_played` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `room_sessions` (
  `id` integer PRIMARY KEY NOT NULL,
  `room_id` integer,
  `nickname` text,
  `avatar` text,
  `joined_at` integer,
  `left_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `songs_artist_id_idx` ON `songs` (`artist_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `songs_separation_status_idx` ON `songs` (`separation_status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `songs_ai_need_review_idx` ON `songs` (`ai_need_review`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `category_items_category_id_idx` ON `category_items` (`category_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `song_categories_song_id_idx` ON `song_categories` (`song_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `song_categories_category_item_id_idx` ON `song_categories` (`category_item_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `room_queues_room_id_idx` ON `room_queues` (`room_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `room_queues_status_idx` ON `room_queues` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rooms_code_idx` ON `rooms` (`code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rooms_status_idx` ON `rooms` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `separation_tasks_status_idx` ON `separation_tasks` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ai_parse_tasks_status_idx` ON `ai_parse_tasks` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `playlist_songs_playlist_id_idx` ON `playlist_songs` (`playlist_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `play_history_room_id_idx` ON `play_history` (`room_id`);
