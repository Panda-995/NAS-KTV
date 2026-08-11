import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/* Hallmark · component: pagination · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass
 */

export type PaginationState = 'default' | 'loading' | 'error' | 'success';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  state?: PaginationState;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  state = 'default',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const isLoading = state === 'loading';
  const isError = state === 'error';
  const isSuccess = state === 'success';

  const getButtonClass = (isActive: boolean) => {
    const classes = [
      'inline-flex items-center justify-center min-w-[2rem] h-8 px-2',
      'text-sm font-medium rounded-md border',
      'transition-colors duration-150 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-paper',
      'active:translate-y-px',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0',
    ];

    if (isError) {
      classes.push('border-danger text-danger bg-paper');
    } else if (isSuccess) {
      classes.push('border-success text-success bg-paper');
    } else if (isActive) {
      classes.push('border-accent bg-accent text-paper');
    } else {
      classes.push(
        'border-border text-ink hover:bg-paper-2 hover:border-border-strong'
      );
    }

    return classes.join(' ');
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages
  );

  return (
    <div
      className="flex items-center justify-center gap-1.5 mt-6"
      role="navigation"
      aria-label="分页"
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className={getButtonClass(false)}
        aria-label="上一页"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((page, idx, arr) => {
        const showEllipsis = idx > 0 && arr[idx - 1] !== page - 1;
        const isActive = currentPage === page;
        return (
          <span key={page} className="flex items-center gap-1.5">
            {showEllipsis && (
              <span className="text-ink-3 px-1" aria-hidden="true">
                …
              </span>
            )}
            <button
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              className={getButtonClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              {isLoading && isActive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                page
              )}
            </button>
          </span>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className={getButtonClass(false)}
        aria-label="下一页"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
