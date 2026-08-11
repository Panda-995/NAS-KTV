/* Hallmark · genre: editorial · theme: Garden · Unauthorized page
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * designed-as-app
 */

import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../stores/room';
import { ShieldAlert, LogIn } from 'lucide-react';

const css = `
/* Hallmark · genre: editorial · theme: Garden · Unauthorized page */
.unauth-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + var(--space-2xl)) var(--space-xl) calc(env(safe-area-inset-bottom) + var(--space-2xl));
  text-align: center;
}

.unauth-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: var(--radius-xl);
  background-color: var(--color-danger-soft);
  color: var(--color-danger);
  margin-bottom: var(--space-xl);
}

.unauth-title {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 8vw, 2.5rem);
  line-height: 1.2;
  color: var(--color-ink);
  margin-bottom: var(--space-md);
}

.unauth-desc {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-ink-2);
  max-width: 360px;
  margin-bottom: var(--space-2xl);
}

.unauth-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 48px;
  padding: var(--space-md) var(--space-xl);
  font-size: var(--text-base);
  font-weight: 500;
  font-family: var(--font-body);
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.unauth-btn:hover {
  background-color: var(--color-accent-hover);
}
.unauth-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.unauth-btn:active {
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .unauth-btn {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function Unauthorized() {
  const navigate = useNavigate();
  const { setUnauthorized } = useRoomStore();

  const handleRejoin = () => {
    setUnauthorized(false);
    navigate('/join');
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <style>{css}</style>

      <div className="unauth-wrap">
        <div className="unauth-icon" aria-hidden="true">
          <ShieldAlert size={40} strokeWidth={1.5} />
        </div>

        <h1 className="unauth-title">授权已过期</h1>

        <p className="unauth-desc">
          房间授权已过期或未授权，不允许继续点歌。请联系房主续期后重新加入。
        </p>

        <button
          onClick={handleRejoin}
          className="unauth-btn"
          tabIndex={0}
          role="button"
          type="button"
        >
          <LogIn size={20} />
          <span>重新加入</span>
        </button>
      </div>
    </div>
  );
}
