import client from './client';
import type { ScanStatus, ScanTask, ApiResponse, PaginatedResponse } from '../types';

export interface FolderEntry {
  name: string;
  path: string;
}

export interface FolderBrowseResult {
  current: string | null;
  parent: string | null;
  folders: FolderEntry[];
}

export interface ScanResultItem {
  id: number;
  filePath: string;
  status: 'new' | 'updated' | 'skipped' | 'error';
  songId: number | null;
  reason: string | null;
  error: string | null;
}

export interface ScanResultsResponse {
  items: ScanResultItem[];
  counts: { new: number; updated: number; skipped: number; error: number };
  total: number;
  limit: number;
  offset: number;
}

export const scanApi = {
  trigger: (scanPath: string): Promise<{ scanId: string; message: string }> =>
    client
      .post<ApiResponse<{ scanId: string; message: string }>>('/scan/trigger', {
        scanPath,
      })
      .then((res) => res.data.data),
  status: (): Promise<ScanStatus> =>
    client
      .get<ApiResponse<ScanStatus>>('/scan/status')
      .then((res) => res.data.data),
  history: (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<ScanTask>> =>
    client
      .get<ApiResponse<PaginatedResponse<ScanTask>>>('/scan/history', { params })
      .then((res) => res.data.data),
  results: (
    scanId: string,
    params?: { status?: string; limit?: number; offset?: number },
  ): Promise<ScanResultsResponse> =>
    client
      .get<ApiResponse<ScanResultsResponse>>(`/scan/jobs/${scanId}/results`, { params })
      .then((res) => res.data.data),
  folders: (p?: string): Promise<FolderBrowseResult> =>
    client
      .get<ApiResponse<FolderBrowseResult>>('/scan/folders', { params: p ? { path: p } : {} })
      .then((res) => res.data.data),
};
