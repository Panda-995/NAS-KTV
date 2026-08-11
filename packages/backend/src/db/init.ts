import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import logger from '../logger';
import { db, schema } from './index';
import { config } from '../config';

const SALT_ROUNDS = 10;

export async function initDatabase() {
  try {
    const existingAdmin = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, config.adminUsername))
      .get();

    if (existingAdmin) {
      logger.info('Admin user "%s" already exists, skipping creation', config.adminUsername);
      return;
    }

    const passwordHash = await bcrypt.hash(config.adminPassword, SALT_ROUNDS);

    db.insert(schema.users)
      .values({
        username: config.adminUsername,
        passwordHash,
        role: 'admin',
      })
      .run();

    logger.info('Default admin user "%s" created successfully', config.adminUsername);
  } catch (err) {
    logger.error(err, 'Database initialization failed');
    throw err;
  }
}
