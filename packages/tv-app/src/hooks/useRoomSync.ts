import { useEffect, useRef } from 'react';
import {
  WsMessageType,
  type QueueUpdatedPayload,
  type QueueListItem,
  type RoomStateSnapshotPayload,
  type RoomClosedPayload,
  type PlayerStatePayload,
  type RoomAuthorizedPayload,
  type RoomUnauthorizedPayload,
  type RoomExpiringSoonPayload,
} from '@nasktv/shared';
import { useRoomStore } from '../stores/room';
import { wsClient } from '../ws/client';
import { clearDeviceId } from '../lib/device';

/**
 * 统一管理房间 WebSocket 连接与消息监听。
 *
 * 职责：
 * - room.code 存在时建立 WebSocket 连接（含重连）
 * - room.code 变化时切换连接到新房间
 * - room 被清空（reset）时断开连接
 * - 监听 ROOM_STATE_SNAPSHOT / QUEUE_UPDATED / ROOM_AUTHORIZED / ROOM_UNAUTHORIZED / ROOM_CLOSED
 * - 设备被删除（ROOM_CLOSED reason=deleted）时清除本地 deviceId 并 reset store，触发 App.tsx 重新注册
 *
 * 此 hook 在 App.tsx 顶层调用，确保无论路由走到哪个页面，WS 始终活跃。
 */
export function useRoomSync() {
  const {
    setQueue,
    setCurrentItem,
    setPlayerState,
    setAuthorized,
    setExpiresAt,
    reset,
    room,
  } = useRoomStore();

  // 设备删除标志：收到 ROOM_CLOSED(deleted) 后置 true，
  // 防止 reset() 触发的 useEffect 重新连接到旧房间码。
  // App.tsx 重新 bootstrap 并 setRoom 新房间后会通过 roomCodeRef 校验。
  const isDeletingRef = useRef(false);
  const roomCodeRef = useRef<string | null>(null);
  // 服务端按房间分配的队列版本；快照与实时广播共用该基线，避免乱序覆盖。
  const lastQueueVersionRef = useRef(0);

  useEffect(() => {
    const currentCode = room?.code ?? null;
    const currentDeviceId = room?.deviceId ?? null;

    // 如果正在删除设备中，跳过本次 effect（避免 reset 后立即重连旧房间）
    if (isDeletingRef.current) {
      return;
    }

    if (!currentCode || !currentDeviceId) {
      // room 被清空（非删除流程，如手动 reset）：断开 WS，阻止重连到旧房间
      wsClient.disconnect();
      return;
    }

    // 连接（或切换到）当前房间
    wsClient.connect(currentCode, currentDeviceId);
    roomCodeRef.current = currentCode;
    lastQueueVersionRef.current = 0;

    // 房间状态快照（重连恢复）：快照是连接后的权威状态，无条件采用并重置队列版本基线。
    // 若服务端无播放器状态缓存（TV 重启/后端重启），清空本地陈旧状态，
    // 避免 TV 恢复播放后 H5 端仍显示旧状态、或后端重启版本号归零后新广播被永久丢弃
    const unsubSnapshot = wsClient.on(
      WsMessageType.ROOM_STATE_SNAPSHOT,
      (msg) => {
        const payload = msg.payload as RoomStateSnapshotPayload;
        const version = Number(payload.queueVersion ?? 0);
        lastQueueVersionRef.current = version;
        setQueue(payload.queue as unknown as QueueListItem[]);
        setAuthorized(payload.authorized);

        const playing = payload.queue.find((q) => q.status === 'playing');
        setCurrentItem((playing as unknown as QueueListItem) || null);

        if (payload.playerState) {
          setPlayerState(payload.playerState as PlayerStatePayload);
        } else {
          setPlayerState(null);
        }
      }
    );

    // 队列更新
    const unsubQueue = wsClient.on(WsMessageType.QUEUE_UPDATED, (msg) => {
      const payload = msg.payload as QueueUpdatedPayload;
      const version = Number(payload.queueVersion ?? 0);
      if (version && version < lastQueueVersionRef.current) return;
      lastQueueVersionRef.current = Math.max(lastQueueVersionRef.current, version);
      setQueue(payload.queue as unknown as QueueListItem[]);

      const playing = payload.queue.find((q) => q.status === 'playing');
      setCurrentItem((playing as unknown as QueueListItem) || null);
    });

    // 授权通过
    const unsubAuthorized = wsClient.on(
      WsMessageType.ROOM_AUTHORIZED,
      (msg) => {
        const payload = msg.payload as RoomAuthorizedPayload;
        if (payload.roomCode === roomCodeRef.current) {
          setAuthorized(true);
          setExpiresAt(null);
        }
      }
    );

    // 授权即将到期（倒计时提示）
    const unsubExpiring = wsClient.on(
      WsMessageType.ROOM_EXPIRING_SOON,
      (msg) => {
        const payload = msg.payload as RoomExpiringSoonPayload;
        if (payload.roomCode === roomCodeRef.current) {
          setExpiresAt(payload.expiresAt);
        }
      }
    );

    // 授权撤销/过期
    const unsubUnauthorized = wsClient.on(
      WsMessageType.ROOM_UNAUTHORIZED,
      (msg) => {
        const payload = msg.payload as RoomUnauthorizedPayload;
        console.warn('Room unauthorized:', payload.reason);
        setAuthorized(false);
        setExpiresAt(null);
      }
    );

    // 房间关闭：设备被删除时清除本地信息并重新生成
    const unsubClosed = wsClient.on(WsMessageType.ROOM_CLOSED, (msg) => {
      const payload = msg.payload as RoomClosedPayload;
      if (payload.reason === 'deleted') {
        // 设置删除标志，阻止 reset() 触发的 useEffect 重新连接旧房间
        isDeletingRef.current = true;
        // 先断开 WS（防止 reset 后旧连接重连），再清除本地 deviceId，
        // 最后 reset store 触发 App.tsx 重新 bootstrap
        wsClient.disconnect();
        clearDeviceId().then(() => {
          reset();
          // reset 完成后，等待 App.tsx bootstrap 设置新 room
          // 新 room 设置后，isDeletingRef 会在下方 roomCode 变化时重置
        });
      }
    });

    return () => {
      unsubSnapshot();
      unsubQueue();
      unsubAuthorized();
      unsubExpiring();
      unsubUnauthorized();
      unsubClosed();
    };
  }, [
    room?.code,
    room?.deviceId,
    setQueue,
    setCurrentItem,
    setPlayerState,
    setAuthorized,
    setExpiresAt,
    reset,
  ]);

  // 当 room.code 变化（App.tsx bootstrap 完成设置新 room）时，清除删除标志
  useEffect(() => {
    if (room?.code && isDeletingRef.current) {
      isDeletingRef.current = false;
    }
  }, [room?.code]);
}
