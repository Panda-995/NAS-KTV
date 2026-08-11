/* Hallmark · component: confirm-modal · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * 删除/危险操作确认弹窗（替代原生 confirm 与「删除+撤销」逻辑）
 */
import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = '确认删除',
  cancelLabel = '取消',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-md">
        <div className="flex items-start gap-sm">
          <span
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full"
            style={{
              backgroundColor:
                'color-mix(in oklch, var(--color-danger) 12%, transparent)',
            }}
          >
            <AlertTriangle
              className="w-4 h-4 text-danger"
              aria-hidden="true"
            />
          </span>
          <div className="text-sm text-ink-2 leading-relaxed min-w-0">
            {message}
          </div>
        </div>
        <div className="flex items-center justify-end gap-sm pt-sm">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
