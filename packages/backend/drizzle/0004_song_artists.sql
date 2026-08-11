CREATE TABLE `song_artists` (
	`id` integer PRIMARY KEY NOT NULL,
	`song_id` integer NOT NULL,
	`artist_id` integer NOT NULL,
	`position` integer DEFAULT 0,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `song_artists_song_id_artist_id_unique` ON `song_artists` (`song_id`,`artist_id`);
--> statement-breakpoint
CREATE INDEX `song_artists_artist_id_index` ON `song_artists` (`artist_id`);
--> statement-breakpoint
INSERT INTO `song_artists` (`song_id`, `artist_id`, `position`)
SELECT `id`, `artist_id`, 0 FROM `songs` WHERE `artist_id` IS NOT NULL;
