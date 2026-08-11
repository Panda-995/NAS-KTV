/* Hallmark · genre: editorial · theme: Garden · Long Document · ArtistDetail page
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { artistsApi, songsApi } from '../api';
import BottomNav from '../components/BottomNav';
import SongList from '../components/SongList';
import Skeleton from '../components/Skeleton';
import type { Artist, Song } from '@nasktv/shared';
import { ArrowLeft } from 'lucide-react';

const css = `
/* Hallmark · genre: editorial · theme: Garden · Long Document · ArtistDetail page
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

.ad-back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 44px;
  min-width: 44px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-ink-2);
  font-family: var(--font-body);
  font-size: var(--text-base);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
  outline: none;
}
.ad-back:hover {
  color: var(--color-ink);
}
.ad-back:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
.ad-back:active {
  color: var(--color-accent);
  transform: translateX(-2px);
}
.ad-back:disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: not-allowed;
}

.ad-header {
  position: relative;
  padding: calc(env(safe-area-inset-top) + var(--space-2xl)) var(--space-xl) var(--space-xl);
  background-color: var(--color-paper-2);
  border-bottom: 1px solid var(--color-border);
  overflow: hidden;
}

.ad-initial {
  position: absolute;
  right: var(--space-lg);
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-display);
  font-size: 120px;
  line-height: 1;
  color: var(--color-paper-3);
  pointer-events: none;
  user-select: none;
  opacity: 0.7;
}

.ad-artist-name {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  line-height: 1.15;
  color: var(--color-ink);
  font-weight: 400;
  position: relative;
  z-index: 1;
}

.ad-song-count {
  margin-top: var(--space-sm);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ink-3);
  letter-spacing: 0.02em;
  position: relative;
  z-index: 1;
}

.ad-body {
  padding: var(--space-lg) var(--space-xl);
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

.ad-section-label {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-ink-3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: var(--space-md);
}

.ad-skeleton-header {
  padding: calc(env(safe-area-inset-top) + var(--space-2xl)) var(--space-xl) var(--space-xl);
  background-color: var(--color-paper-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.ad-skeleton-header .ad-sk-line {
  height: 24px;
  border-radius: var(--radius-sm);
  background-color: var(--color-paper-3);
}
.ad-skeleton-header .ad-sk-line:first-child {
  width: 60%;
}
.ad-skeleton-header .ad-sk-line:last-child {
  width: 35%;
  height: 14px;
}

@media (prefers-reduced-motion: reduce) {
  .ad-back {
    transition-duration: 0.01ms !important;
  }
}
`;

function HeaderSkeleton() {
  return (
    <div className="ad-skeleton-header" style={{ animation: 'skeleton-pulse 1.8s ease-in-out infinite' }}>
      <div className="ad-sk-line" />
      <div className="ad-sk-line" />
    </div>
  );
}

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!id) return;
    const artistId = parseInt(id);

    async function load() {
      try {
        const [a, s] = await Promise.all([
          artistsApi.getArtistById(artistId),
          songsApi.getSongsByArtist(artistId, 1)
        ]);
        setArtist(a);
        setSongs(s.items);
        setHasMore(s.items.length < s.total);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = await songsApi.getSongsByArtist(parseInt(id!), nextPage);
      setSongs(prev => [...prev, ...result.items]);
      setHasMore(songs.length + result.items.length < result.total);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const initial = artist?.name?.charAt(0)?.toUpperCase() || '';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-paper)' }}>
      <style>{css}</style>

      {loading ? (
        <>
          <HeaderSkeleton />
          <div style={{ padding: `var(--space-lg) var(--space-xl)` }}>
            <Skeleton lines={6} />
          </div>
        </>
      ) : (
        <>
          <header className="ad-header">
            <div
              className="ad-initial"
              aria-hidden="true"
            >
              {initial}
            </div>

            <button
              className="ad-back"
              onClick={() => navigate(-1)}
              role="button"
              tabIndex={0}
              aria-label="返回上一页"
            >
              <ArrowLeft size={20} strokeWidth={2} />
              <span>返回</span>
            </button>

            <h1 className="ad-artist-name">
              {artist?.name || '未知歌手'}
            </h1>

            {artist?.songCount !== undefined && (
              <p className="ad-song-count">
                {artist.songCount} 首歌曲
              </p>
            )}
          </header>

          <section className="ad-body">
            <p className="ad-section-label">歌曲列表</p>
            <SongList
              songs={songs}
              hasMore={hasMore}
              loading={loadingMore}
              onLoadMore={loadMore}
            />
          </section>
        </>
      )}

      <BottomNav />
    </div>
  );
}
