import client from './client';
import type { QueueListItem, ApiResponse } from '@nasktv/shared';

export const queueApi = {
  getQueue: (roomId: number, sessionToken: string): Promise<QueueListItem[]> =>
    client.get<ApiResponse<QueueListItem[]>>(`/rooms/${roomId}/queue`, {
      params: { sessionToken },
    })
      .then(res => res.data.data),
  addToQueue: (roomId: number, data: { songId: number; sessionToken: string; nickname?: string }): Promise<QueueListItem> =>
    client.post<ApiResponse<QueueListItem>>(`/rooms/${roomId}/queue`, data)
      .then(res => res.data.data),
  insertNext: (roomId: number, data: { songId: number; sessionToken: string }): Promise<void> =>
    client.post<ApiResponse<null>>(`/rooms/${roomId}/queue/insert-next`, data)
      .then(() => undefined),
  skip: (roomId: number, data: { queueItemId: number; sessionToken: string }): Promise<void> =>
    client.post<ApiResponse<null>>(`/rooms/${roomId}/queue/${data.queueItemId}/skip`, data)
      .then(() => undefined),
  topQueueItem: (roomId: number, queueItemId: number, data: { sessionToken: string }): Promise<void> =>
    client.post<ApiResponse<null>>(`/rooms/${roomId}/queue/${queueItemId}/top`, data)
      .then(() => undefined),
  removeQueueItem: (roomId: number, queueItemId: number, data: { sessionToken: string }): Promise<void> =>
    client.delete<ApiResponse<null>>(`/rooms/${roomId}/queue/${queueItemId}`, { data })
      .then(() => undefined),
  clearPlayed: (roomId: number, data: { sessionToken: string }): Promise<number> =>
    client.delete<ApiResponse<{ removed: number }>>(`/rooms/${roomId}/queue/played`, { data })
      .then(res => res.data.data.removed),
};
