import { useCallback, useMemo } from 'react';
import { useRoomStore } from '../stores/room';
import { useQueueStore } from '../stores/queue';
import { queueApi } from '../api/queue';

/**
 * 歌曲在待播队列中的状态：是否已添加、是否已是最前一首，以及一键顶歌。
 * 队列以 WebSocket QUEUE_UPDATED 实时同步，切歌/移除后自动恢复「未添加」。
 */
export function useQueueSong(songId: number) {
  const { queue } = useQueueStore();
  const { roomId, sessionToken } = useRoomStore();

  const pending = useMemo(
    () =>
      queue
        .filter(q => q.status === 'pending')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [queue]
  );

  const mineInQueue = useMemo(
    () =>
      pending
        .filter(q => q.songId === songId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [pending, songId]
  );

  const inQueue = mineInQueue.length > 0;
  const isFirstInQueue = pending.length > 0 && pending[0].songId === songId;

  const topSong = useCallback(async () => {
    if (!roomId || !sessionToken || mineInQueue.length === 0) return;
    await queueApi.topQueueItem(roomId, mineInQueue[0].id, {
      sessionToken,
    });
  }, [roomId, sessionToken, mineInQueue]);

  return { inQueue, isFirstInQueue, topSong };
}
