/* Hallmark · genre: atmospheric · macrostructure: timeline-led · design-system: design.md · designed-as-app */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Disc3 } from 'lucide-react';
import { useRoomStore } from '../stores/room';
import { useDpadNavigation } from '../hooks/useDpadNavigation';
import QueueItem from '../components/QueueItem';
import HistoryList from '../components/HistoryList';

export default function Queue() {
  const navigate = useNavigate();
  const { queue } = useRoomStore();

  useDpadNavigation();

  // 按状态分类
  const pending = queue
    .filter(q => q.status === 'pending')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const playing = queue.filter(q => q.status === 'playing');
  const played = queue
    .filter(q => q.status === 'played' || q.status === 'skipped')
    .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)))
    .slice(0, 20);  // 最近 20 条

  return (
    <div className="min-h-screen bg-paper p-3xl">
      {/* 顶部栏 */}
      <div className="flex items-center gap-xl mb-3xl">
        <button
          onClick={() => navigate('/')}
          data-focusable
          data-focus-id="back"
          className="flex items-center gap-sm text-ink-2 hover:text-ink transition-colors p-md rounded-md hover:bg-paper-2 active:scale-[0.98]"
        >
          <ArrowLeft size={32} />
          <span className="text-base">返回</span>
        </button>
        <h1 className="font-display text-3xl text-ink">播放队列</h1>
        <span className="font-mono text-sm text-ink-3 tracking-widest">
          {pending.length} 首待播
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl">
        {/* 左：正在播放（焦点卡）+ 待播列表 */}
        <div>
          <h2 className="font-mono text-sm text-accent tracking-[0.35em] mb-xl">
            正在播放
          </h2>
          {playing.length > 0 ? (
            <div className="mb-3xl">
              <QueueItem item={playing[0]} highlight />
            </div>
          ) : (
            <div
              className="flex items-center gap-lg p-xl rounded-lg bg-paper-2 mb-3xl"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <Disc3 size={28} className="text-ink-3 shrink-0" strokeWidth={1.5} />
              <p className="text-ink-3 text-base">暂无播放</p>
            </div>
          )}

          <h2 className="font-mono text-sm text-ink-3 tracking-[0.35em] mb-xl">
            待播队列 · {pending.length}
          </h2>
          <div className="space-y-md">
            {pending.map((item, i) => (
              <QueueItem key={item.id} item={item} index={i + 1} />
            ))}
            {pending.length === 0 && (
              <p className="text-ink-3 text-base">队列为空</p>
            )}
          </div>
        </div>

        {/* 右：历史时间线 */}
        <div>
          <h2 className="font-mono text-sm text-ink-3 tracking-[0.35em] mb-xl">
            已播历史
          </h2>
          <HistoryList items={played} />
        </div>
      </div>
    </div>
  );
}
