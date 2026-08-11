import client from './client';
import type { ApiResponse } from '../types';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

export const backupApi = {
  create: (): Promise<BackupInfo> =>
    client.post<ApiResponse<BackupInfo>>('/backup/create').then(r => r.data.data),

  list: (): Promise<BackupInfo[]> =>
    client.get<ApiResponse<BackupInfo[]>>('/backup/list').then(r => r.data.data),

  download: (filename: string): string =>
    `${client.defaults.baseURL}/backup/download/${encodeURIComponent(filename)}`,

  remove: (filename: string): Promise<void> =>
    client.delete<ApiResponse<null>>(`/backup/${encodeURIComponent(filename)}`).then(() => undefined),

  restore: (filename: string): Promise<void> =>
    client.post<ApiResponse<null>>(`/backup/restore/${encodeURIComponent(filename)}`).then(() => undefined),
};
