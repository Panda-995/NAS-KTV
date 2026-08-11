/* Hallmark · genre: editorial · component: NowPlayingBar · mobile-h5
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useQueueStore } from '../stores/queue';
import { Disc3, ChevronUp } from 'lucide-react';

const css = `
.npb-wrap {
  position: fixed;
  bottom: calc(68px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  z-index: var(--z-raised);
  padding: 0 var(--space-md);
  pointer-events: none;
}

.npb-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-paper-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  transition: background-color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.npb-card:hover {
  background-color: var(--color-paper-3);
  border-color: var(--color-ink-3);
}
.npb-card:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.npb-card:active {
  transform: scale(0.985);
}

.npb-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}

.npb-info {
  flex: 1;
  min-width: 0;
}

.npb-title {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.npb-artist {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-ink-3);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.npb-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  color: var(--color-ink-3);
  transition: color var(--dur-fast) var(--ease-out);
}
.npb-card:hover .npb-arrow {
  color: var(--color-accent);
}

@media (prefers-reduced-motion: reduce) {
  .npb-card {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function NowPlayingBar() {
  const { currentItem, openRemote } = useQueueStore();

  if (!currentItem) return null;

  return (
    <>
      <style>{css}</style>
      <div className="npb-wrap">
        <button
          className="npb-card"
          onClick={openRemote}
          aria-label={`正在播放：${currentItem.songTitle}，点击打开遥控器`}
          type="button"
        >
          <span className="npb-cover">
            <Disc3 size={20} strokeWidth={1.6} />
          </span>
          <span className="npb-info">
            <span className="npb-title">{currentItem.songTitle}</span>
            <span className="npb-artist">{currentItem.songArtist}</span>
          </span>
          <span className="npb-arrow" aria-hidden="true">
            <ChevronUp size={18} strokeWidth={1.8} />
          </span>
        </button>
      </div>
    </>
  );
}
