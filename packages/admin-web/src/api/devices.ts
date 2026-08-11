import client from './client';
import type {
  Device,
  AuthorizeParams,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export interface DeviceListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface DeviceRenameParams {
  name: string;
}

export interface DeviceRenewParams {
  expiresAt?: string;
}

export const devicesApi = {
  list: (params?: DeviceListParams): Promise<PaginatedResponse<Device>> =>
    client
      .get<ApiResponse<PaginatedResponse<Device>>>('/devices', { params })
      .then((res) => res.data.data),
  authorize: (id: number, data: AuthorizeParams): Promise<Device> =>
    client
      .post<ApiResponse<Device>>(`/devices/${id}/authorize`, data)
      .then((res) => res.data.data),
  revoke: (id: number): Promise<Device> =>
    client
      .post<ApiResponse<Device>>(`/devices/${id}/revoke`)
      .then((res) => res.data.data),
  renew: (id: number, data: DeviceRenewParams): Promise<Device> =>
    client
      .post<ApiResponse<Device>>(`/devices/${id}/renew`, data)
      .then((res) => res.data.data),
  rename: (id: number, data: DeviceRenameParams): Promise<Device> =>
    client
      .put<ApiResponse<Device>>(`/devices/${id}/name`, data)
      .then((res) => res.data.data),
  delete: (id: number): Promise<Device> =>
    client
      .delete<ApiResponse<Device>>(`/devices/${id}`)
      .then((res) => res.data.data),
};
