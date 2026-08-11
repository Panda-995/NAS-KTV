import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: async (username, password) => {
        const result = await authApi.login(username, password);
        // 与 client.ts 拦截器（localStorage.getItem('token')）保持同步
        localStorage.setItem('token', result.token);
        set({ token: result.token, user: result.user, isAuthenticated: true });
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
