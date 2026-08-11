/* Hallmark · genre: editorial · theme: Garden · Ecosystem Index · Home page
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * designed-as-app
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { songsApi, categoriesApi } from '../api';
import { useRoomStore } from '../stores/room';
import BottomNav from '../components/BottomNav';
import NowPlayingBar from '../components/NowPlayingBar';
import SongItem from '../components/SongItem';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import type { Song, CategoryGroup } from '@nasktv/shared';
import { Search, Flame, ChevronRight, Disc3, LayoutGrid, Shuffle, X } from 'lucide-react';
import { saveNickname, randomNickname } from '../utils/nickname';

const css = `
/* Hallmark · genre: editorial · theme: Garden · Ecosystem Index · Home page */

.home-hero {
  padding: calc(env(safe-area-inset-top) + var(--space-2xl)) var(--space-xl) var(--space-xl);
  background-color: var(--color-paper-2);
  border-bottom: 1px solid var(--color-border);
}

.home-room-code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.home-greeting {
  font-family: var(--font-display);
  font-size: var(--text-display);
  line-height: 1.15;
  color: var(--color-ink);
  margin-top: var(--space-sm);
  overflow-wrap: anywhere;
  min-width: 0;
}

.home-sub {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ink-3);
  margin-top: var(--space-sm);
}

.home-search {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 48px;
  padding: var(--space-sm) var(--space-lg);
  background-color: var(--color-paper);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-ink-3);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.home-search:hover {
  border-color: var(--color-ink-3);
}
.home-search:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.home-search:active {
  transform: scale(0.99);
}

.home-section-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-ink);
}

.home-cat-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
  min-height: 88px;
  padding: var(--space-md);
  text-align: left;
  background-color: var(--color-paper-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.home-cat-card:hover {
  background-color: var(--color-paper-3);
  border-color: var(--color-ink-3);
}
.home-cat-card:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.home-cat-card:active {
  transform: scale(0.98);
}

.home-cat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}

.home-cat-name {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-ink);
  line-height: 1.4;
}

.home-cat-count {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-ink-3);
}

.home-more {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  min-height: 44px;
  padding: 0 var(--space-sm);
  font-size: var(--text-sm);
  color: var(--color-accent);
  transition: color var(--dur-fast) var(--ease-out);
}
.home-more:hover {
  color: var(--color-accent-hover);
}
.home-more:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.home-hot-list {
  display: flex;
  flex-direction: column;
  padding: 0 var(--space-xl);
}

/* 昵称按钮（可点击打开编辑） */
.home-nick-btn {
  display: inline;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  transition: color var(--dur-fast) var(--ease-out);
}
.home-nick-btn:hover {
  color: var(--color-accent);
}
.home-nick-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* 昵称编辑底部弹层 */
.home-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background-color: color-mix(in oklch, var(--color-ink) 45%, transparent);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-base) var(--ease-out);
}
.home-sheet-overlay--open {
  opacity: 1;
  pointer-events: auto;
}

.home-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-modal);
  padding: var(--space-sm) var(--space-lg) calc(env(safe-area-inset-bottom) + var(--space-lg));
  background-color: var(--color-paper);
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transform: translateY(100%);
  visibility: hidden;
  transition: transform var(--dur-base) var(--ease-out),
              visibility 0s var(--dur-base);
}
.home-sheet--open {
  transform: translateY(0);
  visibility: visible;
  transition: transform var(--dur-base) var(--ease-out);
}

.home-sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto var(--space-md);
  border-radius: var(--radius-full);
  background-color: var(--color-border);
}

.home-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}
.home-sheet-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--color-ink);
}
.home-sheet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-full);
  background-color: transparent;
  color: var(--color-ink-2);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out);
}
.home-sheet-close:hover {
  background-color: var(--color-paper-2);
  color: var(--color-ink);
}
.home-sheet-close:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.home-sheet-close:active {
  transform: scale(0.92);
}

.home-sheet-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.home-sheet-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-md);
  font-size: var(--text-base);
  font-family: var(--font-body);
  background-color: var(--color-paper);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-ink);
  outline: none;
  min-height: 44px;
  transition: border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out);
}
.home-sheet-input::placeholder {
  color: var(--color-ink-3);
}
.home-sheet-input:hover {
  border-color: var(--color-ink-3);
}
.home-sheet-input:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.home-sheet-rand-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  height: 44px;
  padding: 0 var(--space-md);
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-ink-2);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  cursor: pointer;
  flex-shrink: 0;
  transition: color var(--dur-fast) var(--ease-out),
              background-color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.home-sheet-rand-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background-color: var(--color-accent-soft);
}
.home-sheet-rand-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.home-sheet-rand-btn:active {
  transform: scale(0.95);
}

.home-sheet-save-btn {
  width: 100%;
  min-height: 48px;
  padding: var(--space-md);
  font-size: var(--text-base);
  font-weight: 500;
  font-family: var(--font-body);
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.home-sheet-save-btn:hover {
  background-color: var(--color-accent-hover);
}
.home-sheet-save-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.home-sheet-save-btn:active {
  transform: scale(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .home-search, .home-cat-card, .home-more,
  .home-nick-btn, .home-sheet-overlay, .home-sheet,
  .home-sheet-close, .home-sheet-input, .home-sheet-rand-btn, .home-sheet-save-btn {
    transition-duration: 0.01ms !important;
  }
}
`;

function CategoryCardSkeleton() {
  return (
    <div
      className="p-md rounded-lg border"
      style={{
        backgroundColor: 'var(--color-paper-2)',
        borderColor: 'var(--color-border)',
        transitionDuration: 'var(--dur-base)',
      }}
    >
      <div
        className="h-4 w-3/5 rounded-sm skeleton-pulse"
        style={{ backgroundColor: 'var(--color-paper-3)' }}
      />
      <div
        className="h-3 w-2/5 mt-sm rounded-sm skeleton-pulse"
        style={{ backgroundColor: 'var(--color-paper-3)', animationDelay: '100ms' }}
      />
    </div>
  );
}

function GreetingSkeleton() {
  return (
    <div
      className="px-xl pt-3xl pb-xl"
      style={{ backgroundColor: 'var(--color-paper-2)' }}
    >
      <div
        className="h-3 w-24 rounded-sm skeleton-pulse"
        style={{ backgroundColor: 'var(--color-paper-3)' }}
      />
      <div
        className="h-8 w-44 mt-sm rounded-sm skeleton-pulse"
        style={{ backgroundColor: 'var(--color-paper-3)', animationDelay: '80ms' }}
      />
      <div
        className="h-3 w-32 mt-sm rounded-sm skeleton-pulse"
        style={{ backgroundColor: 'var(--color-paper-3)', animationDelay: '160ms' }}
      />
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { roomCode, nickname, setNickname } = useRoomStore();
  const [hotSongs, setHotSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editNickOpen, setEditNickOpen] = useState(false);
  const [editNick, setEditNick] = useState(nickname);

  useEffect(() => {
    async function load() {
      try {
        const [hots, cats] = await Promise.all([
          songsApi.getHotSongs(10).catch(() => []),
          categoriesApi.getCategories().catch(() => []),
        ]);
        setHotSongs(hots);
        setCategories(cats);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayCategories = categories.slice(0, 4);

  const handleOpenNick = () => {
    setEditNick(nickname || randomNickname());
    setEditNickOpen(true);
  };

  const handleRandomNick = () => {
    setEditNick(randomNickname());
  };

  const handleSaveNick = () => {
    const name = editNick.trim() || randomNickname();
    saveNickname(name);
    setNickname(name);
    setEditNickOpen(false);
  };

  return (
    <>
      <style>{css}</style>
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-paper)', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))' }}
      >
        {loading ? (
          <GreetingSkeleton />
        ) : (
          <header className="home-hero">
            <span className="home-room-code">房间 · {roomCode}</span>
            <h1 className="home-greeting">
              你好，
              <button
                onClick={handleOpenNick}
                className="home-nick-btn"
                aria-label="修改昵称"
                tabIndex={0}
                role="button"
                type="button"
              >
                {nickname}
              </button>
            </h1>
            <p className="home-sub">想唱哪一首？搜索或浏览分类开始点歌</p>
          </header>
        )}

        <div className="px-xl py-lg">
          <button
            onClick={() => navigate('/search')}
            className="home-search"
            aria-label="搜索歌曲或歌手"
            type="button"
          >
            <Search size={20} strokeWidth={1.5} />
            <span style={{ fontSize: 'var(--text-base)' }}>搜索歌曲、歌手</span>
          </button>
        </div>

        <section className="px-xl mb-xl">
          <div className="flex items-center justify-between mb-md">
            <h2 className="home-section-title">
              <LayoutGrid
                size={18}
                strokeWidth={1.5}
                style={{ color: 'var(--color-accent)' }}
              />
              分类浏览
            </h2>
            <Link
              to="/categories"
              className="home-more"
            >
              更多 <ChevronRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <CategoryCardSkeleton key={i} />
              ))}
            </div>
          ) : displayCategories.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="暂无分类"
              description="管理员尚未添加分类，请稍后再来"
            />
          ) : (
            <div className="grid grid-cols-2" style={{ gap: 'var(--space-md)' }}>
              {displayCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/category/${cat.id}`)}
                  className="home-cat-card"
                  role="link"
                  tabIndex={0}
                  type="button"
                >
                  <span className="home-cat-icon" aria-hidden="true">
                    <Disc3 size={18} strokeWidth={1.6} />
                  </span>
                  <span>
                    <span className="home-cat-name block">{cat.name}</span>
                    <span className="home-cat-count">{cat.items?.length || 0} 个分类</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mb-lg">
          <div className="flex items-center gap-sm px-xl mb-md">
            <h2 className="home-section-title">
              <Flame
                size={18}
                strokeWidth={1.5}
                style={{ color: 'var(--color-accent)' }}
              />
              热门推荐
            </h2>
          </div>

          {loading ? (
            <div className="px-xl">
              <Skeleton lines={5} />
            </div>
          ) : hotSongs.length === 0 ? (
            <EmptyState
              icon={Disc3}
              title="暂无热门歌曲"
              description="还没有播放记录，去搜索点一首吧"
              action={{ label: '去搜索', onClick: () => navigate('/search') }}
            />
          ) : (
            <div className="home-hot-list">
              {hotSongs.map(song => (
                <SongItem key={song.id} song={song} />
              ))}
            </div>
          )}
        </section>

        {/* 昵称编辑弹层 */}
        <div
          className={`home-sheet-overlay${editNickOpen ? ' home-sheet-overlay--open' : ''}`}
          onClick={() => setEditNickOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`home-sheet${editNickOpen ? ' home-sheet--open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="修改昵称"
        >
          <div className="home-sheet-handle" aria-hidden="true" />
          <div className="home-sheet-header">
            <span className="home-sheet-title">修改昵称</span>
            <button
              onClick={() => setEditNickOpen(false)}
              className="home-sheet-close"
              aria-label="关闭"
              tabIndex={0}
              role="button"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <div className="home-sheet-row">
            <input
              type="text"
              value={editNick}
              onChange={e => setEditNick(e.target.value)}
              maxLength={20}
              placeholder="输入昵称"
              className="home-sheet-input"
              onKeyDown={e => e.key === 'Enter' && handleSaveNick()}
            />
            <button
              onClick={handleRandomNick}
              className="home-sheet-rand-btn"
              type="button"
              aria-label="随机生成"
            >
              <Shuffle size={14} />
              <span>随机</span>
            </button>
          </div>

          <button
            onClick={handleSaveNick}
            className="home-sheet-save-btn"
            tabIndex={0}
            role="button"
            type="button"
          >
            保存
          </button>
        </div>

        <NowPlayingBar />
        <BottomNav />
      </div>
    </>
  );
}
