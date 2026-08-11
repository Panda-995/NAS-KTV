import { WebSocket } from 'ws';
import logger from '../logger';
import { aiParseQueue } from '../services/ai-queue';
import { WsMessageType } from '@nasktv/shared';

// 已连接的WebSocket客户端
const clients = new Set<WebSocket>();

/**
 * 注册WebSocket客户端
 */
export function registerAiParseClient(ws: WebSocket): void {
  clients.add(ws);

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', () => {
    clients.delete(ws);
  });
}

/**
 * 广播消息到所有客户端
 */
function broadcast(message: any): void {
  const messageStr = JSON.stringify(message);

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

/**
 * 初始化AI解析进度WebSocket推送
 */
export function initAiParseProgressHandler(): void {
  aiParseQueue.onProgress((progress) => {
    const { type, data } = progress;

    switch (type) {
      case 'started':
        broadcast({
          type: WsMessageType.AI_PARSE_STARTED,
          payload: data,
          timestamp: Date.now()
        });
        break;

      case 'progress':
        broadcast({
          type: WsMessageType.AI_PARSE_PROGRESS,
          payload: data,
          timestamp: Date.now()
        });
        break;

      case 'completed':
        broadcast({
          type: WsMessageType.AI_PARSE_COMPLETED,
          payload: data,
          timestamp: Date.now()
        });
        break;

      case 'failed':
        broadcast({
          type: WsMessageType.AI_PARSE_FAILED,
          payload: data,
          timestamp: Date.now()
        });
        break;
    }
  });

  logger.info('AI parse progress WebSocket handler initialized');
}
