export type PlayerVocalMode = 'original' | 'instrumental' | 'vocal_assist';

export interface PlaybackPlanOptions {
  hasVideo: boolean;
  mode: PlayerVocalMode;
  instrumentalAvailable: boolean;
  vocalsAvailable: boolean;
  vocalAssistVolume: number;
  instrumentalVolume: number;
}

export interface PlaybackPlan {
  videoMuted: boolean;
  playOriginal: boolean;
  playInstrumental: boolean;
  originalGain: number;
  instrumentalGain: number;
}

interface VolumeMedia {
  volume: number;
}

export interface PlaybackLevelTargets {
  webAudioReady: boolean;
  originalMedia: VolumeMedia | null;
  instrumentalMedia: VolumeMedia | null;
  setOriginalGain: (value: number) => void;
  setInstrumentalGain: (value: number) => void;
}

export function getPlaybackPlan(options: PlaybackPlanOptions): PlaybackPlan {
  const {
    hasVideo,
    mode,
    instrumentalAvailable,
    vocalsAvailable,
    vocalAssistVolume,
    instrumentalVolume,
  } = options;

  if (hasVideo) {
    if (mode === 'instrumental' && instrumentalAvailable) {
      return {
        videoMuted: true,
        playOriginal: false,
        playInstrumental: true,
        originalGain: 0,
        instrumentalGain: instrumentalVolume,
      };
    }

    if (mode === 'vocal_assist' && instrumentalAvailable && vocalsAvailable) {
      return {
        videoMuted: true,
        playOriginal: true,
        playInstrumental: true,
        originalGain: vocalAssistVolume,
        instrumentalGain: instrumentalVolume,
      };
    }

    return {
      videoMuted: false,
      playOriginal: false,
      playInstrumental: false,
      originalGain: 0,
      instrumentalGain: 0,
    };
  }

  if (mode === 'instrumental' && instrumentalAvailable) {
    return {
      videoMuted: true,
      playOriginal: false,
      playInstrumental: true,
      originalGain: 0,
      instrumentalGain: instrumentalVolume,
    };
  }

  if (mode === 'vocal_assist' && instrumentalAvailable) {
    return {
      videoMuted: true,
      playOriginal: true,
      playInstrumental: true,
      originalGain: vocalAssistVolume,
      instrumentalGain: instrumentalVolume,
    };
  }

  return {
    videoMuted: true,
    playOriginal: true,
    playInstrumental: false,
    originalGain: 1,
    instrumentalGain: 0,
  };
}

/**
 * Web Audio 未被 TV 本地手势解锁时，直接用媒体元素音量完成声道混合。
 * 只有 AudioContext 确认可运行后才把音量交给 GainNode，避免 Android WebView
 * 的 suspended AudioContext 接管音轨后出现进度停在 0 秒且无声。
 */
export function applyPlaybackLevels(
  plan: PlaybackPlan,
  targets: PlaybackLevelTargets,
): void {
  const {
    webAudioReady,
    originalMedia,
    instrumentalMedia,
    setOriginalGain,
    setInstrumentalGain,
  } = targets;

  if (webAudioReady) {
    if (originalMedia) originalMedia.volume = 1;
    if (instrumentalMedia) instrumentalMedia.volume = 1;
    setOriginalGain(plan.originalGain);
    setInstrumentalGain(plan.instrumentalGain);
    return;
  }

  if (originalMedia) originalMedia.volume = plan.originalGain;
  if (instrumentalMedia) instrumentalMedia.volume = plan.instrumentalGain;
}

interface CrossOriginMedia {
  crossOrigin: string | null;
  preload: string;
}

export function prepareCrossOriginMedia(media: CrossOriginMedia): void {
  media.crossOrigin = 'anonymous';
  media.preload = 'auto';
}
