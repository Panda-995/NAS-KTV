import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastStore {
  toasts: ToastItem[];
  show: (message: string, type?: ToastItem['type']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message, type = 'info') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, type }] }));
    // 自动消失（与 dismiss 同路径，组件卸载后也可靠）
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
