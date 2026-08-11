import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor:
          'color-mix(in oklch, var(--color-ink) 50%, transparent)',
      }}
      onClick={onClose}
    >
      <div
        className={[
          'bg-paper rounded-lg shadow-lg border border-border w-full',
          'flex flex-col max-h-[calc(100vh-2rem)]',
          size === 'lg' ? 'max-w-2xl' : 'max-w-md',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="text-lg font-semibold font-display text-ink">{title}</h3>
          <button
            onClick={onClose}
            className={[
              'inline-flex items-center justify-center w-8 h-8 rounded-md',
              'text-ink-3 hover:text-ink hover:bg-paper-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'transition-colors',
            ].join(' ')}
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
