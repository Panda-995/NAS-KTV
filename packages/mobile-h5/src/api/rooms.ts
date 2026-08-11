import client from './client';
import type { Room, RoomSessionJoinParams, RoomStateSnapshotPayload } from '@nasktv/shared';

export interface JoinRoomResponse {
  sessionId: number;
  sessionToken: string;
  roomId: number;
  roomCode: string;
  roomName?: string;
  sessionExpiresAt: string;
}

export const roomsApi = {
  getRoom: (code: string): Promise<Room | null> =>
    client.get<{ success: boolean; data: Room | null }>(`/rooms/${code}`)
      .then(res => res.data.data),
  joinRoom: (data: RoomSessionJoinParams): Promise<JoinRoomResponse> =>
    client.post<{ success: boolean; data: JoinRoomResponse }>('/room-sessions', data)
      .then(res => res.data.data),
  leaveRoom: (sessionId: number): Promise<void> =>
    client.delete<{ success: boolean }>(`/room-sessions/${sessionId}`)
      .then(() => undefined),
  getRoomSnapshot: (code: string, sessionToken: string): Promise<RoomStateSnapshotPayload | null> =>
    client.get<{ success: boolean; data: RoomStateSnapshotPayload | null }>(`/rooms/${code}/snapshot`, {
      params: { sessionToken },
    })
      .then(res => res.data.data),
};
