/* Hallmark · component: folder-picker · genre: modern-minimal · theme: Cobalt
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * 系统文件夹选择器：从根逐级浏览目录，确认后返回所选路径
 */
import { useEffect, useState } from 'react';
import { FolderOpen, Folder, ArrowUp, CornerDownLeft, Loader2, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { scanApi, type FolderEntry } from '../api/scan';

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderPath: string) => void;
  initialPath?: string;
}

export default function FolderPicker({ isOpen, onClose, onSelect, initialPath }: FolderPickerProps) {
  const [current, setCurrent] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jumpValue, setJumpValue] = useState('');

  const load = async (p?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await scanApi.folders(p);
      setCurrent(data.current);
      setParent(data.parent);
      setFolders(data.folders);
      setJumpValue(data.current ?? '');
    } catch (e) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          '获取文件夹列表失败',
      );
    } finally {
      setLoading(false);
    }
  };

  // 打开弹窗时从初始路径或根开始加载
  useEffect(() => {
    if (!isOpen) return;
    load(initialPath || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const goUp = () => {
    if (parent) load(parent);
  };

  const jump = () => {
    const p = jumpValue.trim();
    if (!p) return;
    load(p);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="选择扫描文件夹">
      <div className="space-y-3">
        {/* 当前路径 */}
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="w-4 h-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="text-xs font-mono text-ink-2 truncate" title={current ?? ''}>
            {current ?? '选择位置'}
          </span>
          {parent && (
            <button
              type="button"
              onClick={goUp}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              上级
            </button>
          )}
        </div>

        {/* 目录列表 */}
        <div
          className="border border-border rounded-md bg-paper-2 overflow-y-auto min-h-40 max-h-72"
          role="listbox"
          aria-label="文件夹列表"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-lg text-xs text-ink-3">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              加载中…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-lg text-xs text-danger" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : folders.length === 0 ? (
            <div className="p-lg text-xs text-ink-3 text-center">该文件夹下没有子文件夹</div>
          ) : (
            <ul className="divide-y divide-border">
              {folders.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => load(f.path)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-paper-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                    role="option"
                    aria-selected={false}
                  >
                    <Folder className="w-4 h-4 shrink-0 text-ink-3" aria-hidden="true" />
                    <span className="truncate">{f.name}</span>
                    <span className="ml-auto text-ink-3 shrink-0">›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 路径快捷跳转 */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="输入路径直接跳转，如 /media/music"
            className="flex-1"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') jump();
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={loading || !jumpValue.trim()}
            onClick={jump}
            leftIcon={<CornerDownLeft className="w-4 h-4" aria-hidden="true" />}
          >
            跳转
          </Button>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!current || loading}
            onClick={() => {
              if (current) onSelect(current);
              onClose();
            }}
          >
            选择此文件夹
          </Button>
        </div>
      </div>
    </Modal>
  );
}
