import { WebSocket } from 'ws';
import logger from '../logger';
import { onScanProgress } from '../services/scanner';
import { WsMessageType } from '@nasktv/shared';

const clients = new Set<WebSocket>();

export function registerScanClient(ws: WebSocket): void {
  clients.add(ws);
  
  ws.on('close', () => {
    clients.delete(ws);
  });
}

function broadcast(message: any): void {
  const messageStr = JSON.stringify(message);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

export function initScanProgressHandler(): void {
  onScanProgress((progress) => {
    const { type, data } = progress;
    
    switch (type) {
      case 'started':
        broadcast({
          type: WsMessageType.SCAN_STARTED,
          payload: data,
          timestamp: Date.now()
        });
        break;
        
      case 'progress':
        broadcast({
          type: WsMessageType.SCAN_PROGRESS,
          payload: data,
          timestamp: Date.now()
        });
        break;
        
      case 'completed':
        broadcast({
          type: WsMessageType.SCAN_COMPLETED,
          payload: data,
          timestamp: Date.now()
        });
        break;
        
      case 'failed':
        broadcast({
          type: WsMessageType.SCAN_FAILED,
          payload: data,
          timestamp: Date.now()
        });
        break;
    }
  });
  
  logger.info('Scan progress WebSocket handler initialized');
}