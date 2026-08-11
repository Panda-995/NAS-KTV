/* Hallmark · genre: atmospheric · component: ConnectionBanner · tv-app
 * states: default · warning（重连中）
 * 断线提示：TV 端无限重连机制下显示"重连中"，避免用户误以为系统卡死
 */

import { useEffect, useState } from 'react';
import { wsClient, type ConnectionStatus } from '../ws/client';
import { useRoomStore } from '../stores/room';

export default function ConnectionBanner() {
  const room = useRoomStore(s => s.room);
  const [status, setStatus] = useState<ConnectionStatus>(() => wsClient.getStatus());

  useEffect(() => {
    const off = wsClient.onStatusChange(setStatus);
    return off;
  }, []);

  // 未注册房间（bootstrap 前）不显示
  if (!room || status === 'connected') return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-md py-sm px-xl text-base font-medium"
      style={{
        backgroundColor: 'var(--color-warning)',
        color: 'var(--color-paper)',
      }}
    >
      <span>{status === 'connecting' ? '正在连接房间…' : '连接中断，正在重连…'}</span>
    </div>
  );
}
