/* Hallmark · genre: editorial · theme: Garden · Lyrics component
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useRef, useEffect, useState } from 'react';

interface LyricLine {
  time: number;
  text: string;
}

interface LyricsProps {
  lines: LyricLine[];
  currentIndex: number;
  currentTime?: number; // 当前播放秒数，用于当前行按进度渐变着色
  playing?: boolean;    // 播放中：本地插值推进进度，消除广播跳变
}

const css = `
.lyric-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.lyric-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-top: var(--space-2xl);
  padding-bottom: var(--space-2xl);
  scrollbar-width: none;
}
.lyric-scroll::-webkit-scrollbar {
  display: none;
}

/* 上下玻璃遮罩：渐变 + 模糊，营造层次感（不阻挡滚动） */
.lyric-fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 44px;
  pointer-events: none;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1;
}
.lyric-fade--top {
  top: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in oklch, var(--color-paper) 88%, transparent) 0%,
    transparent 100%
  );
}
.lyric-fade--bottom {
  bottom: 0;
  background: linear-gradient(
    to top,
    color-mix(in oklch, var(--color-paper) 88%, transparent) 0%,
    transparent 100%
  );
}

.lyric-line {
  font-family: var(--font-body);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-ink-2);
  line-height: 1.6;
  transition: color var(--dur-base) var(--ease-out),
              transform var(--dur-base) var(--ease-out),
              font-size var(--dur-base) var(--ease-out);
}
.lyric-line--current {
  font-size: var(--text-lg);
  font-weight: 600;
  /* 进度渐变着色：已播放部分 accent，未播放部分 ink，随 background-position 平滑过渡 */
  background-image: linear-gradient(
    to right,
    var(--color-accent) 50%,
    var(--color-ink) 50%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  /* 过渡时长 < 插值步进（150ms），避免累积滞后 */
  transition: background-position 0.15s linear;
}
.lyric-line--past {
  color: var(--color-ink-3);
}
@media (prefers-reduced-motion: reduce) {
  .lyric-line {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function Lyrics({ lines, currentIndex, currentTime, playing }: LyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const safeLines = Array.isArray(lines) ? lines : [];

  // 本地插值时钟：TV 广播 currentTime 约每秒一次，若直接使用渐变会每秒跳变。
  // 播放中每 150ms 以「最近广播时间 + 流逝时长」推进，广播到达即校准，无累积漂移。
  const [displayTime, setDisplayTime] = useState(currentTime ?? 0);
  const baseRef = useRef({ t: currentTime ?? 0, at: Date.now() });

  useEffect(() => {
    baseRef.current = { t: currentTime ?? 0, at: Date.now() };
  }, [currentTime]);

  useEffect(() => {
    if (!playing) {
      setDisplayTime(currentTime ?? 0);
      return;
    }
    const id = window.setInterval(() => {
      const { t, at } = baseRef.current;
      setDisplayTime(t + (Date.now() - at) / 1000);
    }, 150);
    return () => window.clearInterval(id);
  }, [playing, currentTime]);

  // 只滚动歌词容器本身，避免 scrollIntoView 波及外层横向 swiper（否则歌词切行会把遥控屏拖回歌词屏）
  useEffect(() => {
    const container = containerRef.current;
    if (!container || currentIndex < 0) return;
    const currentEl = container.querySelector(
      `[data-lyric-index="${currentIndex}"]`,
    );
    if (!currentEl) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = currentEl.getBoundingClientRect();
    const targetTop =
      container.scrollTop +
      (elRect.top - containerRect.top) -
      (containerRect.height - elRect.height) / 2;
    container.scrollTo({ top: targetTop, behavior: 'smooth' });
  }, [currentIndex]);

  // 当前行播放进度 0~1：行起始 ~ 下一行起始（最后一行默认 5s）
  const lineStart = currentIndex >= 0 ? (safeLines[currentIndex]?.time ?? 0) : 0;
  const lineEnd =
    currentIndex >= 0 && currentIndex + 1 < safeLines.length
      ? (safeLines[currentIndex + 1]?.time ?? lineStart + 5000)
      : lineStart + 5000;
  const lineProgress =
    lineEnd > lineStart
      ? Math.max(0, Math.min(1, (displayTime - lineStart) / (lineEnd - lineStart)))
      : 0;

  if (safeLines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-xl">
        <p className="text-ink-3 text-sm">暂无歌词</p>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="lyric-wrap">
        <div
          ref={containerRef}
          className="lyric-scroll"
        >
          <div className="flex flex-col items-center" style={{ gap: 'var(--space-md)' }}>
            {safeLines.map((line, i) => {
              const isCurrent = i === currentIndex;
              const isPast = i < currentIndex;

              return (
                <p
                  key={i}
                  data-lyric-index={i}
                  className={`lyric-line${isCurrent ? ' lyric-line--current' : ''}${isPast ? ' lyric-line--past' : ''}`}
                  style={
                    isCurrent
                      ? { backgroundPosition: `${(1 - lineProgress) * 100}% 0` }
                      : undefined
                  }
                >
                  {line.text || '…'}
                </p>
              );
            })}
          </div>
        </div>
        <div className="lyric-fade lyric-fade--top" aria-hidden="true" />
        <div className="lyric-fade lyric-fade--bottom" aria-hidden="true" />
      </div>
    </>
  );
}
