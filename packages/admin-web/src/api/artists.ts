import client from './client';
import type {
  Artist,
  ArtistListParams,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export interface ArtistCreateParams {
  name: string;
  bio?: string;
  avatar?: string | null;
}

export interface ArtistUpdateParams {
  name?: string;
  bio?: string;
  avatar?: string | null;
}

export const artistsApi = {
  list: (params?: ArtistListParams): Promise<PaginatedResponse<Artist>> =>
    client
      .get<ApiResponse<PaginatedResponse<Artist>>>('/artists', { params })
      .then((res) => res.data.data),
  create: (data: ArtistCreateParams): Promise<Artist> =>
    client
      .post<ApiResponse<Artist>>('/artists', data)
      .then((res) => res.data.data),
  update: (id: number, data: ArtistUpdateParams): Promise<Artist> =>
    client
      .put<ApiResponse<Artist>>(`/artists/${id}`, data)
      .then((res) => res.data.data),
  delete: (id: number): Promise<void> =>
    client.delete<ApiResponse<null>>(`/artists/${id}`).then(() => undefined),
  merge: (sourceId: number, targetId: number): Promise<Artist> =>
    client
      .post<ApiResponse<Artist>>('/artists/merge', { sourceId, targetId })
      .then((res) => res.data.data),
};
