/* Hallmark · component: lyrics-display · genre: atmospheric · theme: Midnight
 * 两行歌词 slot 循环复用，交替爬升：上行靠左、下行靠右，
 * 当前句按句号奇偶在上/下行交替，形成左→右→左之字错位；
 * 超长歌词不换行，横向滚动显示（marquee），渐变背景随文本同步滚动
 */
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import type { LyricLine } from '../hooks/usePlayer';

interface LyricsDisplayProps {
  lines: LyricLine[];
  currentIndex: number;
  currentTime: number;
  duration?: number;
  lyricOffsetMs?: number;
}

const css = `
/* 歌词容器：bottom 避开底部播放进度条（np-progress 约占底部 64~160px 区域） */
.lyrics-display {
  position: absolute;
  bottom: 190px;
  left: 0;
  right: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 48px;
  pointer-events: none;
  padding: 0 80px;
}

/* 歌词行基础：统一字号，不换行，超出部分由内层滚动展示 */
.lyrics-slot {
  max-width: 1200px;
  font-family: "Microsoft YaHei", "Source Han Sans SC", "Noto Sans SC", sans-serif;
  font-size: clamp(36px, 4vw, 52px);
  font-weight: 700;
  line-height: 1.4;
  overflow: hidden;
  white-space: nowrap;
}

/* 上行（slot0，偶数句为当前句）：靠左 */
.lyrics-display > .lyrics-slot:first-child {
  align-self: flex-start;
  text-align: left;
}

/* 下行（slot1，奇数句为当前句）：靠右 */
.lyrics-display > .lyrics-slot:last-child {
  align-self: flex-end;
  text-align: right;
}

/* 内层文本：跟随滚动动画（渐变背景也随文本移动） */
.lyrics-inner {
  display: inline-block;
  will-change: transform;
}

/* 超长歌词：横向滚动（位移与时长由 JS 测量后通过 CSS 变量注入） */
.lyrics-slot.marquee .lyrics-inner {
  animation: lyrics-marquee var(--marquee-duration, 12s) linear infinite;
  animation-delay: 1.5s;
}

@keyframes lyrics-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(var(--marquee-offset, -200px)); }
}

/* 当前句：白色，渐变高亮（与预览同字号，仅以颜色区分） */
.lyrics-slot.current .lyrics-inner {
  background: linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-2) var(--lyric-progress, 0%));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter: drop-shadow(0 0 20px var(--color-glow));
}

/* 已唱完的句子：保持渐变色 */
.lyrics-slot.completed .lyrics-inner {
  background: linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-2) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 下一句预览：灰色（同字号） */
.lyrics-slot.preview {
  color: var(--color-ink-3);
}

/* 空行占位 */
.lyrics-slot.empty {
  visibility: hidden;
}
`;

/**
 * 单行歌词 slot：仅「正在播放的当前句」在文本超宽时测量溢出距离并注入横向滚动参数（位移/时长）。
 * 预览句/已唱完句不滚动，保持静止展示。
 * 渐变背景放在内层 span 上，随文本 transform 一起滚动，避免 background-clip 错位。
 */
function LyricSlot({ text, className, style }: { text: string; className: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [marqueeStyle, setMarqueeStyle] = useState<React.CSSProperties>({});

  const isCurrent = className.includes('current');

  useLayoutEffect(() => {
    // 非当前句不滚动：预览/已唱完保持静止
    if (!isCurrent) {
      setOverflowing(false);
      setMarqueeStyle({});
      return;
    }
    const el = ref.current;
    const inner = el?.firstElementChild as HTMLElement | null;
    if (!el || !inner) return;
    // 溢出距离 = 文本实际宽度 - 容器可视宽度（预留一小段间隙）
    const distance = inner.scrollWidth - el.clientWidth;
    if (distance > 8) {
      const travel = distance + 24;
      // 滚动速度约 55px/s，时长限制在 8~30s，保证可读又不拖沓
      const duration = Math.max(8, Math.min(30, travel / 55));
      setOverflowing(true);
      setMarqueeStyle({
        '--marquee-offset': `-${travel}px`,
        '--marquee-duration': `${duration.toFixed(1)}s`,
      } as React.CSSProperties);
    } else {
      setOverflowing(false);
      setMarqueeStyle({});
    }
  }, [text, className, isCurrent]);

  return (
    <div
      ref={ref}
      className={`${className}${overflowing ? ' marquee' : ''}`}
      style={style}
    >
      <span className="lyrics-inner" style={overflowing ? marqueeStyle : undefined}>
        {text}
      </span>
    </div>
  );
}

export default function LyricsDisplay({ lines, currentIndex, currentTime, duration = 0, lyricOffsetMs = 0 }: LyricsDisplayProps) {
  const [slot0Text, setSlot0Text] = useState('');
  const [slot1Text, setSlot1Text] = useState('');
  const [slot0Class, setSlot0Class] = useState('lyrics-slot empty');
  const [slot1Class, setSlot1Class] = useState('lyrics-slot empty');
  const [slot0Progress, setSlot0Progress] = useState(0);
  const [slot1Progress, setSlot1Progress] = useState(0);

  const prevIndexRef = useRef(currentIndex);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const currentLine = lines[currentIndex];
    const nextLine = lines[currentIndex + 1];

    // 行切换已由 usePlayer 按 currentTime + lyricOffsetMs/1000 匹配，
    // 行内渐变进度同样叠加偏移，保持换行与渐变一致
    const adjustedTime = currentTime + lyricOffsetMs / 1000;

    // 计算当前行的时间范围
    const lineStart = currentLine?.time ?? 0;
    const lineEnd = nextLine?.time ?? (lineStart + 4000);
    const lineDuration = lineEnd - lineStart;

    // 计算当前行进度 (0~1)
    const lineProgress = lineDuration > 0
      ? Math.max(0, Math.min(1, (adjustedTime - lineStart) / lineDuration))
      : 0;

    // 判断是否需要切换 slot
    const isNewLine = prevIndexRef.current !== currentIndex;
    if (isNewLine) {
      prevIndexRef.current = currentIndex;
      progressRef.current = 0;
    }

    // 确定哪个 slot 显示当前句，哪个显示下一句
    // 偶数句：slot0=当前，slot1=下一句
    // 奇数句：slot1=当前，slot0=下一句
    const useSlot0ForCurrent = currentIndex % 2 === 0;

    if (useSlot0ForCurrent) {
      // slot0 显示当前句
      setSlot0Text(currentLine?.text || '...');
      setSlot0Class(`lyrics-slot ${lineProgress >= 1 ? 'completed' : 'current'}`);
      setSlot0Progress(lineProgress * 100);

      // slot1 显示下一句
      if (nextLine) {
        setSlot1Text(nextLine.text);
        setSlot1Class('lyrics-slot preview');
      } else {
        setSlot1Text('');
        setSlot1Class('lyrics-slot empty');
      }
      setSlot1Progress(0);
    } else {
      // slot1 显示当前句
      setSlot1Text(currentLine?.text || '...');
      setSlot1Class(`lyrics-slot ${lineProgress >= 1 ? 'completed' : 'current'}`);
      setSlot1Progress(lineProgress * 100);

      // slot0 显示下一句
      if (nextLine) {
        setSlot0Text(nextLine.text);
        setSlot0Class('lyrics-slot preview');
      } else {
        setSlot0Text('');
        setSlot0Class('lyrics-slot empty');
      }
      setSlot0Progress(0);
    }
  }, [lines, currentIndex, currentTime, lyricOffsetMs]);

  return (
    <>
      <style>{css}</style>

      {/* 歌词区域 */}
      <div className="lyrics-display">
        <LyricSlot
          text={slot0Text}
          className={slot0Class}
          style={slot0Class.includes('current') ? { '--lyric-progress': `${slot0Progress}%` } as React.CSSProperties : undefined}
        />
        <LyricSlot
          text={slot1Text}
          className={slot1Class}
          style={slot1Class.includes('current') ? { '--lyric-progress': `${slot1Progress}%` } as React.CSSProperties : undefined}
        />
      </div>
    </>
  );
}
