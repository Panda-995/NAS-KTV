/* Hallmark · component: audio-player · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (AA on paper/ink pairings)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  label: string;
  accentColor?: 'original' | 'instrumental' | 'vocals';
  compact?: boolean;
  autoPlay?: boolean;
  onPlayChange?: (playing: boolean) => void;
}

function formatSeconds(sec: number): string {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  src,
  label,
  accentColor = 'original',
  compact = false,
  autoPlay = false,
  onPlayChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState(false);

  const accentClass =
    accentColor === 'original'
      ? 'text-ink-2'
      : accentColor === 'instrumental'
        ? 'text-accent'
        : 'text-warning';

  const accentBgClass =
    accentColor === 'original'
      ? 'bg-ink-2'
      : accentColor === 'instrumental'
        ? 'bg-accent'
        : 'bg-warning';

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      onPlayChange?.(false);
    } else {
      setLoad(true);
      void audio
        .play()
        .then(() => {
          setPlaying(true);
          onPlayChange?.(true);
        })
        .catch(() => {
          setError(true);
          setPlaying(false);
          onPlayChange?.(false);
        })
        .finally(() => setLoad(false));
    }
  }, [playing, error, onPlayChange]);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(!muted);
  }, [muted]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = progressRef.current;
      if (!audio || !bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    },
    [duration]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      setDuration(audio.duration);
      setLoad(false);
      setError(false);
    };
    const onEnded = () => {
      setPlaying(false);
      onPlayChange?.(false);
    };
    const onWaiting = () => setLoad(true);
    const onCanPlay = () => setLoad(false);
    const onError = () => {
      setError(true);
      setPlaying(false);
      setLoad(false);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, [onPlayChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(() => toggle(), 100);
      return () => clearTimeout(t);
    }
  }, [autoPlay, toggle]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-xs">
        <audio ref={audioRef} src={src} preload="none" className="hidden" />
        <button
          type="button"
          onClick={toggle}
          disabled={error}
          className={[
            'inline-flex items-center justify-center w-8 h-8 rounded-full border border-border bg-paper',
            'hover:bg-paper-2 active:bg-paper-3 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
          aria-label={playing ? `暂停 ${label}` : `播放 ${label}`}
        >
          {loading ? (
            <div
              className={`w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin ${accentClass}`}
            />
          ) : playing ? (
            <Pause className={`w-3.5 h-3.5 ${accentClass}`} />
          ) : (
            <Play className={`w-3.5 h-3.5 ${accentClass} ml-0.5`} />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md bg-paper-2 overflow-hidden">
      <audio ref={audioRef} src={src} preload="none" className="hidden" />
      <div className="flex items-center gap-sm p-sm">
        <button
          type="button"
          onClick={toggle}
          disabled={error}
          className={[
            'inline-flex items-center justify-center w-10 h-10 rounded-full border border-border bg-paper flex-shrink-0',
            'hover:bg-paper-2 active:bg-paper-3 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
          aria-label={playing ? `暂停 ${label}` : `播放 ${label}`}
        >
          {loading ? (
            <div
              className={`w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ${accentClass}`}
            />
          ) : playing ? (
            <Pause className={`w-4 h-4 ${accentClass}`} />
          ) : (
            <Play className={`w-4 h-4 ${accentClass} ml-0.5`} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-xs">
            <span className="text-sm font-medium text-ink truncate">{label}</span>
            <div className="flex items-center gap-xs flex-shrink-0">
              <button
                type="button"
                onClick={restart}
                className="p-1 rounded text-ink-3 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="重新播放"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded text-ink-3 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={muted ? '取消静音' : '静音'}
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="text-xs text-ink-3 font-mono whitespace-nowrap">
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </span>
            </div>
          </div>

          <div
            ref={progressRef}
            onClick={handleSeek}
            className="relative h-2 bg-paper-3 rounded-full cursor-pointer group"
            role="slider"
            aria-label={`${label} 进度`}
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
          >
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ${accentBgClass}`}
              style={{ width: `${pct}%` }}
            />
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-paper border-2 opacity-0 group-hover:opacity-100 transition-opacity ${accentBgClass.replace('bg-', 'border-')}`}
              style={{ left: `calc(${pct}% - 6px)` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="px-sm pb-sm">
          <span className="text-xs text-danger">音频加载失败，请检查文件是否存在</span>
        </div>
      )}
    </div>
  );
}
