import client from './client';
import type { AuthResponse, User, ApiResponse } from '../types';

export const authApi = {
  login: (username: string, password: string): Promise<AuthResponse> =>
    client
      .post<ApiResponse<AuthResponse>>('/auth/login', { username, password })
      .then((res) => res.data.data),
  logout: (): Promise<void> =>
    client.post<ApiResponse<null>>('/auth/logout').then(() => undefined),
  me: (): Promise<User> =>
    client
      .get<ApiResponse<{ user: User }>>('/auth/me')
      .then((res) => res.data.data.user),
};
