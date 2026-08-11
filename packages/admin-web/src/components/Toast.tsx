import { useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  type: 'error' | 'warning' | 'success';
  message: string;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = () => (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="通知"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        const Icon = isError ? AlertCircle : isSuccess ? CheckCircle : AlertTriangle;
        return (
          <div
            key={toast.id}
            className={[
              'flex items-start gap-2 px-4 py-3 rounded-md shadow-md border',
              'bg-paper text-ink text-sm',
              isError ? 'border-danger' : isSuccess ? 'border-success' : 'border-warning',
            ].join(' ')}
            role="alert"
          >
            <Icon
              className={[
                'w-4 h-4 shrink-0 mt-0.5',
                isError ? 'text-danger' : isSuccess ? 'text-success' : 'text-warning',
              ].join(' ')}
              aria-hidden="true"
            />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className={[
                'inline-flex items-center justify-center w-5 h-5 rounded-sm',
                'text-ink-3 hover:text-ink hover:bg-paper-2',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                'transition-colors',
              ].join(' ')}
              aria-label="关闭通知"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );

  return { showToast, ToastContainer };
}
