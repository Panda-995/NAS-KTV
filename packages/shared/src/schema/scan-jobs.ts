import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const scanJobs = sqliteTable('scan_jobs', {
  id: integer('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  scanPath: text('scan_path').notNull(),
  status: text('status').notNull(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  newSongs: integer('new_songs').default(0),
  updatedSongs: integer('updated_songs').default(0),
  skippedSongs: integer('skipped_songs').default(0),
  errorCount: integer('error_count').default(0),
  error: text('error'),
  errors: text('errors'),
});

export type ScanJob = typeof scanJobs.$inferSelect;
export type NewScanJob = typeof scanJobs.$inferInsert;
