import { useEffect, useState } from 'react';
import type { Room, RoomJoinTicket } from '@nasktv/shared';
import { roomsApi } from '../api/rooms';

const REFRESH_EARLY_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * 获取并轮换 TV 当前房间的短期加入票据。
 * 服务端每次签发都会立即废弃上一张票据，因此旧二维码截图不能再次加入。
 */
export function useJoinTicket(room: Room | null, enabled: boolean): RoomJoinTicket | null {
  const [ticket, setTicket] = useState<RoomJoinTicket | null>(null);

  useEffect(() => {
    if (!enabled || !room?.id || !room.deviceId) {
      setTicket(null);
      return;
    }

    let cancelled = false;
    let refreshTimer: number | null = null;
    let firstSuccessfulLoad = true;

    const loadTicket = async () => {
      try {
        const next = await roomsApi.issueJoinTicket(
          room.id,
          room.deviceId,
          firstSuccessfulLoad,
        );
        if (cancelled) return;
        firstSuccessfulLoad = false;
        setTicket(next);
        const expiresAt = new Date(next.expiresAt).getTime();
        const delay = Math.min(
          HEALTH_CHECK_INTERVAL_MS,
          Math.max(
            MIN_REFRESH_DELAY_MS,
            expiresAt - Date.now() - REFRESH_EARLY_MS,
          ),
        );
        refreshTimer = window.setTimeout(loadTicket, delay);
      } catch {
        if (cancelled) return;
        setTicket(null);
        refreshTimer = window.setTimeout(loadTicket, 10_000);
      }
    };

    loadTicket();
    return () => {
      cancelled = true;
      if (refreshTimer != null) window.clearTimeout(refreshTimer);
    };
  }, [enabled, room?.id, room?.deviceId]);

  return ticket;
}
