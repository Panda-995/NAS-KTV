/* Hallmark · genre: atmospheric · macrostructure: waiting-room · design-system: design.md · designed-as-app
 * states: static (no interactive elements) · contrast: pass (≥7:1 for 10-foot UI)
 */
import { useRoomStore } from '../stores/room';

// Logo 地址：与 API client 保持一致（生产可用 VITE_API_BASE_URL 覆盖）
const LOGO_URL = `${import.meta.env.VITE_API_BASE_URL || '/api'}/logo`;

const css = `
/* 未授权状态点脉冲（opacity 动画，reduced-motion 关闭） */
@keyframes np-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .np-status-dot { animation: none !important; }
}
`;

export default function Unauthorized() {
  const { room } = useRoomStore();

  const expired =
    room?.authorizeType === 'temporary' && !!room?.authorizeExpiresAt;

  return (
    <div className="min-h-screen bg-paper relative overflow-hidden px-4xl py-3xl">
      <style>{css}</style>

      {/* 顶栏：Logo + 字标 + 设备 ID */}
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-sm font-display text-lg text-ink-3 tracking-wide">
          <img
            src={LOGO_URL}
            alt=""
            className="w-6 h-6 rounded-md object-cover"
          />
          NASKTV
        </span>
        {room?.deviceId && (
          <span className="font-mono text-sm text-ink-3 max-w-[36ch] truncate">
            {room.deviceId}
          </span>
        )}
      </header>

      {/* 中央状态区（左对齐不对称排版） */}
      <main className="mt-5xl">
        <div className="flex items-center gap-md mb-xl">
          <span
            className="w-sm h-sm rounded-full bg-danger"
            style={{ animation: 'np-pulse 2s var(--ease-in-out) infinite' }}
            aria-hidden="true"
          />
          <span className="font-mono text-sm text-danger tracking-[0.35em]">
            设备未授权
          </span>
        </div>

        <h1 className="font-display text-3xl text-ink leading-tight max-w-4xl">
          {expired ? '授权已过期，请联系管理员续期' : '授权已被撤销，请联系管理员'}
        </h1>

        <p className="text-lg text-ink-2 mt-xl max-w-2xl leading-relaxed">
          请在管理后台「设备管理」中找到本设备并重新授权，
          授权成功后电视将自动进入主界面。
        </p>
      </main>

      {/* 底部信息带：仅用于管理员识别设备；未授权时不签发 H5 加入二维码。 */}
      <footer className="absolute bottom-3xl left-4xl right-4xl flex items-end justify-between gap-2xl">
        <div
          className="bg-paper-2 rounded-xl px-3xl py-2xl"
          style={{ boxShadow: 'var(--shadow-glow-soft)' }}
        >
          <p className="text-sm text-ink-3 mb-sm">房间码</p>
          <p className="font-mono text-xl text-accent tracking-[0.4em]">
            {room?.code ?? '—'}
          </p>
        </div>

      </footer>
    </div>
  );
}
