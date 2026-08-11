import { useEffect, useRef } from 'react';
import { useRoomStore } from '../stores/room';
import { useQueueStore } from '../stores/queue';
import { wsClient } from '../ws/client';
import {
  WsMessageType,
  type QueueUpdatedPayload,
  type PlayerStatePayload,
  type QueueListItem,
  type RoomStateSnapshotPayload,
  type LyricSyncPayload,
  type RoomUnauthorizedPayload,
  type RoomClosedPayload,
} from '@nasktv/shared';

export function useRoomSync() {
  const { roomCode, sessionToken, sessionExpiresAt, leave, setUnauthorized } = useRoomStore();
  const { setQueue, setCurrentItem, setPlayerState, setCurrentLyricIndex } = useQueueStore();
  // 服务端按房间分配的队列版本；快照与实时广播共用该基线，避免乱序覆盖。
  const lastQueueVersionRef = useRef(0);
  // 最近处理的播放状态版本号：由服务端单调递增分配。
  // TV 每秒广播一次状态，seek/调节后旧状态仍在途，版本号可丢弃这些过期帧避免进度条回跳
  const lastStateVersionRef = useRef(0);

  // 回到加入页并携带失效原因，Join 页据此展示提示（授权码更新/会话过期/房间关闭等）
  const redirectToJoin = (reason: string) => {
    window.location.href = `/h5/join?reason=${encodeURIComponent(reason)}`;
  };

  // 本地到期仅用于及时清理体验；真正的安全边界仍是服务端 joinedAt TTL 校验。
  useEffect(() => {
    if (!sessionExpiresAt) return;
    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) {
      leave();
      wsClient.disconnect();
      redirectToJoin('session-expired');
      return;
    }
    const timer = window.setTimeout(() => {
      leave();
      wsClient.disconnect();
      redirectToJoin('session-expired');
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [sessionExpiresAt, leave]);

  useEffect(() => {
    if (!roomCode || !sessionToken) return;

    // 连接 WebSocket（新房间码下重置乱序保护基线）
    wsClient.connect(roomCode, sessionToken);
    lastQueueVersionRef.current = 0;
    lastStateVersionRef.current = 0;

    // 监听房间状态快照（重连恢复）：快照是连接后的权威状态，无条件采用并重置版本基线，
    // 避免后端重启版本号归零后新广播被永久丢弃（曾导致 H5 长时间无法同步播放状态）
    const unsubSnapshot = wsClient.on(WsMessageType.ROOM_STATE_SNAPSHOT, (msg) => {
      const payload = msg.payload as RoomStateSnapshotPayload;
      const version = Number(payload.queueVersion ?? 0);
      lastQueueVersionRef.current = version;
      setQueue(payload.queue as unknown as QueueListItem[]);

      const playing = payload.queue.find(q => q.status === 'playing');
      setCurrentItem((playing as unknown as QueueListItem) || null);

      if (payload.playerState) {
        lastStateVersionRef.current = Number((payload.playerState as PlayerStatePayload).stateVersion ?? 0);
        setPlayerState(payload.playerState);
      } else {
        // TV 未在线或服务端无状态缓存（TV 重启/后端重启）：清空陈旧播放状态并重置版本基线，
        // 后续 TV 上报的新状态（版本号从当前计数继续或归零）均能正常接受
        lastStateVersionRef.current = 0;
        setPlayerState(null);
      }
    });

    // 监听队列更新
    const unsubQueue = wsClient.on(WsMessageType.QUEUE_UPDATED, (msg) => {
      const payload = msg.payload as QueueUpdatedPayload;
      const version = Number(payload.queueVersion ?? 0);
      if (version && version < lastQueueVersionRef.current) return;
      lastQueueVersionRef.current = Math.max(lastQueueVersionRef.current, version);
      // WS 推送的 QueueItem 与 QueueListItem 结构兼容，统一以 QueueListItem 存储
      setQueue(payload.queue as unknown as QueueListItem[]);

      const playing = payload.queue.find(q => q.status === 'playing');
      setCurrentItem((playing as unknown as QueueListItem) || null);
    });

    // 监听播放器状态
    const unsubPlayer = wsClient.on(WsMessageType.PLAYER_STATE, (msg) => {
      const payload = msg.payload as PlayerStatePayload;
      const version = Number(payload.stateVersion ?? 0);
      // 无版本号（旧 TV 端）时退化为无条件接受，保持向后兼容
      if (version && version < lastStateVersionRef.current) return;
      lastStateVersionRef.current = Math.max(lastStateVersionRef.current, version);
      setPlayerState(payload);
    });

    // 监听歌词同步（TV 端推送当前歌词行）
    const unsubLyric = wsClient.on(WsMessageType.LYRIC_SYNC, (msg) => {
      const payload = msg.payload as LyricSyncPayload;
      // 校验与当前播放歌曲一致（重连补发时避免旧歌索引错位到新歌）
      const currentSongId = useQueueStore.getState().currentItem?.songId;
      if (currentSongId != null && payload.songId !== currentSongId) return;
      setCurrentLyricIndex(payload.lineIndex);
    });

    // 监听房间关闭 → 回到加入页（带原因提示）
    const unsubClosed = wsClient.on(WsMessageType.ROOM_CLOSED, msg => {
      const payload = msg.payload as RoomClosedPayload;
      leave();
      setQueue([]);
      setCurrentItem(null);
      setPlayerState(null);
      setCurrentLyricIndex(0);
      wsClient.disconnect();
      if (payload.reason === 'code_rotated') {
        redirectToJoin('code-rotated');
      } else if (payload.reason === 'room_not_found') {
        redirectToJoin('room-not-found');
      } else {
        redirectToJoin('room-closed');
      }
    });

    // 监听未授权 → 会话过期回加入页；管理员撤权/授权到期展示禁止点歌提示
    const unsubUnauth = wsClient.on(WsMessageType.ROOM_UNAUTHORIZED, msg => {
      const payload = msg.payload as RoomUnauthorizedPayload;
      leave();
      setQueue([]);
      setCurrentItem(null);
      setPlayerState(null);
      setCurrentLyricIndex(0);
      wsClient.disconnect();
      if (payload.reason === 'session_expired') {
        redirectToJoin('session-expired');
      } else {
        setUnauthorized(true);
      }
    });

    return () => {
      unsubSnapshot();
      unsubQueue();
      unsubPlayer();
      unsubLyric();
      unsubClosed();
      unsubUnauth();
      wsClient.disconnect();
    };
  }, [roomCode, sessionToken, setQueue, setCurrentItem, setPlayerState, setCurrentLyricIndex, leave, setUnauthorized]);
}
