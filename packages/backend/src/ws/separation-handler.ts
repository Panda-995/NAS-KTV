import { WebSocket } from 'ws';
import logger from '../logger';
import { separationQueue } from '../services/separation-queue';
import { WsMessageType } from '@nasktv/shared';
import type {
  SeparationStartedPayload,
  SeparationProgressPayload,
  SeparationCompletedPayload,
  SeparationFailedPayload,
  WsMessage,
} from '@nasktv/shared';

// 已连接的 WebSocket 客户端（Admin）
const clients = new Set<WebSocket>();

/**
 * 注册 WebSocket 客户端，接收分离进度推送
 */
export function registerSeparationClient(ws: WebSocket): void {
  clients.add(ws);

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', () => {
    clients.delete(ws);
  });
}

/**
 * 广播分离消息到所有已连接客户端
 */
export function broadcastSeparationMessage<T>(
  type: WsMessageType,
  payload: T,
): void {
  const message: WsMessage<T> = {
    type,
    payload,
    timestamp: Date.now(),
  };
  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

/**
 * 初始化分离进度 WebSocket 推送
 * 监听 SeparationQueue 的 EventEmitter 事件并广播
 */
export function initSeparationProgressHandler(): void {
  separationQueue.on('started', (event) => {
    const payload: SeparationStartedPayload = {
      taskId: event.taskId,
      songId: event.songId,
      songTitle: event.songTitle,
    };
    broadcastSeparationMessage(
      WsMessageType.SEPARATION_STARTED,
      payload,
    );
  });

  separationQueue.on('progress', (event) => {
    const payload: SeparationProgressPayload = {
      taskId: event.taskId,
      songId: event.songId,
      progress: event.progress ?? 0,
      stage: event.stage ?? 'separating',
    };
    broadcastSeparationMessage(
      WsMessageType.SEPARATION_PROGRESS,
      payload,
    );
  });

  separationQueue.on('completed', (event) => {
    const payload: SeparationCompletedPayload = {
      taskId: event.taskId,
      songId: event.songId,
      vocalsPath: event.vocalsPath ?? '',
      instrumentalPath: event.instrumentalPath ?? '',
    };
    broadcastSeparationMessage(
      WsMessageType.SEPARATION_COMPLETED,
      payload,
    );
  });

  separationQueue.on('failed', (event) => {
    const payload: SeparationFailedPayload = {
      taskId: event.taskId,
      songId: event.songId,
      error: event.error ?? 'Unknown error',
    };
    broadcastSeparationMessage(
      WsMessageType.SEPARATION_FAILED,
      payload,
    );
  });

  logger.info('Separation progress WebSocket handler initialized');
}
