import type { WsMessage, WsMessageType } from '@nasktv/shared';

type MessageHandler = (message: WsMessage) => void;
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

// 心跳配置
const HEARTBEAT_INTERVAL_MS = 25_000; // 客户端每 25 秒发一次 PING
// 服务端每 35 秒扫描，60 秒未活跃即断开，留出足够余量
// 重连：无限重试（指数退避 1s 起，上限 30s），避免掉线后永久离线（原 5 次上限导致部分用户界面卡住）
const RECONNECT_MAX_DELAY_MS = 30_000;

class RoomWebSocketClient {
  private ws: WebSocket | null = null;
  private roomCode: string | null = null;
  private sessionToken: string | null = null;
  private handlers: Map<WsMessageType, Set<MessageHandler>> = new Map();
  private statusHandlers: Set<(status: ConnectionStatus) => void> = new Set();
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  // 永久断开标志：disconnect() 置 true 阻止重连；connect() 复位，支持重新加入
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

  connect(roomCode: string, sessionToken: string | null = null): void {
    // 幂等连接：先关闭旧连接（不触发重连），避免连接泄漏导致的多连接/重连风暴
    this.closeCurrent();
    this.disposed = false;
    this.roomCode = roomCode;
    this.sessionToken = sessionToken;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  /**
   * 关闭当前 WebSocket 连接，不触发重连。
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
    const host = window.location.host;
    const sessionQuery = this.sessionToken == null
      ? ''
      : `&sessionToken=${encodeURIComponent(this.sessionToken)}`;
    const url = `${protocol}//${host}/ws/room?roomCode=${encodeURIComponent(this.roomCode)}&role=mobile${sessionQuery}`;

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

    this.ws.onclose = event => {
      this.stopHeartbeat();
      this.ws = null;
      if (event.code === 4001) {
        this.disposed = true;
        this.setStatus('disconnected');
        const handlers = this.handlers.get('ROOM_UNAUTHORIZED' as WsMessageType);
        handlers?.forEach(handler =>
          handler({
            type: 'ROOM_UNAUTHORIZED' as WsMessageType,
            payload: { roomCode: this.roomCode ?? '', reason: 'session_expired' },
            timestamp: Date.now(),
          }),
        );
        return;
      }
      if (event.code === 1008) {
        // 服务端明确拒绝（房间不存在/已更换授权码/身份失败）：
        // 旧房间可能已被 TV 重启轮换或管理员删除，无限重连只会永久卡在连接中。
        // 触发房间失效处理（清状态 + 回到加入页提示），不再重连。
        this.disposed = true;
        this.setStatus('disconnected');
        const handlers = this.handlers.get('ROOM_CLOSED' as WsMessageType);
        handlers?.forEach(handler =>
          handler({
            type: 'ROOM_CLOSED' as WsMessageType,
            payload: { roomCode: this.roomCode ?? '', reason: 'room_not_found' },
            timestamp: Date.now(),
          }),
        );
        return;
      }
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
    this.stopHeartbeat();
    this.disposed = true;
    this.setStatus('disconnected');
    this.closeCurrent();
  }
}

export const wsClient = new RoomWebSocketClient();
