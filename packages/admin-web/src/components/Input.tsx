import { forwardRef, ReactNode, useId } from 'react';
import { Loader2 } from 'lucide-react';

/* Hallmark · component: input · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (AA on paper/ink pairings)
 */

export type InputVisualState = 'default' | 'error' | 'success';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  error?: string;
  loading?: boolean;
  state?: InputVisualState;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

const stateClasses: Record<InputVisualState, string> = {
  default:
    'border-border hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-accent)_25%,transparent)]',
  error:
    'border-danger text-danger hover:border-danger focus:border-danger focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-danger)_25%,transparent)]',
  success:
    'border-success focus:border-success focus:ring-2 focus:ring-[color-mix(in_oklch,var(--color-success)_25%,transparent)]',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      loading = false,
      state,
      prefix,
      suffix,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const resolvedState: InputVisualState = state || (error ? 'error' : 'default');
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink-2 mb-xs"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 inline-flex items-center text-ink-3 pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={resolvedState === 'error' || !!error}
            aria-describedby={hint || error ? hintId : undefined}
            className={[
              'w-full rounded-md border bg-paper text-ink text-sm',
              'px-3 py-2',
              'placeholder:text-ink-3',
              'transition-colors duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-paper',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              prefix ? 'pl-9' : '',
              suffix || loading ? 'pr-9' : '',
              stateClasses[resolvedState],
              className,
            ].join(' ')}
            {...props}
          />
          {loading ? (
            <Loader2
              className="absolute right-3 w-4 h-4 animate-spin text-ink-3"
              aria-hidden="true"
            />
          ) : (
            suffix && (
              <span className="absolute right-3 inline-flex items-center text-ink-3">
                {suffix}
              </span>
            )
          )}
        </div>
        {(hint || error) && (
          <p
            id={hintId}
            className={['mt-xs text-xs', error ? 'text-danger' : 'text-ink-3'].join(
              ' '
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
