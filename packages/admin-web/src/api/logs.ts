import client from './client';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface LogQueryParams {
  level?: string;
  service?: string;
  keyword?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export async function fetchLogs(params: LogQueryParams = {}): Promise<{ logs: LogEntry[]; total: number }> {
  const { data } = await client.get('/system/logs', { params });
  return data.data;
}

export async function fetchLogStats(): Promise<Record<string, Record<string, number>>> {
  const { data } = await client.get('/system/logs/stats');
  return data.data;
}

export function connectLogStream(
  filters: { level?: string; service?: string },
  onMessage: (entry: LogEntry) => void,
  onError?: (err: Event) => void,
): WebSocket {
  const params = new URLSearchParams();
  if (filters.level) params.set('level', filters.level);
  if (filters.service) params.set('service', filters.service);
  const token = localStorage.getItem('token');
  if (token) params.set('token', token);
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const qs = params.toString();
  const url = `${protocol}//${host}/ws/logs${qs ? '?' + qs : ''}`;
  
  const ws = new WebSocket(url);
  
  ws.onmessage = (event) => {
    try {
      const entry = JSON.parse(event.data) as LogEntry;
      onMessage(entry);
    } catch {
      // ignore parse errors
    }
  };
  
  if (onError) {
    ws.onerror = onError;
  }
  
  return ws;
}
