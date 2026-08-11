// Hallmark · component: progress · genre: atmospheric · theme: Midnight
// states: default · hover · focus-visible · active · disabled · loading
import { useCallback, useRef } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  showTimes?: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const SEEK_STEP = 5;

export default function ProgressBar({ currentTime, duration, onSeek, showTimes = true }: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLoading = duration <= 0;

  const seekToClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || !onSeek || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - SEEK_STEP));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + SEEK_STEP));
    }
  };

  return (
    <div className="flex items-center gap-md w-full" aria-busy={isLoading}>
      {showTimes && (
        <span className="font-mono text-sm text-ink-2 tabular-nums">
          {formatTime(currentTime)}
        </span>
      )}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          seekToClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) seekToClientX(e.clientX);
        }}
        className={[
          'flex-1 h-2.5 bg-paper-3 rounded-full overflow-hidden cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        ].join(' ')}
      >
        <div
          className="h-full bg-accent rounded-full transition-[width] duration-fast"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showTimes && (
        <span className="font-mono text-sm text-ink-3 tabular-nums">
          {isLoading ? '--:--' : formatTime(duration)}
        </span>
      )}
    </div>
  );
}
