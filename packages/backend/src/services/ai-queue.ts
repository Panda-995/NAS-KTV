import { db, schema } from '../db';
import { eq, inArray } from 'drizzle-orm';
import logger from '../logger';
import { aiParseService } from './ai-parse-service';
import { getPromptTemplate } from './ai-prompt';
import { getAiParseConcurrency } from './settings-service';
import { runLocalDedup } from './dedup-service';

const CONFIDENCE_THRESHOLD = 0.8;
const MAX_RETRIES = 3;
const AI_CONFIG_KEY = 'ai_config';

function getConfiguredModel(): string {
  try {
    const row = db.select().from(schema.settings).where(eq(schema.settings.key, AI_CONFIG_KEY)).get();
    if (row) {
      const config = JSON.parse(row.value ?? '{}');
      if (config.model) return config.model;
    }
  } catch {}
  return process.env.AI_MODEL || 'gpt-4o-mini';
}

// 队列项
interface QueueItem {
  taskId: number;
  songId: number;
  retryCount: number;
}

// 进度回调类型
export type ProgressCallback = (progress: {
  type: 'started' | 'progress' | 'completed' | 'failed';
  data: any;
}) => void;

class AiParseQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private activeCount: number = 0;
  private callbacks: ProgressCallback[] = [];
  private concurrency: number = 1;

  /**
   * 更新并发数（从 settings 读取）
   */
  async updateConcurrency(): Promise<void> {
    this.concurrency = await getAiParseConcurrency();
    logger.info(`AI parse concurrency set to ${this.concurrency}`);
    // 并发数提高后，尝试填充空闲槽位
    this.processNext();
  }

  constructor() {
    // 同步用环境变量兜底，避免启动初期 updateConcurrency 未完成时任务以默认并发 1 串行
    const env = parseInt(process.env.AI_PARSE_CONCURRENCY ?? '', 10);
    this.concurrency = Number.isFinite(env) && env > 0 ? env : 1;
    // 异步从 settings 读取（覆盖环境变量），失败则保持环境变量值
    this.updateConcurrency().catch(() => {});
  }

  /**
   * 注册进度回调
   */
  onProgress(callback: ProgressCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 发送进度事件
   */
  private emit(progress: { type: 'started' | 'progress' | 'completed' | 'failed'; data: any }) {
    this.callbacks.forEach(cb => {
      try {
        cb(progress);
      } catch (e) {
        logger.error('Error in progress callback:', e);
      }
    });
  }

  /**
   * 任务入队
   */
  enqueue(songId: number): number {
    const { systemPrompt, userPromptTemplate } = getPromptTemplate();
    const result = db
      .insert(schema.aiParseTasks)
      .values({
        songId,
        status: 'pending',
        model: getConfiguredModel(),
        promptTemplate: JSON.stringify({ systemPrompt, userPromptTemplate }),
        createdAt: new Date()
      })
      .returning()
      .get();

    const taskId = result.id;

    this.queue.push({
      taskId,
      songId,
      retryCount: 0
    });

    logger.info(`AI parse task ${taskId} enqueued for song ${songId}`);

    // 触发处理
    this.processNext();

    return taskId;
  }

  /**
   * 批量入队
   */
  enqueueBatch(songIds: number[]): number[] {
    const taskIds: number[] = [];
    for (const songId of songIds) {
      const taskId = this.enqueue(songId);
      taskIds.push(taskId);
    }
    return taskIds;
  }

  /**
   * 处理下一个任务
   */
  private async processNext(): Promise<void> {
    if (this.activeCount >= this.concurrency) {
      return;
    }

    const item = this.queue.shift();
    if (!item) {
      return;
    }

    this.activeCount++;

    try {
      // 发送开始事件
      this.emit({
        type: 'started',
        data: {
          taskId: item.taskId,
          songId: item.songId,
          startTime: Date.now()
        }
      });

      // 更新任务状态
      db.update(schema.aiParseTasks)
        .set({
          status: 'processing',
          startedAt: new Date()
        })
        .where(eq(schema.aiParseTasks.id, item.taskId))
        .run();

      // 执行解析
      const parseResult = await aiParseService.parseSong(item.songId, (stage, progress) => {
        this.emit({
          type: 'progress',
          data: {
            taskId: item.taskId,
            songId: item.songId,
            stage,
            progress,
            message: `Processing: ${stage}`
          }
        });
      });

      if (parseResult) {
        const { applied, aiParsed: aiParsedValue } = await aiParseService.applyParseResult(item.songId, parseResult.result);

        db.update(schema.aiParseTasks)
          .set({
            status: 'completed',
            result: JSON.stringify(parseResult.result),
            requestMessages: JSON.stringify(parseResult.requestMessages),
            responseRaw: parseResult.responseRaw,
            originalTitle: parseResult.originalTitle,
            originalArtistId: parseResult.originalArtistId,
            originalArtistName: parseResult.originalArtistName,
            confidence: parseResult.result.confidence,
            needReview: aiParsedValue === 2 ? 1 : 0,
            completedAt: new Date()
          })
          .where(eq(schema.aiParseTasks.id, item.taskId))
          .run();

        // 发送完成事件
        this.emit({
          type: 'completed',
          data: {
            taskId: item.taskId,
            songId: item.songId,
            success: true,
            confidence: parseResult.result.confidence,
            autoApplied: applied && aiParsedValue === 1,
            needReview: aiParsedValue === 2,
            aiParsed: aiParsedValue,
            result: parseResult.result,
            duration: Date.now()
          }
        });
      } else {
        throw new Error('AI parse returned null result');
      }

    } catch (error) {
      logger.error(`Task ${item.taskId} failed:`, error);

      item.retryCount++;

      if (item.retryCount < MAX_RETRIES) {
        // 重试
        logger.info(`Retrying task ${item.taskId} (attempt ${item.retryCount + 1})`);
        this.queue.push(item);
      } else {
        // 标记失败
        db.update(schema.aiParseTasks)
          .set({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date()
          })
          .where(eq(schema.aiParseTasks.id, item.taskId))
          .run();

        this.emit({
          type: 'failed',
          data: {
            taskId: item.taskId,
            songId: item.songId,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: item.retryCount,
            maxRetries: MAX_RETRIES
          }
        });
      }
    } finally {
      this.activeCount--;
      // 队列清空：AI 解析全部完成后自动执行本地去重（开关/前置条件在服务内部检查）
      if (this.queue.length === 0 && this.activeCount === 0) {
        runLocalDedup().catch((err) => logger.error('Auto local dedup failed:', err));
      }
      // 继续处理下一个
      this.processNext();
    }  }

  /**
   * 服务重启后恢复未完成任务：将 DB 中 pending/processing 的任务重新入队
   */
  recoverPendingTasks(): void {
    const rows = db
      .select({ id: schema.aiParseTasks.id, songId: schema.aiParseTasks.songId })
      .from(schema.aiParseTasks)
      .where(inArray(schema.aiParseTasks.status, ['pending', 'processing']))
      .all();

    let recovered = 0;
    for (const row of rows) {
      if (row.songId == null) continue;
      this.queue.push({ taskId: row.id, songId: row.songId, retryCount: 0 });
      recovered++;
    }

    logger.info(`Recovered ${recovered} pending AI parse task(s)`);
    if (recovered > 0) {
      this.processNext();
    }
  }

  /**
   * 获取队列状态
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      activeCount: this.activeCount,
      isProcessing: this.activeCount > 0
    };
  }
}

// 全局队列实例
export const aiParseQueue = new AiParseQueue();
