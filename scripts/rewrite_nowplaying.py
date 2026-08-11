from pathlib import Path

path = Path('packages/tv-app/src/pages/NowPlaying.tsx')
content = r'''/* Hallmark • genre: atmospheric • macrostructure: video-stage overlay • design-system: design.md • designed-as-app
 * tone: immersive • anchor hue: cool 220° • redesign 2026-08-01 • dual-mode render
 * MV songs → fullscreen video + overlay info; audio songs → lyric-focused stage
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../stores/room';
import { usePlayer, type VocalMode } from '../hooks/usePlayer';
import { useLyrics } from '../hooks/useLyrics';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import { useJoinTicket } from '../hooks/useJoinTicket';
import Lyrics from '../components/Lyrics';
import PlayerControls from '../components/PlayerControls';
import AdvancedControlsPanel from '../components/AdvancedControlsPanel';
import ProgressBar from '../components/ProgressBar';
import RemoteFeedback from '../components/RemoteFeedback';
import { ListMusic, Pause, type LucideIcon } from 'lucide-react';
import client from '../api/client';

const css = `
/* Fullscreen MV stage */
.np-video-full {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: var(--color-black);
  z-index: 0;
}

/* Overlay stage */
.np-stage {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: var(--space-3xl) var(--space-3xl) var(--space-2xl);
  background: linear-gradient(180deg, oklch(10% 0.02 250 / 0.75) 0%, oklch(10% 0.02 250 / 0) 30%);
  pointer-events: none;
}
.np-stage > * { pointer-events: auto; }

.np-stage-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.np-stage-header.is-stage-hidden { opacity: 0; transform: translateY(-16px); }

.np-stage-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 600;
  line-height: 1.15;
  color: var(--color-ink);
  text-shadow: var(--shadow-lyrics);
  overflow-wrap: anywhere;
  min-width: 0;
  max-width: 68%;
}
.np-stage-artist { font-size: var(--text-lg); color: var(--color-ink-2); text-shadow: var(--shadow-lyrics); }
.np-stage-nick { font-size: var(--text-base); color: var(--color-ink-3); text-shadow: var(--shadow-lyrics); }

.np-stage-queue {
  margin-top: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-width: 68%;
}
.np-stage-queue-head { font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--color-ink-3); text-shadow: var(--shadow-lyrics); }
.np-stage-queue-item { display: flex; align-items: baseline; gap: var(--space-md); }
.np-stage-queue-num { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-ink-3); min-width: 2ch; text-shadow: var(--shadow-lyrics); }
.np-stage-queue-title { font-size: var(--text-base); color: var(--color-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: var(--shadow-lyrics); }
.np-stage-queue-empty { font-size: var(--text-sm); color: var(--color-ink-3); text-shadow: var(--shadow-lyrics); }

/* Pause standby */
.np-pause-standby {
  position: fixed;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  width: 200px;
  height: 200px;
  border-radius: var(--radius-full);
  background-color: var(--color-osd);
  backdrop-filter: blur(20px) saturate(150%);
  box-shadow: var(--shadow-osd);
  color: var(--color-accent);
  pointer-events: none;
  animation: np-pause-in var(--dur-base) var(--ease-out) both;
}
.np-pause-text { max-width: 140px; font-family: var(--font-body); font-size: var(--text-xs); font-weight: 600; line-height: 1.4; color: var(--color-ink-2); text-align: center; overflow-wrap: anywhere; }

/* Audio stage overrides */
.np-audio-stage {
  align-items: center;
  text-align: center;
  padding: var(--space-3xl) var(--space-4xl) var(--space-3xl);
  background: linear-gradient(180deg, oklch(10% 0.02 250 / 0.85) 0%, oklch(10% 0.02 250 / 0) 35%),
              linear-gradient(0deg, oklch(10% 0.02 250 / 0.92) 0%, oklch(10% 0.02 250 / 0) 35%);
}
.np-audio-header { align-items: center; max-width: min(72ch, 88%); margin-inline: auto; }
.np-audio-title { font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 700; line-height: 1.08; color: var(--color-ink); text-shadow: var(--shadow-lyrics); overflow-wrap: anywhere; min-width: 0; }
.np-audio-artist { margin-top: var(--space-sm); font-size: var(--text-xl); color: var(--color-ink-2); text-shadow: var(--shadow-lyrics); }
.np-audio-nick { margin-top: var(--space-xs); font-size: var(--text-base); color: var(--color-ink-3); text-shadow: var(--shadow-lyrics); }
.np-audio-lyrics { flex: 1 1 auto; min-height: 0; width: min(96ch, 92%); margin-inline: auto; display: flex; align-items: center; justify-content: center; }
.np-audio-queue { position: absolute; left: var(--space-3xl); bottom: var(--space-3xl); display: flex; flex-direction: column; gap: var(--space-xs); max-width: 24ch; text-align: left; }
.np-audio-queue-head { font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--color-ink-3); text-shadow: var(--shadow-lyrics); }
.np-audio-queue-title { font-size: var(--text-lg); color: var(--color-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: var(--shadow-lyrics); }
.np-audio-queue-artist { font-size: var(--text-base); color: var(--color-ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: var(--shadow-lyrics); }
.np-audio-queue-empty { font-size: var(--text-sm); color: var(--color-ink-3); text-shadow: var(--shadow-lyrics); }
.np-audio-footer { width: min(96ch, 92%); margin-inline: auto; padding-top: var(--space-xl); }
.np-audio-footer-inner { display: flex; flex-direction: column; gap: var(--space-xl); }

@keyframes np-pause-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
`;

export default function NowPlaying() {
  const { queue, currentItem, room, authorized } = useRoomStore();
  const [advancedPanelOpen, setAdvancedPanelOpen] = useState(false);
  const [h5BaseUrl, setH5BaseUrl] = useState('');
  const [feedback, setFeedback] = useState<{ icon?: LucideIcon; text?: string; progress?: number; tick: number } | null>(null);
  const [stageInfoVisible, setStageInfoVisible] = useState(true);
  const navigate = useNavigate();
  const joinTicket = useJoinTicket(room, authorized);

  const showFeedback = useCallback((icon?: LucideIcon, text?: string, progress?: number) => {
    setFeedback({ icon, text, progress, tick: Date.now() });
  }, []);

  useDpadNavigation();

  useEffect(() => {
    client
      .get<{ data: { h5BaseUrl: string } }>('/rooms/h5-url')
      .then((res) => setH5BaseUrl(res.data?.data?.h5BaseUrl || ''))
      .catch(() => {});
  }, []);

  const qrText =
    h5BaseUrl && joinTicket
      ? `${h5BaseUrl.replace(/\/+$/, '')}/join?authorizationCode=${joinTicket.authorizationCode}&joinToken=${encodeURIComponent(joinTicket.joinToken)}`
      : '';

  const qrBadge = qrText ? (
    <div className="qr-badge fixed top-2xl right-2xl z-40 flex flex-col items-center gap-sm rounded-lg border border-border p-md shadow-lg">
      <p className="text-sm text-ink-2 font-medium">手机扫码点歌</p>
      <img
        src={`/api/rooms/qrcode?data=${encodeURIComponent(qrText)}`}
        alt="手机扫码点歌"
        width={112}
        height={112}
        className="rounded-sm bg-white p-xs"
      />
      <p className="text-xs text-ink-3 font-mono tracking-widest">
        {'授权码'}{joinTicket?.authorizationCode ?? '更新中'}
      </p>
    </div>
  ) : null;

  const handleSkip = useCallback(async () => {
    if (!room?.id || !room.deviceId || !currentItem?.id) return;
    try {
      await client.post(`/rooms/${room.id}/queue/${currentItem.id}/skip`, {
        deviceId: room.deviceId,
      });
    } catch (e) {
      console.error('Skip failed:', e);
    }
  }, [room?.id, room?.deviceId, currentItem?.id]);

  const handleComplete = useCallback(async () => {
    if (!room?.id || !room.deviceId || !currentItem?.id) return;
    try {
      await client.post(`/rooms/${room.id}/queue/${currentItem.id}/complete`, {
        deviceId: room.deviceId,
      });
    } catch (e) {
      console.error('Complete failed:', e);
    }
  }, [room?.id, room?.deviceId, currentItem?.id]);

  const { lyrics, loading: lyricsLoading } = useLyrics(currentItem?.songId);

  const isVideo = currentItem?.fileType === 'video';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoSrc = currentItem && isVideo
    ? `/api/songs/${currentItem.songId}/audio`
    : undefined;

  const audioOriginal = currentItem
    ? `/api/songs/${currentItem.songId}/audio`
    : undefined;
  const audioVocals = currentItem && isVideo
    ? `/api/songs/${currentItem.songId}/vocals`
    : undefined;
  const audioInstrumental = currentItem
    ? `/api/songs/${currentItem.songId}/instrumental`
    : undefined;

  const {
    isPlaying,
    currentTime,
    duration,
    vocalMode,
    currentLyricIndex,
    togglePlay,
    seek,
    switchVocalMode,
    pitch,
    reverb,
    reverbPreset,
    vocalAssistVolume,
    setPitch,
    setReverb,
    setReverbPreset,
    setVocalAssistVolume,
  } = usePlayer({
    songId: currentItem?.songId,
    audioOriginal,
    audioInstrumental,
    audioVocals,
    videoSrc,
    videoRef,
    lyrics,
    vocalsFileAvailable: isVideo && currentItem ? !!currentItem.vocalsPath : undefined,
    instrumentalFileAvailable: currentItem ? !!currentItem.instrumentalPath : undefined,
    onSongEnd: () => {
      handleComplete();
    },
    onCommandFeedback: showFeedback,
  });

  useEffect(() => {
    setStageInfoVisible(true);
    if (!isPlaying) return;
    const t = setTimeout(() => setStageInfoVisible(false), 10_000);
    return () => clearTimeout(t);
  }, [currentItem?.songId, isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'MediaAudio': {
          e.preventDefault();
          const modes: VocalMode[] = ['original', 'instrumental', 'vocal_assist'];
          const idx = modes.indexOf(vocalMode);
          const next = modes[(idx + 1) % modes.length];
          switchVocalMode(next);
          break;
        }
        case 'MediaTrackPrevious': {
          e.preventDefault();
          seek(0);
          break;
        }
        case 'MediaTrackNext': {
          e.preventDefault();
          handleSkip();
          break;
        }
        case 'Menu':
        case 'ContextMenu': {
          e.preventDefault();
          setAdvancedPanelOpen((prev) => !prev);
          break;
        }
        case 'Home':
        case 'BrowserHome': {
          e.preventDefault();
          navigate('/browse');
          break;
        }
        default: {
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            const n = Number(e.key);
            if (duration > 0) {
              seek(duration * n * 0.1);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vocalMode, duration, switchVocalMode, seek, handleSkip, navigate]);

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-xl">
        <ListMusic size={96} className="text-ink-3" strokeWidth={1} />
        <p className="text-ink-2 text-2xl">等待点歌...</p>
        <p className="text-ink-3 text-base">请使用手机扫码加入房间并点歌</p>
        {qrBadge}
      </div>
    );
  }

  const pendingQueue = queue.filter((q) => q.status === 'pending');

  return (
    <div className="h-screen bg-paper flex relative overflow-hidden">
      <style>{css}</style>

      <video
        ref={videoRef}
        className={`${isVideo ? 'np-video-full' : 'hidden'}`}
        controls={false}
        playsInline
        muted
        tabIndex={-1}
      />

      {isVideo ? (
        <div className="np-stage">
          <header className={`np-stage-header ${stageInfoVisible ? '' : 'is-stage-hidden'}`}>
            <h1 className="np-stage-title">{currentItem.songTitle}</h1>
            <p className="np-stage-artist">{currentItem.songArtist}</p>
            {currentItem.nickname && (
              <p className="np-stage-nick">点歌人: {currentItem.nickname}</p>
            )}
            <div className="np-stage-queue">
              <p className="np-stage-queue-head">待播</p>
              {pendingQueue.slice(0, 3).map((item, i) => (
                <div key={item.id} className="np-stage-queue-item">
                  <span className="np-stage-queue-num">{i + 1}</span>
                  <span className="np-stage-queue-title">{item.songTitle}</span>
                </div>
              ))}
              {pendingQueue.length === 0 && (
                <p className="np-stage-queue-empty">暂无待播歌曲</p>
              )}
            </div>
          </header>
        </div>
      ) : (
        <div className="np-stage np-audio-stage">
          <header className={`np-stage-header np-audio-header ${stageInfoVisible ? '' : 'is-stage-hidden'}`}>
            <h1 className="np-audio-title">{currentItem.songTitle}</h1>
            <p className="np-audio-artist">{currentItem.songArtist}</p>
            {currentItem.nickname && (
              <p className="np-audio-nick">点歌人: {currentItem.nickname}</p>
            )}
          </header>

          <div className="np-audio-lyrics">
            {lyricsLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-ink-3 text-base">歌词加载中...</p>
              </div>
            ) : (
              <Lyrics
                lines={lyrics}
                currentIndex={currentLyricIndex}
                currentTime={currentTime}
              />
            )}
          </div>

          <div className="np-audio-queue">
            {pendingQueue.length > 0 ? (
              <>
                <p className="np-audio-queue-head">下一首</p>
                <p className="np-audio-queue-title">{pendingQueue[0].songTitle}</p>
                <p className="np-audio-queue-artist">{pendingQueue[0].songArtist}</p>
              </>
            ) : (
              <p className="np-audio-queue-empty">暂无待播歌曲</p>
            )}
          </div>

          <footer className="np-audio-footer">
            <div className="np-audio-footer-inner">
              <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />
              <PlayerControls
                isPlaying={isPlaying}
                vocalMode={vocalMode}
                onPlayPause={togglePlay}
                onSkip={handleSkip}
                onVocalModeChange={switchVocalMode}
                onAdvancedClick={() => setAdvancedPanelOpen(true)}
                pitch={pitch}
                isVideo={isVideo}
              />
            </div>
          </footer>
        </div>
      )}

      <AdvancedControlsPanel
        open={advancedPanelOpen}
        onClose={() => setAdvancedPanelOpen(false)}
        pitch={pitch}
        reverbWet={reverb}
        reverbPreset={reverbPreset}
        vocalAssistVolume={vocalAssistVolume}
        onPitchChange={setPitch}
        onReverbWetChange={setReverb}
        onReverbPresetChange={setReverbPreset}
        onVocalAssistVolumeChange={setVocalAssistVolume}
      />

      {qrBadge}

      {!isPlaying && (
        <div className="np-pause-standby" role="status" aria-label="已暂停">
          <Pause size={48} strokeWidth={1.6} />
          <p className="np-pause-text">已暂停</p>
        </div>
      )}

      <RemoteFeedback
        icon={feedback?.icon ? <feedback.icon size={48} strokeWidth={1.6} /> : undefined}
        progress={feedback?.progress}
        text={feedback?.text}
        tick={feedback?.tick}
      />
    </div>
  );
}
'''
path.write_text(content, encoding='utf-8')
