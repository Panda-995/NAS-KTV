import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';
import logger from '../logger';
import { db } from './index';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../drizzle');

export function runMigrations() {
  if (!fs.existsSync(MIGRATIONS_FOLDER)) {
    logger.warn('Migration folder not found at %s, skipping migrations', MIGRATIONS_FOLDER);
    logger.info('Run "npx drizzle-kit generate" to create migration files');
    return;
  }

  const migrationFiles = fs.readdirSync(MIGRATIONS_FOLDER)
    .filter((f) => f.endsWith('.sql'));

  if (migrationFiles.length === 0) {
    logger.warn('No migration SQL files found in %s, skipping', MIGRATIONS_FOLDER);
    return;
  }

  try {
    logger.info('Running database migrations from %s', MIGRATIONS_FOLDER);
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    logger.info('Database migrations completed successfully');
  } catch (err) {
    logger.error(err, 'Database migration failed');
    throw err;
  }
}
