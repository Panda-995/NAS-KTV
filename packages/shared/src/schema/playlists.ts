import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { songs } from './songs';

export const playlists = sqliteTable('playlists', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  cover: text('cover'),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
});

export const playlistSongs = sqliteTable('playlist_songs', {
  id: integer('id').primaryKey(),
  playlistId: integer('playlist_id').references(() => playlists.id),
  songId: integer('song_id').references(() => songs.id),
  sortOrder: integer('sort_order').default(0),
});

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;
export type PlaylistSong = typeof playlistSongs.$inferSelect;
export type NewPlaylistSong = typeof playlistSongs.$inferInsert;
