// Hallmark · component: card · genre: atmospheric · theme: Midnight
// states: default · hover · focus-visible · active · disabled · loading
import type { QueueListItem } from '@nasktv/shared';
import { Music, User } from 'lucide-react';

interface QueueItemProps {
  item: QueueListItem;
  index?: number;
  highlight?: boolean;
}

export default function QueueItem({ item, index, highlight }: QueueItemProps) {
  return (
    <div
      data-focusable
      data-focus-id={`queue-${item.id}`}
      tabIndex={0}
      role="button"
      className={`p-xl rounded-lg transition-[transform,box-shadow,background-color] duration-base ease-out active:scale-[0.98] focus-visible:[outline:var(--ring-width)_solid_var(--color-focus)] focus-visible:[outline-offset:var(--ring-offset)] ${
        highlight
          ? 'bg-accent-soft [box-shadow:var(--shadow-glow-soft)]'
          : 'bg-paper-2 hover:bg-paper-3 active:bg-paper-3'
      }`}
    >
      <div className="flex items-center gap-lg">
        {/* 序号（待播位置） */}
        {index !== undefined && (
          <span
            className={`font-mono text-lg w-12 h-12 shrink-0 flex items-center justify-center rounded-full ${
              highlight
                ? 'bg-accent text-paper'
                : 'bg-paper-3 text-ink-3'
            }`}
          >
            {String(index).padStart(2, '0')}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* 歌曲标题 */}
          <div className="flex items-center gap-sm mb-sm">
            <Music
              size={20}
              className={highlight ? 'text-accent' : 'text-ink-3'}
              strokeWidth={2}
            />
            <h3 className={`font-display text-lg truncate ${
              highlight ? 'text-accent' : 'text-ink'
            }`}>
              {item.songTitle}
            </h3>
          </div>

          {/* 歌手 */}
          <p className="text-ink-2 text-base mb-sm">
            {item.songArtist}
          </p>

          {/* 点歌人 */}
          {item.nickname && (
            <div className="flex items-center gap-sm">
              <User size={16} className="text-ink-3" />
              <span className="text-ink-3 text-sm">{item.nickname}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
