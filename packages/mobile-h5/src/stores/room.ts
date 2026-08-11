import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RoomStore {
  // 状态
  roomCode: string | null;
  roomId: number | null;
  sessionId: number | null;
  sessionToken: string | null;
  sessionExpiresAt: number | null;
  nickname: string;
  joined: boolean;
  // 房间未授权/授权过期（不再跳转加入页，直接展示禁止点歌提示）
  unauthorized: boolean;

  // Actions
  setJoined: (data: {
    roomCode: string;
    roomId: number;
    sessionId: number;
    sessionToken: string;
    sessionExpiresAt: number;
    nickname: string;
  }) => void;
  setNickname: (nickname: string) => void;
  setUnauthorized: (unauthorized: boolean) => void;
  leave: () => void;
}

export const useRoomStore = create<RoomStore>()(
  persist(
    (set) => ({
      roomCode: null,
      roomId: null,
      sessionId: null,
      sessionToken: null,
      sessionExpiresAt: null,
      nickname: '',
      joined: false,
      unauthorized: false,

      setJoined: ({ roomCode, roomId, sessionId, sessionToken, sessionExpiresAt, nickname }) => set({
        roomCode, roomId, sessionId, sessionToken, sessionExpiresAt, nickname, joined: true, unauthorized: false
      }),
      setNickname: (nickname) => set({ nickname }),
      setUnauthorized: (unauthorized) => set({ unauthorized }),
      leave: () => set({
        roomCode: null,
        roomId: null,
        sessionId: null,
        sessionToken: null,
        sessionExpiresAt: null,
        joined: false,
        unauthorized: false,
      }),
    }),
    {
      name: 'nasktv-room',
      version: 3,
      migrate: (persistedState: unknown, version) => {
        const state = (persistedState ?? {}) as Partial<RoomStore>;
        if (version < 3) {
          return {
            ...state,
            roomCode: null,
            roomId: null,
            sessionId: null,
            sessionToken: null,
            sessionExpiresAt: null,
            joined: false,
            unauthorized: false,
          } as RoomStore;
        }
        return state as RoomStore;
      },
    }
  )
);
