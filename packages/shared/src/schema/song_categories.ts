import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { songs } from './songs';
import { categoryItems } from './categories';

export const songCategories = sqliteTable('song_categories', {
  id: integer('id').primaryKey(),
  songId: integer('song_id').references(() => songs.id),
  categoryItemId: integer('category_item_id').references(() => categoryItems.id),
  source: text('source', { enum: ['manual', 'ai'] }),
});

export type SongCategory = typeof songCategories.$inferSelect;
export type NewSongCategory = typeof songCategories.$inferInsert;
