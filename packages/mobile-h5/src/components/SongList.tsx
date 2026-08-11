/* Hallmark · genre: editorial · component: SongList · mobile-h5
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useEffect, useRef } from 'react';
import type { Song } from '@nasktv/shared';
import SongItem from './SongItem';
import { Loader2 } from 'lucide-react';

interface SongListProps {
  songs: Song[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function SongList({
  songs,
  loading,
  hasMore,
  onLoadMore,
}: SongListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 无限滚动
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: '100px' }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading]);

  if (songs.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-3xl">
        <p className="text-ink-3 text-base">暂无歌曲</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {songs.map((song) => (
        <SongItem
          key={song.id}
          song={song}
        />
      ))}

      {/* 加载更多 sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-md">
          {loading && <Loader2 size={20} className="text-ink-3 animate-spin" />}
        </div>
      )}
    </div>
  );
}
