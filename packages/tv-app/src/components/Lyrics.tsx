// Hallmark · component: lyrics · genre: atmospheric · theme: Midnight
// states: default · hover · focus-visible · active · disabled · loading
import { useRef, useEffect, useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { LyricLine } from '../hooks/usePlayer';

interface LyricsProps {
  lines: LyricLine[];
  currentIndex: number;
  currentTime?: number; // 当前播放秒数，用于当前行按进度渐变着色
}

const css = `
/* 对唱排版：只显示上一行 + 当前行，两行固定居中 */
.lyric-duet {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
}
.lyric-row {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
/* 当前行更高行高：容纳放大字号，避免上下被裁剪 */
.lyric-row--current {
  height: 64px;
}
/* 当前行超长：左对齐（跑马灯从左侧起点滚动），避免居中裁剪 */
.lyric-row--marquee {
  justify-content: flex-start;
}

.lyric-inner {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.lyric-seg {
  display: inline-block;
  flex-shrink: 0;
  white-space: nowrap;
  /* 渐变位置由 rAF 逐帧直写，不参与 transition，避免插值延迟 */
  transition: color 0.35s var(--ease-out),
              font-size 0.35s var(--ease-out);
}

.lyric-sep {
  width: 48px;
  flex-shrink: 0;
}

/* 过长歌词横向跑马灯：时长由 JS 按文本宽度设置（--lyric-marquee-dur） */
.lyric-marquee {
  display: flex;
  align-items: center;
  animation: lyric-marquee var(--lyric-marquee-dur, 12s) linear infinite;
  will-change: transform;
}
@keyframes lyric-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .lyric-marquee {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
  .lyric-seg {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function Lyrics({ lines, currentIndex, currentTime = 0 }: LyricsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ lines, currentIndex, currentTime });
  propsRef.current = { lines, currentIndex, currentTime };

  // 对唱排版可见行：上一行（对唱另一方）+ 当前行
  const visibleRows = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= lines.length) return [];
    const rows: { line: LyricLine; index: number; isCurrent: boolean }[] = [];
    if (currentIndex > 0) {
      rows.push({ line: lines[currentIndex - 1], index: currentIndex - 1, isCurrent: false });
    }
    rows.push({ line: lines[currentIndex], index: currentIndex, isCurrent: true });
    return rows;
  }, [lines, currentIndex]);

  // 各行文本是否超出可视宽度（触发横向跑马灯）
  const [overflows, setOverflows] = useState<Record<number, boolean>>({});
  // 跑马灯时长（秒）：随文本宽度自适应，宽文本滚动更慢便于阅读
  const [marqueeDurs, setMarqueeDurs] = useState<Record<number, number>>({});
  useEffect(() => {
    const nextOverflows: Record<number, boolean> = {};
    const nextDurs: Record<number, number> = {};
    for (const { index } of visibleRows) {
      const seg = containerRef.current?.querySelector(
        `[data-lyric-index="${index}"] .lyric-seg`,
      );
      const row = containerRef.current?.querySelector(
        `[data-lyric-index="${index}"]`,
      );
      if (!seg || !row) continue;
      const overflow = seg.scrollWidth > (row as HTMLElement).clientWidth;
      nextOverflows[index] = overflow;
      nextDurs[index] = overflow ? Math.max(10, Math.round(seg.scrollWidth / 50)) : 12;
    }
    setOverflows(nextOverflows);
    setMarqueeDurs(nextDurs);
  }, [visibleRows]);

  // rAF 平滑渐变：渐变位置直接写 DOM，绕开 React 渲染（解决 0.2s 步进导致的卡顿）
  const segRefs = useRef<HTMLSpanElement[]>([]);
  const anchorRef = useRef({ t: 0, ts: 0 });
  const frozenRef = useRef(true);

  // 当前行切换：重新收集渐变元素并锚定
  useEffect(() => {
    segRefs.current = Array.from(
      containerRef.current?.querySelectorAll(
        `[data-lyric-index="${currentIndex}"] .lyric-seg`,
      ) ?? [],
    ) as HTMLSpanElement[];
    anchorRef.current = { t: currentTime, ts: performance.now() };
    frozenRef.current = false;
  }, [currentIndex]);

  // 播放时间推进（约 0.2s 一次）：重置锚点，插值在两次提交间平滑推进
  useEffect(() => {
    anchorRef.current = { t: currentTime, ts: performance.now() };
    frozenRef.current = false;
  }, [currentTime]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const { lines: ls, currentIndex: idx, currentTime: t0 } = propsRef.current;
      if (idx < 0 || segRefs.current.length === 0) return;

      const now = performance.now();
      // 播放推进中锚点每 ~200ms 刷新；超过 400ms 未刷新说明暂停/seek，冻结插值
      if (now - anchorRef.current.ts > 400) {
        frozenRef.current = true;
      }
      const t = frozenRef.current
        ? anchorRef.current.t
        : anchorRef.current.t + (now - anchorRef.current.ts) / 1000;

      const lineStart = ls[idx]?.time ?? 0;
      const lineEnd =
        idx + 1 < ls.length
          ? (ls[idx + 1]?.time ?? lineStart + 5000)
          : lineStart + 5000;
      const progress =
        lineEnd > lineStart
          ? Math.max(0, Math.min(1, (t - lineStart) / (lineEnd - lineStart)))
          : 0;
      const pos = `${(1 - progress) * 100}% 0`;
      for (const el of segRefs.current) {
        el.style.backgroundPosition = pos;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 当前行播放进度 0~1：行起始 ~ 下一行起始（最后一行默认 5s）
  const lineStart = currentIndex >= 0 ? (lines[currentIndex]?.time ?? 0) : 0;
  const lineEnd =
    currentIndex >= 0 && currentIndex + 1 < lines.length
      ? (lines[currentIndex + 1]?.time ?? lineStart + 5000)
      : lineStart + 5000;
  const lineProgress =
    lineEnd > lineStart
      ? Math.max(0, Math.min(1, ((currentTime ?? 0) - lineStart) / (lineEnd - lineStart)))
      : 0;

  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 text-base">暂无歌词</p>
      </div>
    );
  }

  if (visibleRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-ink-3 text-base">等待播放...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <style>{css}</style>

      <div ref={containerRef} className="h-full flex items-center justify-center">
        <div className="lyric-duet">
          {visibleRows.map(({ line, index, isCurrent }) => {
            const showMarquee = overflows[index] ?? false;
            const marqueeDur = marqueeDurs[index] ?? 12;
            const gradStyle = isCurrent
              ? {
                  backgroundImage:
                    'linear-gradient(to right, var(--color-accent) 50%, var(--color-ink) 50%)',
                  backgroundSize: '200% 100%',
                  backgroundRepeat: 'no-repeat',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundPosition: `${(1 - lineProgress) * 100}% 0`,
                }
              : undefined;

            return (
              <div
                key={index}
                className={`lyric-row${isCurrent ? ' lyric-row--current' : ''}${showMarquee ? ' lyric-row--marquee' : ''}`}
                data-lyric-index={index}
              >
                <div className="lyric-inner">
                  <div
                    className={showMarquee ? 'lyric-marquee' : ''}
                    style={
                      showMarquee
                        ? { '--lyric-marquee-dur': `${marqueeDur}s` } as CSSProperties
                        : undefined
                    }
                  >
                    <span
                      className={`lyric-seg ${isCurrent ? 'text-3xl font-display font-semibold' : 'text-lg text-ink-2'}`}
                      style={gradStyle}
                    >
                      {line.text || '...'}
                    </span>
                    {showMarquee && (
                      <>
                        <span className="lyric-sep" />
                        <span
                          className={`lyric-seg ${isCurrent ? 'text-3xl font-display font-semibold' : 'text-lg text-ink-2'}`}
                          style={gradStyle}
                        >
                          {line.text || '...'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
