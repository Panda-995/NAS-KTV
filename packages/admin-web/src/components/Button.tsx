import { forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/* Hallmark · component: button · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (AA on paper/ink pairings)
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVisualState = 'default' | 'error' | 'success';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  state?: ButtonVisualState;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-paper enabled:hover:bg-accent-hover',
  secondary:
    'bg-paper-2 text-ink border border-border enabled:hover:bg-paper-3 enabled:hover:border-border-strong',
  ghost: 'text-ink-2 enabled:hover:text-ink enabled:hover:bg-paper-2',
  danger: 'bg-danger text-paper enabled:hover:brightness-95',
};

const stateClasses: Record<Exclude<ButtonVisualState, 'default'>, string> = {
  error: 'bg-paper text-danger border border-danger',
  success: 'bg-paper text-success border border-success',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      state = 'default',
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const visualClass =
      state === 'default' ? variantClasses[variant] : stateClasses[state];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium rounded-md',
          'transition-colors transition-transform duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'active:translate-y-px',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0',
          sizeClasses[size],
          visualClass,
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
