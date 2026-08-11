import { sqliteTable, integer } from 'drizzle-orm/sqlite-core';

export const playHistory = sqliteTable('play_history', {
  id: integer('id').primaryKey(),
  roomId: integer('room_id'),
  songId: integer('song_id'),
  playedAt: integer('played_at', { mode: 'timestamp' }),
  durationPlayed: integer('duration_played'),
});

export type PlayHistory = typeof playHistory.$inferSelect;
export type NewPlayHistory = typeof playHistory.$inferInsert;
