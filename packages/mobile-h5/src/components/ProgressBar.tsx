/* Hallmark · genre: editorial · theme: Garden · ProgressBar component
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useRef, useState } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const css = `
.np-seek-input {
  appearance: none;
  -webkit-appearance: none;
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 44px;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  touch-action: none;
}
.np-seek-input:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-full);
}
.np-seek-input:disabled {
  cursor: default;
}
`;

export default function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const [dragTime, setDragTime] = useState<number | null>(null);

  const displayTime = dragTime ?? currentTime;
  const max = duration > 0 ? duration : 100;
  const percentage = max > 0 ? Math.min(100, (displayTime / max) * 100) : 0;
  const interactive = typeof onSeek === 'function';

  const commitSeek = (time: number) => {
    setDragTime(null);
    if (durationRef.current > 0 && time > durationRef.current) {
      time = durationRef.current;
    }
    onSeek?.(Math.max(0, time));
  };

  return (
    <>
      <style>{css}</style>
      <div className="flex items-center w-full" style={{ gap: 'var(--space-sm)' }}>
      <span className="font-mono text-xs text-ink-3 tabular-nums">
        {formatTime(displayTime)}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={duration || 100}
        aria-valuenow={Math.min(displayTime, duration || 0)}
        aria-label="播放进度"
        className="flex-1"
        style={{
          height: 6,
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-paper-3)',
          position: 'relative',
        }}
      >
        <div
          className="h-full"
          style={{
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-accent)',
            transform: `scaleX(${percentage / 100})`,
            transformOrigin: 'left',
            transitionDuration: dragTime !== null ? '0s' : 'var(--dur-fast)',
            transitionTimingFunction: 'var(--ease-out)',
          }}
        />
        {interactive && (
          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={Math.min(displayTime, max)}
            aria-label="拖动调整播放进度"
            tabIndex={0}
            onChange={e => {
              const t = Number(e.target.value);
              setDragTime(t);
            }}
            onPointerUp={e => commitSeek(Number((e.target as HTMLInputElement).value))}
            onKeyUp={e => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                commitSeek(Number((e.target as HTMLInputElement).value));
              }
            }}
            className="np-seek-input"
          />
        )}
      </div>
      <span className="font-mono text-xs text-ink-3 tabular-nums">
        {formatTime(duration)}
      </span>
      </div>
    </>
  );
}
