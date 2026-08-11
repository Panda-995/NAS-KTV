import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
