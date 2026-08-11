import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, schema } from '../db';
import { config } from '../config';

export interface TokenPayload {
  userId: number;
  role: string;
  exp: number;
}

export interface LoginResult {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .get();

  if (!user) {
    throw Object.assign(new Error('用户名不存在'), { statusCode: 401 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw Object.assign(new Error('密码错误'), { statusCode: 401 });
  }

  const payload: TokenPayload = {
    userId: user.id,
    role: user.role || 'admin',
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };

  const token = jwt.sign(payload, config.jwtSecret);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role || 'admin',
    },
  };
}

export function getUserById(userId: number) {
  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  };
}