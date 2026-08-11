import client from './client';
import type { Room, RoomJoinTicket } from '@nasktv/shared';

export const roomsApi = {
  registerDevice: (data: { deviceId: string; name?: string; deviceInfo?: string }): Promise<Room> =>
    client.post<{ success: boolean; data: Room }>('/rooms/register', data)
      .then(res => res.data.data),
  getRoom: (code: string): Promise<Room | null> =>
    client.get<{ success: boolean; data: Room | null }>(`/rooms/${code}`)
      .then(res => res.data.data),
  getH5Url: (): Promise<string> =>
    client.get<{ success: boolean; data: { h5BaseUrl: string } }>('/rooms/h5-url')
      .then(res => res.data.data.h5BaseUrl),
  issueJoinTicket: (roomId: number, deviceId: string, forceRotate = false): Promise<RoomJoinTicket> =>
    client
      .post<{ success: boolean; data: RoomJoinTicket }>(`/rooms/${roomId}/join-ticket`, {
        deviceId,
        forceRotate,
      })
      .then(res => res.data.data),
  rotateCode: (roomId: number, deviceId: string): Promise<Room> =>
    client
      .post<{ success: boolean; data: Room }>(`/rooms/${roomId}/rotate-code`, { deviceId })
      .then(res => res.data.data),
  getQrCodeUrl: (data: string): string => {
    const base = client.defaults.baseURL || '/api';
    return `${base}/rooms/qrcode?data=${encodeURIComponent(data)}`;
  },
};
