import { exists, readTextFile, writeTextFile, mkdir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { isTauri } from '@tauri-apps/api/core';

const CONFIG_FILE = 'backend-config.json';
const CONFIG_STORAGE_KEY = 'nasktv:backend-config';

// 检测当前是否运行在 Tauri 外壳内
function isTauriEnvironment(): boolean {
  return isTauri();
}

export interface BackendConfig {
  apiUrl: string;
  wsUrl: string;
}

function deriveWsUrl(apiUrl: string): string {
  return apiUrl.replace(/^http/, 'ws').replace(/\/+$/, '');
}

/**
 * 读取后端配置。优先级：运行时持久化配置 > 构建时 VITE_API_BASE_URL / VITE_WS_BASE_URL
 * 返回 null 表示两者都无（首次使用，进入设置页）
 */
export async function loadBackendConfig(): Promise<BackendConfig | null> {
  if (isTauriEnvironment()) {
    try {
      const dataDir = await appDataDir();
      const filePath = await join(dataDir, CONFIG_FILE);
      if (await exists(filePath)) {
        const raw = await readTextFile(filePath);
        const cfg = JSON.parse(raw) as BackendConfig;
        if (cfg?.apiUrl) return cfg;
      }
    } catch (e) {
      console.error('Failed to load backend config file:', e);
    }
  } else {
    try {
      const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        const cfg = JSON.parse(raw) as BackendConfig;
        if (cfg?.apiUrl) return cfg;
      }
    } catch (e) {
      console.error('Failed to load backend config from localStorage:', e);
    }
  }

  // 兜底：构建时配置（浏览器开发 / 反代部署模式）
  const buildTimeApi = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (buildTimeApi) {
    return { apiUrl: buildTimeApi.replace(/\/+$/, ''), wsUrl: deriveWsUrl(buildTimeApi) };
  }
  return null;
}

/**
 * 保存后端配置（Tauri 优先写入应用数据目录文件，失败则回退到 localStorage）
 */
export async function saveBackendConfig(apiUrl: string): Promise<BackendConfig> {
  const normalized = apiUrl.trim().replace(/\/+$/, '');
  const cfg: BackendConfig = { apiUrl: normalized, wsUrl: deriveWsUrl(normalized) };

  if (isTauriEnvironment()) {
    let fileError: unknown;
    try {
      const dataDir = await appDataDir();
      const filePath = await join(dataDir, CONFIG_FILE);
      await mkdir(dataDir, { recursive: true });
      await writeTextFile(filePath, JSON.stringify(cfg));
      return cfg;
    } catch (e) {
      fileError = e;
      console.warn('Tauri app data write failed, falling back to localStorage:', e);
    }

    // 文件写入失败时回退到 localStorage，避免 .exe 在权限受限环境完全不可用
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
      return cfg;
    } catch (storageErr) {
      const details =
        (fileError instanceof Error ? fileError.message : String(fileError)) ||
        'unknown file error';
      throw new Error(`配置保存失败：${details}`);
    }
  } else {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  }
  return cfg;
}

/**
 * 清除保存的后端配置（设置页「重新配置」用），恢复首次使用状态
 */
export async function resetBackendConfig(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const dataDir = await appDataDir();
      const filePath = await join(dataDir, CONFIG_FILE);
      if (await exists(filePath)) {
        await remove(filePath);
      }
    } catch (e) {
      console.error('Failed to reset backend config file:', e);
    }
  } else {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }
}
