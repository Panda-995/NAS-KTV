import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  ArrowUp,
  ArrowDown,
  ListMusic,
} from 'lucide-react';
import { categoriesApi } from '../api/categories';
import type { CategoryGroup, CategoryItem } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Loading from '../components/Loading';
import { useToast } from '../components/Toast';

type ItemWithCount = CategoryItem & { songCount?: number };

interface PendingDelete {
  type: 'group' | 'item';
  group?: CategoryGroup;
  item?: CategoryItem;
}

const sortGroups = (list: CategoryGroup[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

export default function Categories() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const [itemParentId, setItemParentId] = useState<number | null>(null);
  const [itemName, setItemName] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const [modalError, setModalError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const didInitExpand = useRef(false);
  const { showToast, ToastContainer } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, allItems] = await Promise.all([
        categoriesApi.list(),
        categoriesApi.listItems(),
      ]);
      setGroups(g);
      setItems(allItems);
    } catch {
      setError('加载分类失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // expand all groups on first load
  useEffect(() => {
    if (!didInitExpand.current && groups.length > 0) {
      didInitExpand.current = true;
      setExpanded(new Set(groups.map((g) => g.id)));
    }
  }, [groups]);

  const itemsOf = (gid: number) =>
    items
      .filter((i) => i.categoryId === gid)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setModalError(null);
    setGroupModalOpen(true);
  };

  const openEditGroup = (g: CategoryGroup) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setModalError(null);
    setGroupModalOpen(true);
  };

  const saveGroup = async () => {
    if (!groupName.trim()) {
      setModalError('请输入分类组名称');
      return;
    }
    setSavingGroup(true);
    setModalError(null);
    try {
      if (editingGroup) {
        await categoriesApi.updateGroup(editingGroup.id, {
          name: groupName.trim(),
        });
      } else {
        await categoriesApi.createGroup({ name: groupName.trim() });
      }
      setGroupModalOpen(false);
      showToast('success', editingGroup ? '分类组已更新' : '分类组已创建');
      fetchAll();
    } catch {
      setModalError('保存失败，请重试');
    } finally {
      setSavingGroup(false);
    }
  };

  const openCreateItem = (gid: number) => {
    setEditingItem(null);
    setItemParentId(gid);
    setItemName('');
    setModalError(null);
    setItemModalOpen(true);
  };

  const openEditItem = (item: CategoryItem) => {
    setEditingItem(item);
    setItemParentId(item.categoryId);
    setItemName(item.name);
    setModalError(null);
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    if (!itemName.trim() || !itemParentId) {
      setModalError('请输入分类项名称');
      return;
    }
    setSavingItem(true);
    setModalError(null);
    try {
      if (editingItem) {
        await categoriesApi.updateItem(editingItem.id, {
          name: itemName.trim(),
        });
      } else {
        await categoriesApi.createItem({
          categoryId: itemParentId,
          name: itemName.trim(),
        });
      }
      setItemModalOpen(false);
      showToast('success', editingItem ? '分类项已更新' : '分类项已创建');
      fetchAll();
    } catch {
      setModalError('保存失败，请重试');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteGroup = (g: CategoryGroup) => {
    setPending({ type: 'group', group: g });
  };

  const handleDeleteItem = (item: CategoryItem) => {
    setPending({ type: 'item', item });
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    try {
      if (pending.type === 'group' && pending.group) {
        await categoriesApi.deleteGroup(pending.group.id);
        showToast('success', `已删除分类组「${pending.group.name}」`);
      } else if (pending.type === 'item' && pending.item) {
        await categoriesApi.deleteItem(pending.item.id);
        showToast('success', `已删除分类项「${pending.item.name}」`);
      }
      setPending(null);
      await fetchAll();
    } catch {
      showToast('error', '删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  // 分类项上移/下移：与相邻项交换 sortOrder
  const moveItem = async (item: CategoryItem, dir: -1 | 1) => {
    const list = itemsOf(item.categoryId);
    const idx = list.findIndex((x) => x.id === item.id);
    const target = list[idx + dir];
    if (!target) return;
    try {
      await Promise.all([
        categoriesApi.updateItem(item.id, { sortOrder: target.sortOrder }),
        categoriesApi.updateItem(target.id, { sortOrder: item.sortOrder }),
      ]);
      await fetchAll();
    } catch {
      showToast('error', '排序保存失败');
    }
  };

  return (
    <div className="p-lg space-y-lg">
      <ToastContainer />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-ink">分类管理</h1>
        <Button leftIcon={<Plus size={16} />} onClick={openCreateGroup}>
          新增分类组
        </Button>
      </div>

      {error && <div className="text-sm text-danger">{error}</div>}

      {loading ? (
        <Loading />
      ) : groups.length === 0 ? (
        <div className="text-center py-xl text-ink-3">
          暂无分类组，点击右上角新增
        </div>
      ) : (
        <div className="space-y-md">
          {sortGroups(groups).map((g) => {
            const isExpanded = expanded.has(g.id);
            const groupItems = itemsOf(g.id);
            return (
              <div
                key={g.id}
                className="bg-paper-2 border border-border rounded-lg overflow-hidden"
              >
                <div className="p-md border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    <button
                      onClick={() => toggleExpand(g.id)}
                      className="text-ink-3 hover:text-ink p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label={isExpanded ? '折叠' : '展开'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <Folder className="w-4 h-4 text-accent" />
                    <h2 className="text-lg font-display font-semibold text-ink">
                      {g.name}
                    </h2>
                    <Badge variant="neutral">{groupItems.length} 项</Badge>
                  </div>
                  <div className="flex gap-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<ListMusic size={14} />}
                      onClick={() => navigate(`/songs?categoryId=${g.id}`)}
                      aria-label={`查看 ${g.name} 分类的歌曲`}
                      title="查看歌曲"
                    >
                      歌曲
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={() => openCreateItem(g.id)}
                    >
                      添加项
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditGroup(g)}
                      aria-label="编辑分类组"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGroup(g)}
                      aria-label="删除分类组"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                {isExpanded &&
                  (groupItems.length === 0 ? (
                    <div className="p-md text-sm text-ink-3">暂无分类项</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {groupItems.map((item, i) => {
                        const sc = (item as ItemWithCount).songCount;
                        return (
                          <div
                            key={item.id}
                            className="p-md flex items-center justify-between hover:bg-paper-3 transition-colors duration-150 ease-out"
                          >
                            <div className="flex items-center gap-md">
                              <div className="flex flex-col">
                                <button
                                  onClick={() => moveItem(item, -1)}
                                  disabled={i === 0}
                                  className="p-0.5 rounded text-ink-3 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                  aria-label="上移"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveItem(item, 1)}
                                  disabled={i === groupItems.length - 1}
                                  className="p-0.5 rounded text-ink-3 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                  aria-label="下移"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="text-sm text-ink">
                                {item.name}
                              </span>
                              <span className="text-xs text-ink-3">
                                {sc ?? '—'} 首歌曲
                              </span>
                            </div>
                            <div className="flex gap-xs">
                              <button
                                onClick={() => navigate(`/songs?categoryItemIds=${item.id}`)}
                                className="p-1 rounded text-ink-3 hover:text-accent hover:bg-paper"
                                aria-label={`查看 ${item.name} 分类的歌曲`}
                                title="查看歌曲"
                              >
                                <ListMusic className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditItem(item)}
                                className="p-1 rounded text-ink-3 hover:text-ink hover:bg-paper"
                                aria-label="编辑分类项"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1 rounded text-ink-3 hover:text-danger hover:bg-paper"
                                aria-label="删除分类项"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroup ? '编辑分类组' : '新增分类组'}
      >
        <div className="space-y-md">
          <Input
            label="名称"
            placeholder="如：语种、年代、风格"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          {modalError && <p className="text-xs text-danger">{modalError}</p>}
          <div className="flex justify-end gap-sm pt-xs">
            <Button
              variant="ghost"
              onClick={() => setGroupModalOpen(false)}
              disabled={savingGroup}
            >
              取消
            </Button>
            <Button onClick={saveGroup} loading={savingGroup}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? '编辑分类项' : '新增分类项'}
      >
        <div className="space-y-md">
          <Input
            label="名称"
            placeholder="如：国语、流行、摇滚"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          {modalError && <p className="text-xs text-danger">{modalError}</p>}
          <div className="flex justify-end gap-sm pt-xs">
            <Button
              variant="ghost"
              onClick={() => setItemModalOpen(false)}
              disabled={savingItem}
            >
              取消
            </Button>
            <Button onClick={saveItem} loading={savingItem}>
              保存
            </Button>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <ConfirmModal
        isOpen={!!pending}
        title={pending?.type === 'group' ? '确认删除分类组' : '确认删除分类项'}
        message={
          pending ? (
            pending.type === 'group' ? (
              <>
                确定要删除分类组{' '}
                <strong className="text-ink">「{pending.group?.name}」</strong> 吗？
                该分类组下的所有分类项将一并删除，删除后无法恢复。
              </>
            ) : (
              <>
                确定要删除分类项{' '}
                <strong className="text-ink">「{pending.item?.name}」</strong> 吗？
                删除后无法恢复。
              </>
            )
          ) : null
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
