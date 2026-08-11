import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { sqlite } from '../db';
import logger from '../logger';

const BACKUP_DIR = path.resolve(config.projectRoot, 'data/backups');

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
}

/**
 * 创建数据库备份
 * 使用 better-sqlite3 的 backup API，安全在线备份
 */
export async function createBackup(): Promise<BackupInfo> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `nasktv_backup_${timestamp}.sqlite`;
  const backupPath = path.join(BACKUP_DIR, filename);

  logger.info(`Starting database backup to ${backupPath}`);

  await sqlite.backup(backupPath);

  const stat = fs.statSync(backupPath);
  logger.info(`Backup completed: ${filename} (${stat.size} bytes)`);

  return {
    filename,
    size: stat.size,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 获取备份列表
 */
export function listBackups(): BackupInfo[] {
  ensureBackupDir();

  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite')).sort().reverse();

  return files.map(filename => {
    const stat = fs.statSync(path.join(BACKUP_DIR, filename));
    return {
      filename,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
    };
  });
}

/**
 * 获取备份文件路径
 */
export function getBackupPath(filename: string): string | null {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

/**
 * 删除备份文件
 */
export function deleteBackup(filename: string): boolean {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  logger.info(`Deleted backup: ${filename}`);
  return true;
}

/**
 * 恢复数据库备份
 * 将备份文件替换当前数据库，需要重启服务才能生效
 */
export async function restoreBackup(filename: string): Promise<void> {
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }

  const dbPath = path.resolve(config.dbPath);
  const dbDir = path.dirname(dbPath);
  const tempPath = dbPath + '.restore';

  logger.info(`Restoring database from ${filename}`);

  // 复制备份到临时位置
  fs.copyFileSync(backupPath, tempPath);

  // 关闭当前连接并替换文件
  sqlite.close();
  fs.copyFileSync(tempPath, dbPath);
  fs.unlinkSync(tempPath);

  // 删除 WAL 和 SHM 文件
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  logger.info('Database restored successfully. Service restart required.');
}
