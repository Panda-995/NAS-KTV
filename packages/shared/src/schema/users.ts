import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('admin'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
