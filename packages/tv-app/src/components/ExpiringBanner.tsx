/* Hallmark · genre: atmospheric · component: ExpiringBanner · tv-app
 * states: default · warning（≥60s）· error（<60s）
 */

import { useEffect, useState } from 'react';
import { useRoomStore } from '../stores/room';

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} 分 ${String(sec).padStart(2, '0')} 秒`;
}

export default function ExpiringBanner() {
  const { authorized, expiresAt } = useRoomStore();
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!authorized || !expiresAt) return;
    const timer = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [authorized, expiresAt]);

  if (!authorized || !expiresAt) return null;

  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0 || remaining > 5 * 60 * 1000) return null;

  const urgent = remaining < 60 * 1000;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-md py-sm px-xl text-base font-medium"
      style={{
        backgroundColor: urgent ? 'var(--color-danger)' : 'var(--color-warning)',
        color: 'var(--color-paper)',
      }}
    >
      <span>房间授权将于 {formatRemaining(remaining)} 后到期，请及时续期</span>
    </div>
  );
}
