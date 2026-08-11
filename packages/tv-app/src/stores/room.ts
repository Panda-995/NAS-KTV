import { create } from 'zustand';
import type { Room, QueueListItem, PlayerStatePayload } from '@nasktv/shared';

interface RoomStore {
  // 房间状态
  room: Room | null;
  roomCode: string | null;
  authorized: boolean;
  // 授权到期时间（ISO），由 ROOM_EXPIRING_SOON 推送，用于倒计时提示
  expiresAt: string | null;

  // 队列
  queue: QueueListItem[];
  currentItem: QueueListItem | null;

  // 播放器状态
  playerState: PlayerStatePayload | null;

  // Actions
  setRoom: (room: Room | null) => void;
  setAuthorized: (authorized: boolean) => void;
  setExpiresAt: (expiresAt: string | null) => void;
  setQueue: (queue: QueueListItem[]) => void;
  setCurrentItem: (item: QueueListItem | null) => void;
  setPlayerState: (state: PlayerStatePayload | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  roomCode: null,
  authorized: false,
  expiresAt: null,
  queue: [],
  currentItem: null,
  playerState: null,

  setRoom: (room) => set({
    room,
    roomCode: room?.code || null,
    authorized: room?.authorized === 1 && room?.status === 'active'
  }),
  setAuthorized: (authorized) => set({ authorized }),
  setExpiresAt: (expiresAt) => set({ expiresAt }),
  setQueue: (queue) => set({ queue }),
  setCurrentItem: (currentItem) => set({ currentItem }),
  setPlayerState: (playerState) => set({ playerState }),
  reset: () => set({
    room: null,
    roomCode: null,
    authorized: false,
    expiresAt: null,
    queue: [],
    currentItem: null,
    playerState: null
  }),
}));
