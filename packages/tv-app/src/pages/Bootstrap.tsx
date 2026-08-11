/* Hallmark · genre: atmospheric · macrostructure: waiting-room · design-system: design.md · designed-as-app */
import { Loader2 } from 'lucide-react';
import { useRoomStore } from '../stores/room';
import client from '../api/client';

// Logo 地址：用运行时后端地址（setApiBaseUrl 已并入 /api 后缀），
// 打包版 WebView 中相对路径会指向 tauri://localhost 导致 404
const apiBase = () => (client.defaults.baseURL || '/api').replace(/\/+$/, '');

const css = `
/* 房间码呼吸光晕（opacity/shadow 动画，reduced-motion 关闭） */
.bootstrap-glow {
  border-radius: var(--radius-2xl);
  animation: bootstrap-pulse 2.4s var(--ease-in-out) infinite;
}
@keyframes bootstrap-pulse {
  0%, 100% { box-shadow: 0 0 24px var(--color-glow); }
  50% { box-shadow: 0 0 48px var(--color-glow); }
}
@media (prefers-reduced-motion: reduce) {
  .bootstrap-glow { animation: none; }
}
`;

export default function Bootstrap() {
  const { room } = useRoomStore();

  if (!room) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-md">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-ink-2 text-lg">正在注册设备...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-xl px-2xl">
      <style>{css}</style>

      <div className="text-center">
        <img
          src={`${apiBase()}/logo`}
          alt=""
          className="w-20 h-20 rounded-2xl object-cover mx-auto mb-xl"
        />
        <h1 className="font-display text-4xl text-ink mb-lg tracking-tight">NASKTV</h1>
        <p className="text-ink-2 text-lg mb-xl">等待管理员授权</p>
      </div>

      <div className="flex items-stretch">
        {/* 焦点：房间码 */}
        <div
          className="bootstrap-glow flex flex-col items-center justify-center bg-paper-2 px-3xl py-3xl text-center"
          style={{ boxShadow: 'var(--shadow-glow-soft)' }}
        >
          <p className="font-mono text-sm text-ink-3 tracking-[0.35em] mb-xl">
            房间码
          </p>
          <p className="font-mono text-5xl text-accent tracking-[0.3em] mb-xl">
            {room.code}
          </p>
          <p className="font-mono text-sm text-ink-3 max-w-[24ch] break-all">
            {room.deviceId}
          </p>
        </div>

      </div>

      <p className="text-ink-3 text-base mt-xl">
        请管理员在后台审核并授权此设备
      </p>
    </div>
  );
}
