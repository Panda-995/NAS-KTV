/* Hallmark · component: controls · genre: atmospheric · theme: Midnight · states: 8 */
import { Play, Pause, SkipForward, Music, Music2, Mic } from 'lucide-react';
import type { VocalMode } from '../hooks/usePlayer';

interface PlayerControlsProps {
  isPlaying: boolean;
  vocalMode: VocalMode;
  onPlayPause: () => void;
  onSkip: () => void;
  onVocalModeChange: (mode: VocalMode) => void;
  isVideo?: boolean;     // MV 视频播放时隐藏声道切换（Web Audio 链不生效）
}

const vocalModeOptions: { mode: VocalMode; label: string; icon: typeof Music }[] = [
  { mode: 'original', label: '原声', icon: Music },
  { mode: 'instrumental', label: '伴奏', icon: Music2 },
  { mode: 'vocal_assist', label: '人声辅助', icon: Mic },
];

export default function PlayerControls({
  isPlaying,
  vocalMode,
  onPlayPause,
  onSkip,
  onVocalModeChange,
  isVideo = false,
}: PlayerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2xl">
      {/* 声道切换（MV 视频不适用，隐藏） */}
      {!isVideo && (
      <div className="flex gap-sm bg-paper-2 rounded-full p-sm">
        {vocalModeOptions.map((opt) => {
          const Icon = opt.icon;
          const active = vocalMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => onVocalModeChange(opt.mode)}
              data-focusable
              data-focus-id={`vocal-${opt.mode}`}
              tabIndex={0}
              aria-pressed={active}
              className={`flex items-center gap-sm px-xl py-md rounded-full transition-colors active:scale-[0.98] ${
                active
                  ? 'bg-accent text-paper'
                  : 'text-ink-2 hover:text-ink hover:bg-paper-3 active:bg-paper-3'
              }`}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="text-base font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
      )}

      {/* 播放/暂停 */}
      <button
        type="button"
        onClick={onPlayPause}
        data-focusable
        data-focus-id="play-pause"
        tabIndex={0}
        aria-label={isPlaying ? '暂停' : '播放'}
        className="w-20 h-20 rounded-full bg-accent text-paper flex items-center justify-center hover:bg-accent-hover active:scale-[0.98] transition-colors"
      >
        {isPlaying ? (
          <Pause size={36} fill="currentColor" />
        ) : (
          <Play size={36} fill="currentColor" className="ml-sm" />
        )}
      </button>

      {/* 切歌 */}
      <button
        type="button"
        onClick={onSkip}
        data-focusable
        data-focus-id="skip"
        tabIndex={0}
        aria-label="切歌"
        className="w-16 h-16 rounded-full bg-paper-2 text-ink flex items-center justify-center hover:bg-paper-3 active:scale-[0.98] transition-colors"
      >
        <SkipForward size={28} fill="currentColor" />
      </button>

    </div>
  );
}
