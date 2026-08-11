import { useState, useCallback } from 'react';
import { useRoomStore } from '../stores/room';
import { useQueueStore } from '../stores/queue';
import { useToastStore } from '../stores/toast';
import { queueApi } from '../api/queue';
import type { Song, QueueListItem } from '@nasktv/shared';

const OPTIMISTIC_TIMEOUT_MS = 5000;
const SUCCESS_FEEDBACK_MS = 2000;

export function useAddToQueue() {
  const { roomId, sessionId, sessionToken, nickname } = useRoomStore();
  const { addOptimistic, removeOptimistic } = useQueueStore();
  const showToast = useToastStore(s => s.show);
  const [addedSongIds, setAddedSongIds] = useState<Set<number>>(new Set());
  const [loadingSongIds, setLoadingSongIds] = useState<Set<number>>(new Set());

  const addToQueue = useCallback(async (song: Song) => {
    if (!roomId || !sessionId || !sessionToken) return;
    if (addedSongIds.has(song.id) || loadingSongIds.has(song.id)) return;

    setLoadingSongIds(prev => new Set(prev).add(song.id));

    // Optimistic update
    const tempId = Date.now() + Math.random();
    addOptimistic({
      id: tempId,
      roomId,
      songId: song.id,
      userSessionId: String(sessionId),
      status: 'pending',
      sortOrder: 999,
      requestedAt: new Date(),
      songTitle: song.title,
      songArtist: song.artist?.name || '未知',
      nickname
    } as QueueListItem);

    let timedOut = false;
    const rollbackTimer = window.setTimeout(() => {
      const stillOptimistic = useQueueStore.getState().queue.some(item => item.id === tempId);
      if (!stillOptimistic) return;
      timedOut = true;
      removeOptimistic(tempId);
      setAddedSongIds(prev => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      showToast('队列同步超时，请重试', 'error');
    }, OPTIMISTIC_TIMEOUT_MS);

    try {
      await queueApi.addToQueue(roomId, {
        songId: song.id,
        sessionToken,
        nickname
      });
      if (!timedOut) {
        setAddedSongIds(prev => new Set(prev).add(song.id));
        // 反馈标记短暂保留，实际状态以 WebSocket QUEUE_UPDATED 同步的队列为准；
        // 歌曲播放完/移除后队列中不再存在，标记过期后按钮自动恢复可点
        window.setTimeout(() => {
          setAddedSongIds(prev => {
            const next = new Set(prev);
            next.delete(song.id);
            return next;
          });
        }, SUCCESS_FEEDBACK_MS);
      }
      // 实际队列由 WebSocket QUEUE_UPDATED 同步，会替换 optimistic 项
    } catch (e) {
      window.clearTimeout(rollbackTimer);
      removeOptimistic(tempId);
      // 后端强校验拦截（如"歌曲已在待播队列中"），提示给用户
      const err = e as { response?: { data?: { error?: string } } } | null;
      if (!timedOut) showToast(err?.response?.data?.error || '点歌失败', 'error');
    } finally {
      setLoadingSongIds(prev => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  }, [roomId, sessionId, sessionToken, nickname, addedSongIds, loadingSongIds, addOptimistic, removeOptimistic, showToast]);

  return { addToQueue, addedSongIds, loadingSongIds };
}
