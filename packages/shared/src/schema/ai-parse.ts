import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { songs } from './songs';

export const aiParseTasks = sqliteTable('ai_parse_tasks', {
  id: integer('id').primaryKey(),
  songId: integer('song_id').references(() => songs.id),
  status: text('status'),
  model: text('model'),
  promptTemplate: text('prompt_template'),
  requestMessages: text('request_messages'),
  responseRaw: text('response_raw'),
  result: text('result'),
  error: text('error'),
  confidence: real('confidence'),
  needReview: integer('need_review').default(0),
  originalTitle: text('original_title'),
  originalArtistId: integer('original_artist_id'),
  originalArtistName: text('original_artist_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export type AiParseTask = typeof aiParseTasks.$inferSelect;
export type NewAiParseTask = typeof aiParseTasks.$inferInsert;
