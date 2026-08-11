import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean; // 桌面端侧栏折叠状态
  mobileSidebarOpen: boolean; // 移动端侧栏抽屉开关
  toggleSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
}));
