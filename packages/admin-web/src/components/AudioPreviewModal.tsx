/* Hallmark · component: audio-preview-modal · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (AA on paper/ink pairings)
 */

import Modal from './Modal';
import AudioPlayer from './AudioPlayer';
import { Music, Mic, Headphones } from 'lucide-react';

interface AudioPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number;
  songTitle: string;
  separationStatus?: string | null;
}

export default function AudioPreviewModal({
  isOpen,
  onClose,
  songId,
  songTitle,
  separationStatus,
}: AudioPreviewModalProps) {
  if (!isOpen) return null;

  const separated = separationStatus === 'completed';
  const base = `/api/songs/${songId}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="音频试听">
      <div className="space-y-sm">
        <p className="text-sm text-ink-2 truncate" title={songTitle}>
          {songTitle}
        </p>

        <div className="space-y-xs">
          <div className="flex items-center gap-xs mb-xs">
            <Headphones className="w-3.5 h-3.5 text-ink-3" />
            <span className="text-xs font-medium text-ink-3 uppercase tracking-wide">原唱</span>
          </div>
          <AudioPlayer
            src={`${base}/audio`}
            label="原唱音频"
            accentColor="original"
          />
        </div>

        {separated && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-xs">
              <div className="flex items-center gap-xs mb-xs">
                <Music className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-ink-3 uppercase tracking-wide">伴奏</span>
              </div>
              <AudioPlayer
                src={`${base}/instrumental`}
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
                src={`${base}/vocals`}
                label="人声音频"
                accentColor="vocals"
              />
            </div>
          </>
        )}

        {!separated && separationStatus !== 'processing' && (
          <div className="text-xs text-ink-3 bg-paper-2 rounded-md p-sm border border-border">
            该歌曲尚未完成人声分离，仅可试听原唱。分离后可分别试听伴奏和人声。
          </div>
        )}

        {separationStatus === 'processing' && (
          <div className="text-xs text-warning bg-paper-2 rounded-md p-sm border border-border">
            人声分离处理中，请稍后再试听伴奏和人声。
          </div>
        )}
      </div>
    </Modal>
  );
}
