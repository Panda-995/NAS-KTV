/* Hallmark · component: panel · genre: atmospheric · theme: Midnight · states: 8 */
import { useId } from 'react';

export type ReverbPreset = 'hall' | 'room' | 'stage' | 'off' | 'custom';

interface ReverbPanelProps {
  preset: ReverbPreset;
  wet: number;             // 0~1
  onPresetChange: (p: ReverbPreset) => void;
  onWetChange: (w: number) => void;
  disabled?: boolean;
}

const presetOptions: { preset: ReverbPreset; label: string }[] = [
  { preset: 'hall', label: '大厅' },
  { preset: 'room', label: '房间' },
  { preset: 'stage', label: '舞台' },
  { preset: 'custom', label: '自定义' },
  { preset: 'off', label: '关闭' },
];

export default function ReverbPanel({
  preset,
  wet,
  onPresetChange,
  onWetChange,
  disabled = false,
}: ReverbPanelProps) {
  const sliderId = useId();
  const wetPercentage = wet * 100;
  // 预设关闭时滑块禁用
  const isWetDisabled = disabled || preset === 'off';

  return (
    <div
      data-state="default"
      className={`flex flex-col gap-md ${disabled ? 'opacity-50' : ''}`}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <span className="font-display text-base text-ink-2">混响</span>
      </div>

      {/* 预设按钮组（radiogroup 语义）*/}
      <div
        role="radiogroup"
        aria-label="混响预设"
        className="flex gap-sm bg-paper-2 rounded-md p-sm"
      >
        {presetOptions.map((opt) => {
          const active = preset === opt.preset;
          return (
            <button
              key={opt.preset}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPresetChange(opt.preset)}
              disabled={disabled}
              data-focusable
              data-focus-id={`reverb-${opt.preset}`}
              tabIndex={0}
              className={`flex-1 px-md py-sm rounded-md text-base font-medium transition-colors active:scale-[0.98] ${
                active
                  ? 'bg-accent text-paper'
                  : 'text-ink-2 hover:text-ink hover:bg-paper-3 active:bg-paper-3'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* dry/wet 滑块（用 accent-2 紫蓝色，区别于音调滑块）*/}
      <div
        className={`flex flex-col gap-sm ${isWetDisabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="flex items-center justify-between">
          <label
            htmlFor={sliderId}
            className="text-base text-ink-2"
          >
            湿度
          </label>
          <span className="font-mono text-base text-accent-2 tabular-nums">
            {Math.round(wetPercentage)}%
          </span>
        </div>

        <div className="relative h-10 flex items-center">
          {/* 轨道 */}
          <div className="absolute inset-x-0 h-2 bg-paper-3 rounded-full" />

          {/* 填充 */}
          <div
            className="absolute h-2 rounded-full bg-accent-2"
            style={{ width: `${wetPercentage}%` }}
          />

          {/* 滑块手柄 */}
          <div
            aria-hidden="true"
            className="absolute w-7 h-7 rounded-full bg-accent-2 border-2 border-paper shadow-md -translate-x-1/2 pointer-events-none"
            style={{ left: `${wetPercentage}%` }}
          />

          {/* 原生 input 覆盖层 */}
          <input
            id={sliderId}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={wet}
            disabled={isWetDisabled}
            onChange={(e) => onWetChange(Number(e.target.value))}
            data-focusable
            data-focus-id="reverb-wet"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={wet}
            aria-label="混响湿度"
            tabIndex={0}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
