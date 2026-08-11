/* Hallmark · component: slider · genre: atmospheric · theme: Midnight · states: 8 */
import { useId } from 'react';

interface PitchSliderProps {
  value: number;           // 当前音调 -12~+12
  onChange: (v: number) => void;
  disabled?: boolean;
}

// 数值显示文案：0 显示"原调"，正值带 +，负值带 -
function formatPitch(v: number): string {
  if (v === 0) return '原调';
  return v > 0 ? `+${v}` : `${v}`;
}

export default function PitchSlider({ value, onChange, disabled = false }: PitchSliderProps) {
  const sliderId = useId();
  // 0% 对应 -12，50% 对应 0，100% 对应 +12
  const percentage = ((value + 12) / 24) * 100;
  const display = formatPitch(value);

  // 填充条从中心点向当前值延伸：正值用 accent 蓝，负值用 warning 琥珀
  const isPositive = value >= 0;
  const fillWidth = Math.abs(percentage - 50);

  return (
    <div
      data-state="default"
      className={`flex flex-col gap-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={sliderId}
          className="font-display text-base text-ink-2"
        >
          音调
        </label>
        <span
          className={`font-mono text-lg tabular-nums ${
            value === 0
              ? 'text-ink-2'
              : isPositive
                ? 'text-accent'
                : 'text-warning'
          }`}
        >
          {display}
        </span>
      </div>

      {/* 滑块主体 */}
      <div className="flex items-center gap-md">
        <span className="font-mono text-sm text-ink-3 shrink-0">-12</span>

        <div className="relative flex-1 h-12 flex items-center">
          {/* 轨道 */}
          <div className="absolute inset-x-0 h-2 bg-paper-3 rounded-full" />

          {/* 填充条：从中心点向当前值延伸 */}
          <div
            className={`absolute h-2 rounded-full ${isPositive ? 'bg-accent' : 'bg-warning'}`}
            style={
              isPositive
                ? { left: '50%', width: `${fillWidth}%` }
                : { right: '50%', width: `${fillWidth}%` }
            }
          />

          {/* 中心刻度线（原调位置）*/}
          <div
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2 w-px h-4 bg-ink-3"
          />

          {/* 滑块手柄 */}
          <div
            aria-hidden="true"
            className={`absolute w-8 h-8 rounded-full border-2 border-paper shadow-md -translate-x-1/2 pointer-events-none transition-transform ${
              isPositive ? 'bg-accent' : 'bg-warning'
            }`}
            style={{ left: `${percentage}%` }}
          />

          {/* 原生 input 覆盖层（透明，承担交互）*/}
          <input
            id={sliderId}
            type="range"
            min={-12}
            max={12}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            data-focusable
            data-focus-id="pitch-slider"
            role="slider"
            aria-valuemin={-12}
            aria-valuemax={12}
            aria-valuenow={value}
            aria-label="音调"
            tabIndex={0}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        <span className="font-mono text-sm text-ink-3 shrink-0">+12</span>
      </div>
    </div>
  );
}
