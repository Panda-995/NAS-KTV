/* Hallmark · genre: editorial · component: ConnectionBanner · mobile-h5
 * states: default · error（断线）· loading（重连中）
 */

import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { wsClient } from '../ws/client';
import { useRoomStore } from '../stores/room';

export default function ConnectionBanner() {
  const roomCode = useRoomStore(s => s.roomCode);
  const [status, setStatus] = useState(wsClient.getStatus());

  useEffect(() => {
    const off = wsClient.onStatusChange(setStatus);
    return off;
  }, []);

  if (!roomCode || status === 'connected') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-sticky flex items-center justify-center gap-sm py-sm px-md text-sm"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + var(--space-sm))',
        backgroundColor: status === 'connecting' ? 'var(--color-accent)' : 'var(--color-danger)',
        color: 'var(--color-on-accent)',
      }}
    >
      {status === 'connecting' ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <WifiOff size={14} />
      )}
      <span>
        {status === 'connecting' ? '正在连接…' : '连接中断，正在重连…'}
      </span>
    </div>
  );
}
