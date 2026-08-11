import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const scanResults = sqliteTable('scan_results', {
  id: integer('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  filePath: text('file_path').notNull(),
  status: text('status').notNull(),
  songId: integer('song_id'),
  reason: text('reason'),
  error: text('error'),
});

export type ScanResult = typeof scanResults.$inferSelect;
export type NewScanResult = typeof scanResults.$inferInsert;
