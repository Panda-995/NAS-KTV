import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

/** 运行时切换后端地址（设置页保存配置后调用，生产 APK 不再依赖构建时 VITE_API_BASE_URL） */
export function setApiBaseUrl(url: string): void {
  // 后端路由挂在 /api 下，确保 URL 包含 /api 后缀
  const base = url.replace(/\/+$/, '');
  client.defaults.baseURL = base.endsWith('/api') ? base : `${base}/api`;
}

export default client;
