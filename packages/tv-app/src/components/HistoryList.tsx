// Hallmark · component: list · genre: atmospheric · theme: Midnight
// states: default · hover · focus-visible · active · disabled · loading
import type { QueueListItem } from '@nasktv/shared';
import { Check, X } from 'lucide-react';

interface HistoryListProps {
  items: QueueListItem[];
}

function formatTime(timestamp: string | number): string {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <p className="text-ink-3 text-base">暂无历史记录</p>
    );
  }

  return (
    <div className="space-y-sm">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-lg p-lg rounded-lg bg-paper-2 hover:bg-paper-3 transition-[background-color] duration-base"
        >
          {/* 时间列（时间线感） */}
          <span className="font-mono text-sm text-ink-3 w-14 shrink-0 text-right">
            {formatTime(item.requestedAt as unknown as string)}
          </span>

          {/* 状态图标 */}
          {item.status === 'played' ? (
            <Check size={20} className="text-success flex-shrink-0" />
          ) : (
            <X size={20} className="text-ink-3 flex-shrink-0" />
          )}

          {/* 歌曲信息 */}
          <div className="flex-1 min-w-0">
            <p className="text-ink text-base font-medium truncate">
              {item.songTitle}
            </p>
            <p className="text-ink-3 text-sm truncate">
              {item.songArtist}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
