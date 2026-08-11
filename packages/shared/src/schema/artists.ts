import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const artists = sqliteTable('artists', {
  id: integer('id').primaryKey(),
  name: text('name').unique().notNull(),
  pinyin: text('pinyin'),
  firstLetter: text('first_letter'),
  avatar: text('avatar'),
  bio: text('bio'),
  songCount: integer('song_count').default(0),
  source: text('source', { enum: ['auto', 'manual'] }).default('auto'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
