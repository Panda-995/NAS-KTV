/* Hallmark · genre: editorial · component: BottomNav · mobile-h5
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Mic2, ListMusic } from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/search', label: '搜索', icon: Search },
  { path: '/artists', label: '歌手', icon: Mic2 },
  { path: '/queue', label: '队列', icon: ListMusic },
];

const css = `
.bn-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  background-color: color-mix(in oklab, var(--color-paper) 92%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom);
}

.bn-bar {
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  padding: var(--space-xs) var(--space-md);
  gap: var(--space-2xs);
}

.bn-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2xs);
  padding: var(--space-sm) var(--space-xs);
  flex: 1;
  min-height: 52px;
  min-width: 44px;
  text-decoration: none;
  color: var(--color-ink-3);
  border-radius: var(--radius-lg);
  transition: color var(--dur-fast) var(--ease-out),
              background-color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.bn-link:hover {
  color: var(--color-ink);
  background-color: var(--color-paper-2);
}
.bn-link:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.bn-link:active {
  transform: scale(0.95);
  color: var(--color-accent);
}
.bn-link:disabled,
.bn-link[data-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}
.bn-link[data-state="loading"] {
  animation: bn-pulse 1.5s var(--ease-in-out) infinite;
}
.bn-link[data-state="error"] {
  color: var(--color-danger);
}
.bn-link[data-state="success"] {
  color: var(--color-success);
}

.bn-link--active {
  color: var(--color-accent);
  background-color: var(--color-accent-soft);
}
.bn-link--active:hover {
  color: var(--color-accent-hover);
  background-color: var(--color-accent-soft);
}

.bn-label {
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.4;
  font-family: var(--font-body);
  white-space: nowrap;
}

.bn-version {
  text-align: center;
  font-size: 10px;
  line-height: 1;
  padding: 2px 0 4px;
  color: var(--color-ink-3);
  opacity: 0.65;
  font-family: var(--font-mono, monospace);
}

@keyframes bn-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .bn-link {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function BottomNav() {
  const location = useLocation();

  return (
    <>
      <style>{css}</style>
      <nav className="bn-nav" role="navigation" aria-label="底部导航">
        <div className="bn-bar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bn-link${active ? ' bn-link--active' : ''}`}
                role="link"
                tabIndex={0}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
                <span className="bn-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="bn-version">Nasktv v{__APP_VERSION__}</div>
      </nav>
    </>
  );
}
