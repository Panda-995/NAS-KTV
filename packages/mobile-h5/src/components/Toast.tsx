/* Hallmark · genre: editorial · theme: Garden · Toast — 全局轻提示
 * states: default · success · error · info
 * 用于点歌/遥控操作的即时反馈（如"歌曲已在待播队列中"）
 */

import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useToastStore } from '../stores/toast';

const css = `
.toast-root {
  position: fixed;
  left: 50%;
  bottom: calc(120px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  pointer-events: none;
  width: max-content;
  max-width: calc(100vw - 2 * var(--space-xl));
}

.toast-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  min-height: 44px;
  border-radius: var(--radius-full);
  background-color: var(--color-ink);
  color: var(--color-paper);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  box-shadow: var(--shadow-lg);
  animation: toast-in var(--dur-base) var(--ease-out);
}

.toast-item--error { background-color: var(--color-danger); color: var(--color-paper); }
.toast-item--success { background-color: var(--color-success); color: var(--color-paper); }

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .toast-item { animation-duration: 0.01ms; }
}
`;

export default function Toast() {
  const toasts = useToastStore(s => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{css}</style>
      <div className="toast-root" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item toast-item--${t.type}`}>
            {t.type === 'error' ? (
              <AlertCircle size={16} strokeWidth={2} />
            ) : t.type === 'success' ? (
              <CheckCircle2 size={16} strokeWidth={2} />
            ) : (
              <Info size={16} strokeWidth={2} />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
