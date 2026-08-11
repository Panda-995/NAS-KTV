import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import * as schema from '../../../shared/src/schema';

const dbDir = path.dirname(path.resolve(config.dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite: InstanceType<typeof Database> = new Database(path.resolve(config.dbPath));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };
export { schema };
