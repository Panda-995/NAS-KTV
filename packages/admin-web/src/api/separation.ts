import client from './client';
import type {
  SeparationTask,
  SeparationTaskListParams,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export interface SeparationTriggerParams {
  songId: number;
  model?: string;
}

export const separationApi = {
  trigger: (data: SeparationTriggerParams): Promise<{ taskId: number; songId: number }> =>
    client
      .post<ApiResponse<{ taskId: number; songId: number }>>(`/songs/${data.songId}/separate`, { model: data.model })
      .then((res) => res.data.data),
  getTasks: (params?: SeparationTaskListParams): Promise<PaginatedResponse<SeparationTask>> =>
    client
      .get<ApiResponse<PaginatedResponse<SeparationTask>>>('/separation/tasks', {
        params,
      })
      .then((res) => res.data.data),
  getTask: (id: number): Promise<SeparationTask> =>
    client
      .get<ApiResponse<SeparationTask>>(`/separation/tasks/${id}`)
      .then((res) => res.data.data),
  retryTask: (id: number): Promise<SeparationTask> =>
    client
      .post<ApiResponse<SeparationTask>>(`/separation/tasks/${id}/retry`)
      .then((res) => res.data.data),
  stopTask: (id: number): Promise<void> =>
    client
      .post<ApiResponse<null>>(`/separation/tasks/${id}/stop`)
      .then(() => undefined),
  batchRetry: (taskIds: number[]): Promise<{ succeeded: number; skipped: number }> =>
    client
      .post<ApiResponse<{ succeeded: number; skipped: number }>>('/separation/tasks/batch-retry', { taskIds })
      .then((res) => res.data.data),
  batchDelete: (taskIds: number[]): Promise<{ succeeded: number; skipped: number }> =>
    client
      .post<ApiResponse<{ succeeded: number; skipped: number }>>('/separation/tasks/batch-delete', { taskIds })
      .then((res) => res.data.data),
  batchStop: (taskIds: number[]): Promise<{ succeeded: number; skipped: number }> =>
    client
      .post<ApiResponse<{ succeeded: number; skipped: number }>>('/separation/tasks/batch-stop', { taskIds })
      .then((res) => res.data.data),
};
