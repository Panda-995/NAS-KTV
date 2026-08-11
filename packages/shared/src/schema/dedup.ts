import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/** 去重任务记录 */
export const dedupTasks = sqliteTable('dedup_tasks', {
  id: integer('id').primaryKey(),
  scanId: text('scan_id'), // 关联的扫描任务（自动触发时为最近完成的扫描）
  status: text('status').notNull(), // running / completed / failed
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  checked: integer('checked').default(0),
  removed: integer('removed').default(0),
  duplicates: text('duplicates'), // JSON：重复项明细（含删除歌曲文件路径，供还原）
  error: text('error'),
});

/** 去重例外（手动还原的歌曲）：去重时跳过，防止被再次识别删除 */
export const dedupExceptions = sqliteTable('dedup_exceptions', {
  id: integer('id').primaryKey(),
  filePath: text('file_path').unique().notNull(),
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type DedupTask = typeof dedupTasks.$inferSelect;
export type NewDedupTask = typeof dedupTasks.$inferInsert;
export type DedupException = typeof dedupExceptions.$inferSelect;
export type NewDedupException = typeof dedupExceptions.$inferInsert;
