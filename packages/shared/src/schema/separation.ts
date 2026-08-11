import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { songs } from './songs';

export const separationTasks = sqliteTable('separation_tasks', {
  id: integer('id').primaryKey(),
  songId: integer('song_id').references(() => songs.id),
  separatorTaskId: text('separator_task_id'),
  status: text('status'),
  model: text('model'),
  priority: integer('priority').default(0),
  progress: real('progress').default(0),
  stage: text('stage'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export type SeparationTask = typeof separationTasks.$inferSelect;
export type NewSeparationTask = typeof separationTasks.$inferInsert;
