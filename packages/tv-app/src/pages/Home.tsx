/* Hallmark · genre: atmospheric · macrostructure: stage & grid · design-system: design.md · designed-as-app */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Settings } from 'lucide-react';
import { useRoomStore } from '../stores/room';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import LeanbackCard from '../components/LeanbackCard';

const css = `
/* 正在播放 EQ 动画点（transform 动画，reduced-motion 关闭） */
.home-eq {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 24px;
}
.home-eq span {
  width: 4px;
  border-radius: 2px;
  background-color: var(--color-eq);
  transform-origin: bottom;
  animation: home-eq 1s var(--ease-in-out) infinite alternate;
}
.home-eq span:nth-child(1) { height: 12px; }
.home-eq span:nth-child(2) { height: 24px; animation-delay: 0.25s; }
.home-eq span:nth-child(3) { height: 16px; animation-delay: 0.5s; }
@keyframes home-eq {
  from { transform: scaleY(0.35); }
  to { transform: scaleY(1); }
}
@media (prefers-reduced-motion: reduce) {
  .home-eq span { animation: none; }
}
`;

export default function Home() {
  const { queue, roomCode } = useRoomStore();
  const navigate = useNavigate();

  useDpadNavigation();

  // 按歌曲维度去重展示（同一首歌在队列中可能出现多次）
  // 优先保留 playing 状态的记录，便于标记 active
  const songs = useMemo(() => {
    const map = new Map<number, (typeof queue)[number]>();
    for (const item of queue) {
      if (item.songId == null) continue;
      const existing = map.get(item.songId);
      if (!existing || (existing.status !== 'playing' && item.status === 'playing')) {
        map.set(item.songId, item);
      }
    }
    return Array.from(map.values());
  }, [queue]);

  // 正在播放焦点条：当前播放歌曲（无则隐藏）
  const playingSong = queue.find((q) => q.status === 'playing');

  return (
    <div className="min-h-screen bg-paper px-3xl py-2xl">
      <style>{css}</style>

      {/* 顶部栏：标题 + 房间码 chip */}
      <header className="flex items-center justify-between mb-2xl">
        <div className="flex items-baseline gap-xl">
          <h1 className="font-display text-3xl text-ink">歌曲库</h1>
          <span className="font-mono text-sm text-ink-3 tracking-widest">
            {queue.length} 首在列
          </span>
        </div>
        {roomCode && (
          <span className="font-mono text-base text-accent tracking-[0.4em] bg-paper-2 rounded-full px-xl py-sm">
            {roomCode}
          </span>
        )}
        <button
          className="flex items-center gap-sm text-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl px-lg py-sm"
          tabIndex={0}
          role="button"
          onClick={() => navigate('/setup')}
        >
          <Settings className="w-5 h-5" />
          <span className="text-base font-medium">设置</span>
        </button>
      </header>

      {/* 正在播放 hero 条（stage & grid 的 stage 层） */}
      {playingSong && (
        <section
          className="relative overflow-hidden rounded-2xl bg-paper-2 mb-2xl"
          style={{ boxShadow: 'var(--shadow-glow-soft)' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--grad-stage)' }}
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-xl p-2xl">
            <div
              className="w-24 h-24 shrink-0 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--grad-card)' }}
            >
              <Music size={48} className="text-accent" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-accent tracking-[0.35em] mb-sm">
                正在播放
              </p>
              <h2 className="font-display text-2xl text-ink truncate">
                {playingSong.songTitle}
              </h2>
              <p className="text-base text-ink-2 mt-xs truncate">
                {playingSong.songArtist}
                {playingSong.nickname ? ` · 点歌人 ${playingSong.nickname}` : ''}
              </p>
            </div>
            <div className="home-eq shrink-0" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>
      )}

      {/* 歌曲卡片栅格 */}
      {songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5xl gap-xl">
          <Music size={96} className="text-ink-3" strokeWidth={1} />
          <p className="text-ink-2 text-xl">暂无歌曲</p>
          <p className="text-ink-3 text-base">请使用手机扫码加入房间并点歌</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 min-[1280px]:grid-cols-4 min-[1920px]:grid-cols-6 gap-lg">
          {songs.map((song) => (
            <LeanbackCard
              key={song.songId}
              title={song.songTitle}
              subtitle={song.songArtist}
              aspectRatio="1:1"
              active={song.status === 'playing'}
            />
          ))}
        </div>
      )}

      {/* 版本信息（右下角水印） */}
      <div className="fixed bottom-4 left-6 font-mono text-xs text-ink-3 select-none pointer-events-none opacity-70">
        NASKTV v{__APP_VERSION__}
      </div>
    </div>
  );
}
