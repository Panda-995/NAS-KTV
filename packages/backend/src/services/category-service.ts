import { eq, and, sql, asc, inArray } from 'drizzle-orm';
import { db, schema } from '../db';
import type { Category, CategoryGroup, CategoryItem } from '@nasktv/shared';

const { categories, categoryItems, songCategories } = schema;

/**
 * 查询所有分类组（含分类项列表），按 sortOrder 升序
 */
export async function getCategories(): Promise<CategoryGroup[]> {
  const groups = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));

  if (groups.length === 0) {
    return [];
  }

  const items = await db
    .select({
      id: categoryItems.id,
      categoryId: categoryItems.categoryId,
      name: categoryItems.name,
      sortOrder: categoryItems.sortOrder,
      source: categoryItems.source,
    })
    .from(categoryItems)
    .orderBy(asc(categoryItems.sortOrder), asc(categoryItems.id));

  const counts = await db
    .select({
      categoryItemId: songCategories.categoryItemId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(songCategories)
    .groupBy(songCategories.categoryItemId);

  const countMap = new Map(counts.map(c => [c.categoryItemId, c.count]));

  const itemsByCategory = new Map<number | null, CategoryItem[]>();
  for (const item of items) {
    const withCount: CategoryItem = { ...item, songCount: countMap.get(item.id) ?? 0 };
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(withCount);
    itemsByCategory.set(item.categoryId, list);
  }

  return groups.map((group: typeof categories.$inferSelect) => ({
    ...group,
    items: itemsByCategory.get(group.id) ?? [],
  }));
}

/**
 * 根据 ID 查询分类组
 */
export async function getCategoryById(id: number): Promise<Category | null> {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 创建分类组：sortOrder=当前最大+1
 */
export async function createCategory(data: {
  name: string;
}): Promise<Category> {
  const maxResult = await db
    .select({ maxSort: sql<number>`COALESCE(MAX(${categories.sortOrder}), 0)` })
    .from(categories);

  const nextSort = (maxResult[0]?.maxSort ?? 0) + 1;

  const [category] = await db
    .insert(categories)
    .values({
      name: data.name,
      sortOrder: nextSort,
      createdAt: new Date(),
    })
    .returning();

  return category;
}

/**
 * 更新分类组：name / sortOrder
 */
export async function updateCategory(
  id: number,
  data: { name?: string; sortOrder?: number }
): Promise<Category | null> {
  const updateData: Partial<typeof categories.$inferInsert> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.sortOrder !== undefined) {
    updateData.sortOrder = data.sortOrder;
  }

  const [category] = await db
    .update(categories)
    .set(updateData)
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

/**
 * 删除分类组：先删除其下所有 categoryItems（及其 song_categories 关联）
 */
export async function deleteCategory(id: number): Promise<void> {
  // 查询该分类下所有分类项 ID
  const items = await db
    .select({ id: categoryItems.id })
    .from(categoryItems)
    .where(eq(categoryItems.categoryId, id));

  if (items.length > 0) {
    const itemIds = items.map((i: { id: number }) => i.id);
    // 删除 song_categories 关联
    await db
      .delete(songCategories)
      .where(inArray(songCategories.categoryItemId, itemIds));
    // 删除分类项
    await db
      .delete(categoryItems)
      .where(eq(categoryItems.categoryId, id));
  }

  await db.delete(categories).where(eq(categories.id, id));
}

/**
 * 查询分类项列表（可按 categoryId 过滤），每个含 songCount
 */
export async function getCategoryItems(
  categoryId?: number
): Promise<CategoryItem[]> {
  const whereClause = categoryId
    ? eq(categoryItems.categoryId, categoryId)
    : undefined;

  const items = await db
    .select({
      id: categoryItems.id,
      categoryId: categoryItems.categoryId,
      name: categoryItems.name,
      sortOrder: categoryItems.sortOrder,
    })
    .from(categoryItems)
    .where(whereClause)
    .orderBy(asc(categoryItems.sortOrder), asc(categoryItems.id));

  const itemIds = items.map(i => i.id);
  if (itemIds.length === 0) return [];

  const counts = await db
    .select({
      categoryItemId: songCategories.categoryItemId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(songCategories)
    .where(inArray(songCategories.categoryItemId, itemIds))
    .groupBy(songCategories.categoryItemId);

  const countMap = new Map(counts.map(c => [c.categoryItemId, c.count]));

  return items.map(item => ({
    ...item,
    songCount: countMap.get(item.id) ?? 0,
  })) as CategoryItem[];
}

/**
 * 创建分类项
 */
export async function createCategoryItem(data: {
  categoryId: number;
  name: string;
}): Promise<CategoryItem> {
  const maxResult = await db
    .select({
      maxSort: sql<number>`COALESCE(MAX(${categoryItems.sortOrder}), 0)`,
    })
    .from(categoryItems)
    .where(eq(categoryItems.categoryId, data.categoryId));

  const nextSort = (maxResult[0]?.maxSort ?? 0) + 1;

  const [item] = await db
    .insert(categoryItems)
    .values({
      categoryId: data.categoryId,
      name: data.name,
      sortOrder: nextSort,
      songCount: 0,
      source: 'manual',
    })
    .returning();

  return { ...item, songCount: item.songCount ?? 0 };
}

/**
 * 更新分类项：name / sortOrder
 */
export async function updateCategoryItem(
  id: number,
  data: { name?: string; sortOrder?: number }
): Promise<CategoryItem | null> {
  const updateData: Partial<typeof categoryItems.$inferInsert> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.sortOrder !== undefined) {
    updateData.sortOrder = data.sortOrder;
  }

  const [item] = await db
    .update(categoryItems)
    .set(updateData)
    .where(eq(categoryItems.id, id))
    .returning();

  return item ? { ...item, songCount: item.songCount ?? 0 } : null;
}

/**
 * 删除分类项：先删除 song_categories 关联
 */
export async function deleteCategoryItem(id: number): Promise<void> {
  await db.delete(songCategories).where(eq(songCategories.categoryItemId, id));
  await db.delete(categoryItems).where(eq(categoryItems.id, id));
}

/**
 * 分配歌曲到分类项：若已存在则忽略（不报错、不重复）
 */
export async function assignSongToCategory(
  songId: number,
  categoryItemId: number
): Promise<void> {
  const existing = await db
    .select({ id: songCategories.id })
    .from(songCategories)
    .where(
      and(
        eq(songCategories.songId, songId),
        eq(songCategories.categoryItemId, categoryItemId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(songCategories).values({
    songId,
    categoryItemId,
    source: 'manual',
  });
}
