import { useState, useCallback } from 'react';
import { useRoomStore } from '../stores/room';
import { useQueueStore } from '../stores/queue';
import { useToastStore } from '../stores/toast';
import { queueApi } from '../api/queue';
import type { Song } from '@nasktv/shared';

const OPTIMISTIC_TIMEOUT_MS = 5000;
const SUCCESS_FEEDBACK_MS = 2000;

export function useInsertNext() {
  const { roomId, sessionId, sessionToken } = useRoomStore();
  const { addOptimistic, removeOptimistic } = useQueueStore();
  const showToast = useToastStore(s => s.show);
  const [insertedSongIds, setInsertedSongIds] = useState<Set<number>>(new Set());
  const [loadingSongIds, setLoadingSongIds] = useState<Set<number>>(new Set());

  const insertNext = useCallback(async (song: Song) => {
    if (!roomId || !sessionId || !sessionToken) return;
    if (insertedSongIds.has(song.id) || loadingSongIds.has(song.id)) return;

    setLoadingSongIds(prev => new Set(prev).add(song.id));

    const tempId = Date.now() + Math.random();
    addOptimistic({
      id: tempId,
      roomId,
      songId: song.id,
      userSessionId: String(sessionId),
      status: 'pending',
      sortOrder: -999,
      requestedAt: new Date(),
      songTitle: song.title,
      songArtist: song.artist?.name || '未知',
    } as import('@nasktv/shared').QueueListItem);

    let timedOut = false;
    const rollbackTimer = window.setTimeout(() => {
      const stillOptimistic = useQueueStore.getState().queue.some(item => item.id === tempId);
      if (!stillOptimistic) return;
      timedOut = true;
      removeOptimistic(tempId);
      setInsertedSongIds(prev => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      showToast('队列同步超时，请重试', 'error');
    }, OPTIMISTIC_TIMEOUT_MS);

    try {
      await queueApi.insertNext(roomId, {
        songId: song.id,
        sessionToken,
      });
      if (!timedOut) {
        setInsertedSongIds(prev => new Set(prev).add(song.id));
        // 反馈标记短暂保留，实际状态以 WebSocket QUEUE_UPDATED 同步的队列为准
        window.setTimeout(() => {
          setInsertedSongIds(prev => {
            const next = new Set(prev);
            next.delete(song.id);
            return next;
          });
        }, SUCCESS_FEEDBACK_MS);
      }
    } catch (e) {
      window.clearTimeout(rollbackTimer);
      removeOptimistic(tempId);
      // 后端强校验拦截（如"歌曲已在待播队列中"），提示给用户
      const err = e as { response?: { data?: { error?: string } } } | null;
      if (!timedOut) showToast(err?.response?.data?.error || '插队失败', 'error');
    } finally {
      setLoadingSongIds(prev => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  }, [roomId, sessionId, sessionToken, insertedSongIds, loadingSongIds, addOptimistic, removeOptimistic, showToast]);

  return { insertNext, insertedSongIds, loadingSongIds };
}
