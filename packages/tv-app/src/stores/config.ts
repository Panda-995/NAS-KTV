import { create } from 'zustand';

interface ConfigState {
  // 配置是否已加载完成（异步读取，未完成时路由守卫显示加载）
  loaded: boolean;
  // 是否已有可用后端配置
  configured: boolean;
  apiUrl: string;
  wsUrl: string;
  setConfig: (config: { apiUrl: string; wsUrl: string }) => void;
  setUnconfigured: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  loaded: false,
  configured: false,
  apiUrl: '',
  wsUrl: '',
  setConfig: (config) =>
    set({
      loaded: true,
      configured: true,
      apiUrl: config.apiUrl,
      wsUrl: config.wsUrl,
    }),
  setUnconfigured: () =>
    set({ loaded: true, configured: false, apiUrl: '', wsUrl: '' }),
}));
