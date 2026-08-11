import { useState, useEffect } from 'react';
import { songsApi, type LyricLine } from '../api/songs';

export interface UseLyricsReturn {
  lyrics: LyricLine[];
  loading: boolean;
  error: string | null;
}

/**
 * 拉取指定歌曲的歌词
 *
 * - songId 为 null/undefined/0 时不发起请求，返回空数组
 * - songId 变化时重新拉取
 * - 组件卸载或 songId 变化时取消未完成请求，避免竞态
 */
export function useLyrics(songId: number | null | undefined): UseLyricsReturn {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // songId 无效时不发起请求
    if (!songId) {
      setLyrics([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    songsApi
      .getLyrics(songId, controller.signal)
      .then((data) => {
        // 请求已被取消，忽略响应
        if (controller.signal.aborted) return;
        setLyrics(data);
        setError(null);
      })
      .catch((err) => {
        // 请求已被取消，忽略错误
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        setLyrics([]);
      })
      .finally(() => {
        // 请求已被取消，不更新 loading
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [songId]);

  return { lyrics, loading, error };
}
