import client from './client';
import type {
  Category,
  CategoryGroup,
  CategoryItem,
  ApiResponse,
} from '../types';

export interface CategoryGroupCreateParams {
  name: string;
}

export interface CategoryGroupUpdateParams {
  name?: string;
  sortOrder?: number;
}

export interface CategoryItemCreateParams {
  categoryId: number;
  name: string;
}

export interface CategoryItemUpdateParams {
  name?: string;
  sortOrder?: number;
}

export const categoriesApi = {
  // 分类组 CRUD
  list: (): Promise<CategoryGroup[]> =>
    client
      .get<ApiResponse<CategoryGroup[]>>('/categories')
      .then((res) => res.data.data),
  createGroup: (data: CategoryGroupCreateParams): Promise<Category> =>
    client
      .post<ApiResponse<Category>>('/categories', data)
      .then((res) => res.data.data),
  updateGroup: (id: number, data: CategoryGroupUpdateParams): Promise<Category> =>
    client
      .put<ApiResponse<Category>>(`/categories/${id}`, data)
      .then((res) => res.data.data),
  deleteGroup: (id: number): Promise<void> =>
    client
      .delete<ApiResponse<null>>(`/categories/${id}`)
      .then(() => undefined),

  // 分类项 CRUD
  listItems: (categoryId?: number): Promise<CategoryItem[]> =>
    client
      .get<ApiResponse<CategoryItem[]>>('/category-items', {
        params: { categoryId },
      })
      .then((res) => res.data.data),
  createItem: (data: CategoryItemCreateParams): Promise<CategoryItem> =>
    client
      .post<ApiResponse<CategoryItem>>('/category-items', data)
      .then((res) => res.data.data),
  updateItem: (id: number, data: CategoryItemUpdateParams): Promise<CategoryItem> =>
    client
      .put<ApiResponse<CategoryItem>>(`/category-items/${id}`, data)
      .then((res) => res.data.data),
  deleteItem: (id: number): Promise<void> =>
    client
      .delete<ApiResponse<null>>(`/category-items/${id}`)
      .then(() => undefined),

  // 分配歌曲到分类项
  assignSong: (songId: number, categoryItemId: number): Promise<void> =>
    client
      .post<ApiResponse<null>>('/category-items/assign', {
        songId,
        categoryItemId,
      })
      .then(() => undefined),
};
