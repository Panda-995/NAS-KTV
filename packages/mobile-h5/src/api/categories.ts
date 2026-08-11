import client from './client';
import type { CategoryGroup, CategoryItem, ApiResponse } from '@nasktv/shared';

export const categoriesApi = {
  getCategories: (): Promise<CategoryGroup[]> =>
    client.get<ApiResponse<CategoryGroup[]>>('/categories')
      .then(res => res.data.data),
  getItems: (categoryId?: number): Promise<CategoryItem[]> =>
    client.get<ApiResponse<CategoryItem[]>>('/category-items', { params: { categoryId } })
      .then(res => res.data.data),
};
