import client from './client';
import type { Artist, ApiResponse, PaginatedResponse } from '@nasktv/shared';

export const artistsApi = {
  getArtists: (params?: { keyword?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Artist>> =>
    client.get<ApiResponse<PaginatedResponse<Artist>>>('/artists', { params })
      .then(res => res.data.data),
  getArtistById: (id: number): Promise<Artist | null> =>
    client.get<ApiResponse<Artist>>(`/artists/${id}`)
      .then(res => res.data.data),
};
