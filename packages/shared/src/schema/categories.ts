import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const categoryItems = sqliteTable('category_items', {
  id: integer('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0),
  songCount: integer('song_count').default(0),
  source: text('source', { enum: ['auto', 'manual'] }).default('auto'),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryItem = typeof categoryItems.$inferSelect;
export type NewCategoryItem = typeof categoryItems.$inferInsert;
