/* Hallmark · genre: editorial · theme: Garden · EmptyState component
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const css = `
.es-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}
.es-action {
  margin-top: var(--space-lg);
  padding: var(--space-sm) var(--space-lg);
  min-height: 44px;
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-accent);
  color: var(--color-on-accent);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.es-action:hover {
  background-color: var(--color-accent-hover);
}
.es-action:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.es-action:active {
  transform: scale(0.97);
}
.es-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .es-action {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const Icon = icon || Inbox;

  return (
    <>
      <style>{css}</style>
      <div className="flex flex-col items-center justify-center py-3xl px-xl text-center">
        <div className="es-icon">
          <Icon size={28} strokeWidth={1.5} />
        </div>

        <h3 className="font-display text-lg text-ink" style={{ marginTop: 'var(--space-lg)' }}>
          {title}
        </h3>

        {description && (
          <p className="text-ink-3 text-sm mt-sm max-w-xs">{description}</p>
        )}

        {action && (
          <button
            onClick={action.onClick}
            className="es-action"
            type="button"
          >
            {action.label}
          </button>
        )}
      </div>
    </>
  );
}
