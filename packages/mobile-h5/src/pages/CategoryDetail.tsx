/* Hallmark · genre: editorial · theme: Garden · Feature Stack · CategoryDetail page
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { categoriesApi, songsApi } from '../api';
import BottomNav from '../components/BottomNav';
import SongList from '../components/SongList';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import type { CategoryGroup, CategoryItem, Song } from '@nasktv/shared';
import { ArrowLeft, ListMusic } from 'lucide-react';

const css = `
/* Hallmark · genre: editorial · theme: Garden · Feature Stack · CategoryDetail page */

.cd-header {
  padding: calc(env(safe-area-inset-top) + var(--space-2xl)) var(--space-xl) var(--space-xl);
  background-color: var(--color-paper-2);
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--dur-base) var(--ease-out);
}

.cd-back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0;
  margin-bottom: var(--space-md);
  min-height: 44px;
  min-width: 44px;
  border: none;
  background: transparent;
  color: var(--color-ink-2);
  font-family: var(--font-body);
  font-size: var(--text-base);
  cursor: pointer;
  outline: none;
  transition: color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.cd-back-btn:hover {
  color: var(--color-ink);
}

.cd-back-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.cd-back-btn:active {
  transform: translateX(-2px);
  color: var(--color-accent);
}

.cd-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--color-ink);
  font-weight: 400;
  line-height: 1.2;
  margin: 0;
}

.cd-sticky-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background-color: color-mix(in oklab, var(--color-paper) 92%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-sm) 0;
}

.cd-pills-scroll {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-xl);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cd-pills-scroll::-webkit-scrollbar {
  display: none;
}

.cd-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  min-height: 44px;
  white-space: nowrap;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background-color: var(--color-paper-2);
  color: var(--color-ink-2);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: background-color var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out);
}

.cd-pill:hover {
  background-color: var(--color-paper-3);
  color: var(--color-ink);
  border-color: var(--color-focus);
}

.cd-pill:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.cd-pill:active {
  transform: scale(0.96);
}

.cd-pill--active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px var(--color-accent-soft);
}

.cd-pill--active:hover {
  background-color: var(--color-accent-hover);
  color: var(--color-on-accent);
  border-color: var(--color-accent-hover);
}

.cd-pill--disabled,
.cd-pill[data-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.cd-pill[data-state="loading"] {
  animation: cd-pulse 1.5s var(--ease-in-out) infinite;
}

.cd-pill[data-state="error"] {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.cd-pill[data-state="success"] {
  border-color: var(--color-success);
  color: var(--color-success);
}

@keyframes cd-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.cd-songs-area {
  padding: var(--space-lg) var(--space-xl);
}

.cd-loading-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md) 0;
}

.cd-count-hint {
  padding: 0 var(--space-xl);
  padding-bottom: var(--space-sm);
  color: var(--color-ink-3);
  font-size: var(--text-sm);
  letter-spacing: 0.02em;
}
`;

export default function CategoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState<CategoryGroup | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [songsLoading, setSongsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        const cats = await categoriesApi.getCategories();
        if (cancelled) return;
        const cat = cats.find(c => c.id === parseInt(id!));
        setCategory(cat || null);
        if (cat?.items && cat.items.length > 0) {
          const paramItemId = searchParams.get('itemId');
          const matched = paramItemId
            ? cat.items.find((i: CategoryItem) => i.id === parseInt(paramItemId))
            : null;
          setSelectedItemId(matched ? matched.id : cat.items[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, searchParams]);

  useEffect(() => {
    if (selectedItemId === null) return;
    let cancelled = false;
    const currentId = selectedItemId;
    async function loadSongs() {
      setSongsLoading(true);
      try {
        const result = await songsApi.getSongsByCategory(currentId, 1, 50);
        if (cancelled) return;
        setSongs(result.items);
      } finally {
        if (!cancelled) setSongsLoading(false);
      }
    }
    loadSongs();
    return () => { cancelled = true; };
  }, [selectedItemId]);

  const selectedItem = category?.items?.find((i: CategoryItem) => i.id === selectedItemId);

  return (
    <>
      <style>{css}</style>
      <div
        className="min-h-screen"
        style={{ backgroundColor: 'var(--color-paper)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
      >
        {loading ? (
          <>
            <div className="cd-header">
              <div
                className="cd-skeleton-line"
                style={{
                  width: 64,
                  height: 20,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-paper-3)',
                  marginBottom: 'var(--space-md)',
                  animation: 'cd-pulse 1.8s ease-in-out infinite',
                }}
              />
              <div
                className="cd-skeleton-line"
                style={{
                  width: 160,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-paper-3)',
                  animation: 'cd-pulse 1.8s ease-in-out infinite 80ms',
                }}
              />
            </div>
            <div className="cd-loading-wrap" style={{ padding: 'var(--space-sm) var(--space-xl)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 36,
                    width: i === 0 ? 72 : i === 1 ? 56 : 80,
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-paper-3)',
                    animation: `cd-pulse 1.8s ease-in-out infinite ${i * 100}ms`,
                  }}
                />
              ))}
            </div>
            <div className="cd-songs-area">
              <Skeleton lines={5} />
            </div>
          </>
        ) : !category ? (
          <div className="cd-header">
            <button
              onClick={() => navigate(-1)}
              className="cd-back-btn"
              aria-label="返回"
            >
              <ArrowLeft size={20} />
              <span>返回</span>
            </button>
            <EmptyState
              icon={ListMusic}
              title="分类不存在"
              description="该分类可能已被删除，请返回分类列表"
              action={{ label: '返回分类', onClick: () => navigate('/categories') }}
            />
          </div>
        ) : (
          <>
            <div className="cd-header">
              <button
                onClick={() => navigate(-1)}
                className="cd-back-btn"
                aria-label="返回"
              >
                <ArrowLeft size={20} />
                <span>返回</span>
              </button>
              <h1 className="cd-title">{category.name}</h1>
            </div>

            {category.items && category.items.length > 0 && (
              <div
                className="cd-sticky-bar"
                role="tablist"
                aria-label="分类项选择"
              >
                <div className="cd-pills-scroll">
                  {category.items.map((item: CategoryItem) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`cd-pill ${selectedItemId === item.id ? 'cd-pill--active' : ''}`}
                      role="tab"
                      tabIndex={0}
                      aria-selected={selectedItemId === item.id}
                      aria-label={item.name}
                      disabled={songsLoading}
                      data-disabled={songsLoading && selectedItemId !== item.id ? 'true' : undefined}
                      data-state={songsLoading && selectedItemId === item.id ? 'loading' : undefined}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedItem && !songsLoading && songs.length > 0 && (
              <div className="cd-count-hint" aria-live="polite">
                {songs.length} 首歌曲
              </div>
            )}

            <div className="cd-songs-area">
              {songsLoading ? (
                <Skeleton lines={5} />
              ) : songs.length === 0 ? (
                <EmptyState
                  icon={ListMusic}
                  title="暂无歌曲"
                  description={`"${selectedItem?.name || '该分类'}"下还没有歌曲，请切换其他分类试试`}
                />
              ) : (
                <SongList songs={songs} />
              )}
            </div>
          </>
        )}

        <BottomNav />
      </div>
    </>
  );
}
