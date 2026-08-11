import { create } from 'zustand';
import type { QueueListItem, PlayerStatePayload } from '@nasktv/shared';

interface QueueStore {
  // 队列
  queue: QueueListItem[];
  currentItem: QueueListItem | null;

  // 播放器状态（来自 TV 端推送）
  playerState: PlayerStatePayload | null;

  // 当前歌词行索引（来自 TV 端 LYRIC_SYNC 推送）
  currentLyricIndex: number;

  // 加载状态
  loading: boolean;

  // 全局遥控浮层开关
  remoteOpen: boolean;

  // Actions
  setQueue: (queue: QueueListItem[]) => void;
  setCurrentItem: (item: QueueListItem | null) => void;
  setPlayerState: (state: PlayerStatePayload | null) => void;
  setCurrentLyricIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  openRemote: () => void;
  closeRemote: () => void;

  // Optimistic update
  addOptimistic: (item: QueueListItem) => void;
  removeOptimistic: (id: number) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  queue: [],
  currentItem: null,
  playerState: null,
  currentLyricIndex: 0,
  loading: false,
  remoteOpen: false,

  setQueue: (queue) => set({ queue }),
  setCurrentItem: (currentItem) => set({ currentItem }),
  setPlayerState: (playerState) => set({ playerState }),
  setCurrentLyricIndex: (currentLyricIndex) => set({ currentLyricIndex }),
  setLoading: (loading) => set({ loading }),
  openRemote: () => set({ remoteOpen: true }),
  closeRemote: () => set({ remoteOpen: false }),

  addOptimistic: (item) => set((state) => ({
    queue: [...state.queue, item]
  })),
  removeOptimistic: (id) => set((state) => ({
    queue: state.queue.filter(q => q.id !== id)
  })),
}));
