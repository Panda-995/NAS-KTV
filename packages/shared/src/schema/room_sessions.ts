import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const roomSessions = sqliteTable('room_sessions', {
  id: integer('id').primaryKey(),
  roomId: integer('room_id'),
  nickname: text('nickname'),
  avatar: text('avatar'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }),
  leftAt: integer('left_at', { mode: 'timestamp' }),
});

export type RoomSession = typeof roomSessions.$inferSelect;
export type NewRoomSession = typeof roomSessions.$inferInsert;
