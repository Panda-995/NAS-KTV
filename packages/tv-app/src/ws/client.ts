import type { WsMessage, WsMessageType } from '@nasktv/shared';
import { useConfigStore } from '../stores/config';

type MessageHandler = (message: WsMessage) => void;
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

// 心跳配置
const HEARTBEAT_INTERVAL_MS = 25_000; // 客户端每 25 秒发一次 PING
// 服务端每 35 秒扫描，60 秒未活跃即断开，留出足够余量
// 重连：无限重试（指数退避 1s 起，上限 30s），避免掉线后永久离线（原 5 次上限导致部分用户界面卡住）
const RECONNECT_MAX_DELAY_MS = 30_000;

class RoomWebSocketClient {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private deviceId: string | null = null;
  private handlers: Map<WsMessageType, Set<MessageHandler>> = new Map();
  private statusHandlers: Set<(status: ConnectionStatus) => void> = new Set();
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  // 永久断开标志：disconnect() 置 true 阻止重连；connect() 复位，支持重新注册/切换房间
  private disposed = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusHandlers.forEach(h => h(status));
  }

  connect(roomCode: string, deviceId: string | null = null): void {
    // 关闭旧连接（不触发重连），支持 roomCode 变化时切换
    this.closeCurrent();

    this.disposed = false;
    this.roomCode = roomCode;
    this.deviceId = deviceId;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  /**
   * 关闭当前 WebSocket 连接，不触发重连。
   * 用于 connect() 切换房间或 disconnect() 永久断开前。
   */
  private closeCurrent(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null; // 阻止 onclose 触发 attemptReconnect
      try {
        this.ws.close();
      } catch {
        // 忽略 already closed
      }
      this.ws = null;
    }
  }

  private doConnect() {
    if (!this.roomCode || this.disposed) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // 优先级：运行时配置（设置页保存的 wsUrl）> 构建时 VITE_WS_BASE_URL > 页面同源（浏览器/反代部署模式）
    const runtimeWs = useConfigStore.getState().wsUrl?.trim();
    const configuredBase = runtimeWs || (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim();
    const wsBase = configuredBase
      ? configuredBase.replace(/\/+$/, '')
      : `${protocol}//${window.location.host}`;
    const deviceQuery = this.deviceId == null ? '' : `&deviceId=${encodeURIComponent(this.deviceId)}`;
    const url = `${wsBase}/ws/room?roomCode=${encodeURIComponent(this.roomCode)}&role=tv${deviceQuery}`;

    this.setStatus('connecting');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected to room:', this.roomCode);
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        const handlers = this.handlers.get(message.type);
        if (handlers) {
          handlers.forEach(h => h(message));
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      this.ws = null;
      if (!this.disposed) {
        this.setStatus('disconnected');
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      // 浏览器通常会在 error 后紧接 close；由 close 统一更新状态并调度重连。
      console.warn('WebSocket connection interrupted:', error.type);
    };
  }

  /**
   * 启动客户端心跳：定时发送 PING，服务端会回 PONG 并更新 last_active_at。
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'PING' as WsMessageType,
        payload: { clientTime: Date.now() },
        timestamp: Date.now(),
      });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect() {
    if (this.disposed || this.ws) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), RECONNECT_MAX_DELAY_MS);
    setTimeout(() => this.doConnect(), delay);
  }

  on(type: WsMessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  send(message: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.disposed = true; // 永久断开，阻止重连
    this.setStatus('disconnected');
    this.closeCurrent();
  }
}

export const wsClient = new RoomWebSocketClient();
