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

interface CrossOriginMedia {
  crossOrigin: string | null;
  preload: string;
}

export function prepareCrossOriginMedia(media: CrossOriginMedia): void {
  media.crossOrigin = 'anonymous';
  media.preload = 'auto';
}
