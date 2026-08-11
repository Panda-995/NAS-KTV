import { exists, readTextFile, writeTextFile, mkdir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { isTauri } from '@tauri-apps/api/core';

const DEVICE_ID_FILE = 'device-id.txt';
const DEVICE_ID_STORAGE_KEY = 'nasktv:device-id';
const ROOM_CODE_STORAGE_KEY = 'nasktv:room-code';

// 检测当前是否运行在 Tauri 外壳内
function isTauriEnvironment(): boolean {
  return isTauri();
}

export async function getDeviceId(): Promise<string> {
  // 浏览器环境：用 localStorage 持久化，避免调用 Tauri IPC 报错
  if (!isTauriEnvironment()) {
    return getDeviceIdFromLocalStorage();
  }

  // Tauri 环境：用文件系统持久化
  const dataDir = await appDataDir();
  const filePath = await join(dataDir, DEVICE_ID_FILE);

  try {
    if (await exists(filePath)) {
      return await readTextFile(filePath);
    }
  } catch (e) {
    // 文件不存在或读取失败，继续生成新 ID
  }

  // 生成新 UUID v4
  const deviceId = generateUUID();

  try {
    // 确保目录存在
    try {
      await mkdir(dataDir, { recursive: true });
    } catch (e) {
      // 目录可能已存在
    }
    await writeTextFile(filePath, deviceId);
  } catch (e) {
    console.error('Failed to persist device ID:', e);
  }

  return deviceId;
}

/**
 * 清除本地 deviceId（用于设备被管理员删除后重新生成）
 */
export async function clearDeviceId(): Promise<void> {
  // 同时清除缓存的 roomCode
  clearRoomCode();

  if (!isTauriEnvironment()) {
    localStorage.removeItem(DEVICE_ID_STORAGE_KEY);
    return;
  }

  // Tauri 环境：删除文件
  try {
    const dataDir = await appDataDir();
    const filePath = await join(dataDir, DEVICE_ID_FILE);
    if (await exists(filePath)) {
      await remove(filePath);
    }
  } catch (e) {
    console.error('Failed to clear device ID:', e);
  }
}

/**
 * 缓存 roomCode（用于启动时验证设备是否仍存在）
 */
export function getStoredRoomCode(): string | null {
  return localStorage.getItem(ROOM_CODE_STORAGE_KEY);
}

export function setStoredRoomCode(code: string): void {
  localStorage.setItem(ROOM_CODE_STORAGE_KEY, code);
}

export function clearRoomCode(): void {
  localStorage.removeItem(ROOM_CODE_STORAGE_KEY);
}

// 浏览器环境下的 deviceId 存取
function getDeviceIdFromLocalStorage(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
