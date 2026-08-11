/* Hallmark · component: video-preview-modal · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (AA on paper/ink pairings)
 */

import { useRef, useEffect } from 'react';
import Modal from './Modal';
import AudioPlayer from './AudioPlayer';
import { Film, Music, Mic } from 'lucide-react';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number;
  songTitle: string;
  separationStatus?: string | null;
}

export default function VideoPreviewModal({
  isOpen,
  onClose,
  songId,
  songTitle,
  separationStatus,
}: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MV 预览">
      <div className="space-y-sm">
        <div className="flex items-center gap-xs">
          <Film className="w-4 h-4 text-accent" />
          <p className="text-sm text-ink-2 truncate" title={songTitle}>
            {songTitle}
          </p>
        </div>

        <div className="relative w-full h-[70vh] bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={`/api/songs/${songId}/audio`}
            controls
            autoPlay
            className="w-full h-full object-contain"
            preload="metadata"
          >
            您的浏览器不支持视频播放
          </video>
        </div>

        {separationStatus === 'completed' && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-xs">
              <div className="flex items-center gap-xs mb-xs">
                <Music className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-ink-3 uppercase tracking-wide">伴奏</span>
              </div>
              <AudioPlayer
                src={`/api/songs/${songId}/instrumental`}
                label="伴奏音频"
                accentColor="instrumental"
              />
            </div>

            <div className="border-t border-border" />
            <div className="space-y-xs">
              <div className="flex items-center gap-xs mb-xs">
                <Mic className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-medium text-ink-3 uppercase tracking-wide">人声</span>
              </div>
              <AudioPlayer
                src={`/api/songs/${songId}/vocals`}
                label="人声音频"
                accentColor="vocals"
              />
            </div>
          </>
        )}

        {separationStatus && separationStatus !== 'completed' && (
          <div className="text-xs text-ink-3 bg-paper-2 rounded-md p-sm border border-border">
            {separationStatus === 'processing'
              ? '人声分离处理中，完成后可试听伴奏和人声。'
              : '该歌曲尚未完成人声分离，仅可预览原视频。'}
          </div>
        )}
      </div>
    </Modal>
  );
}
