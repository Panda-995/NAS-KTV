import client from './client';
import type { ApiResponse } from '../types';

interface Setting {
  key: string;
  value: string | null;
}

export const settingsApi = {
  getAll: (): Promise<Setting[]> =>
    client.get<ApiResponse<Setting[]>>('/settings').then(r => r.data.data),

  update: (items: { key: string; value: string }[]): Promise<void> =>
    client.put<ApiResponse<null>>('/settings', { settings: items }).then(() => undefined),

  uploadLogo: (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    return client
      .post<ApiResponse<null>>('/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(() => undefined);
  },

  resetLogo: (): Promise<void> =>
    client.delete<ApiResponse<null>>('/logo').then(() => undefined),
};
