import client from './client';
import type { ApiResponse } from '../types';

export interface GpuInfo {
  available: boolean;
  name?: string | null;
  memory_mb?: number | null;
  cuda_available: boolean;
  torch_version?: string | null;
  torch_cuda_version?: string | null;
  venv_exists: boolean;
}

export const separatorApi = {
  getGpuInfo: (): Promise<GpuInfo> =>
    client.get<ApiResponse<GpuInfo>>('/separator/gpu/info')
      .then(res => res.data.data),

  getProxy: (): Promise<string> =>
    client.get<ApiResponse<{ proxy: string }>>('/separator/gpu/proxy')
      .then(res => res.data.data.proxy),

  saveProxy: (proxy: string): Promise<void> =>
    client.put<ApiResponse<{ proxy: string }>>('/separator/gpu/proxy', { proxy })
      .then(() => undefined),

  installGpu: async (onLine: (line: string) => void): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/separator/gpu/install-gpu', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          onLine(data);
        }
      }
    }
  },

  installCpu: async (onLine: (line: string) => void): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/separator/gpu/install-cpu', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          onLine(data);
        }
      }
    }
  },
};
