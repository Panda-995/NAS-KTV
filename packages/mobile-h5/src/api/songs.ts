import client from './client';
import type { Song, ApiResponse, PaginatedResponse } from '@nasktv/shared';

export interface SongListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  artistId?: number;
  categoryId?: number;
}

export const songsApi = {
  getSongs: (params?: SongListParams): Promise<PaginatedResponse<Song>> =>
    client.get<ApiResponse<PaginatedResponse<Song>>>('/songs', { params })
      .then(res => res.data.data),
  getHotSongs: (limit: number = 20): Promise<Song[]> =>
    client.get<ApiResponse<Song[]>>('/songs/hot', { params: { limit } })
      .then(res => res.data.data),
  getSongsByArtist: (artistId: number, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Song>> =>
    client.get<ApiResponse<PaginatedResponse<Song>>>('/songs', { params: { artistId, page, pageSize } })
      .then(res => res.data.data),
  getSongsByCategory: (categoryItemId: number, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Song>> =>
    client.get<ApiResponse<PaginatedResponse<Song>>>('/songs', { params: { categoryItemId, page, pageSize } })
      .then(res => res.data.data),
};
