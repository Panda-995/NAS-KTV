import { create } from 'zustand';

interface UiStore {
  // 底部导航
  activeTab: 'home' | 'search' | 'queue' | 'profile';
  setActiveTab: (tab: 'home' | 'search' | 'queue' | 'profile') => void;

  // 加载状态
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // 错误信息
  error: string | null;
  setError: (error: string | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeTab: 'home',
  setActiveTab: (activeTab) => set({ activeTab }),
  loading: false,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
}));
