import client from './client';
import type { ApiResponse } from '../types';

export interface DedupDuplicate {
  keepId: number;
  removedId: number;
  title: string;
  artistId: number | null;
  fileType: string | null;
  filePath: string;
  reason: string;
}

export interface DedupResult {
  taskId: number | null;
  isRunning: boolean;
  enabled: boolean;
  checked: number;
  removed: number;
  duplicates: DedupDuplicate[];
}

export interface DedupTaskItem {
  id: number;
  scanId: string | null;
  status: string;
  startedAt: number;
  completedAt: number | null;
  checked: number;
  removed: number;
  duplicates: DedupDuplicate[];
  error: string | null;
}

export interface DedupProgress {
  running: boolean;
  stage: string;
  processed: number;
  total: number;
  percent: number;
}

export const dedupApi = {
  run: (): Promise<DedupResult> =>
    client
      .post<ApiResponse<DedupResult>>('/dedup/run')
      .then((res) => res.data.data),
  status: (): Promise<{ progress: DedupProgress; lastResult: DedupResult | null }> =>
    client
      .get<ApiResponse<{ progress: DedupProgress; lastResult: DedupResult | null }>>('/dedup/status')
      .then((res) => res.data.data),
  tasks: (limit = 20): Promise<DedupTaskItem[]> =>
    client
      .get<ApiResponse<DedupTaskItem[]>>('/dedup/tasks', { params: { limit } })
      .then((res) => res.data.data),
  restore: (taskId: number, removedId: number): Promise<{ songId: number | null; restored: boolean }> =>
    client
      .post<ApiResponse<{ songId: number | null; restored: boolean }>>('/dedup/restore', {
        taskId,
        removedId,
      })
      .then((res) => res.data.data),
};
