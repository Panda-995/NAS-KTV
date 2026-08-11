import logger from '../logger';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db';

const { categories, categoryItems } = schema;

const DEFAULT_CATEGORIES = [
  {
    name: '语种',
    items: ['国语', '粤语', '英语', '日语', '韩语', '闽南语', '其他']
  },
  {
    name: '年代',
    items: ['70年代', '80年代', '90年代', '00年代', '10年代', '20年代']
  },
  {
    name: '风格',
    items: ['流行', '摇滚', '民谣', '古典', '电子', '说唱', 'R&B', '爵士', '其他']
  },
  {
    name: '心情',
    items: ['伤感', '欢快', '励志', '浪漫', '激情', '安静', '思念', '其他']
  },
  {
    name: '未知',
    items: ['未知']
  }
];

export async function initializeDefaultCategories(): Promise<void> {
  logger.info('Initializing default categories...');
  
  for (let groupIndex = 0; groupIndex < DEFAULT_CATEGORIES.length; groupIndex++) {
    const group = DEFAULT_CATEGORIES[groupIndex];
    
    const existingGroup = await db
      .select()
      .from(categories)
      .where(eq(categories.name, group.name))
      .limit(1);
    
    let categoryId: number;
    
    if (existingGroup.length === 0) {
      const [newCategory] = await db
        .insert(categories)
        .values({
          name: group.name,
          sortOrder: groupIndex
        })
        .returning();
      
      categoryId = newCategory.id;
      logger.info(`Created category group: ${group.name}`);
    } else {
      categoryId = existingGroup[0].id;
      logger.info(`Category group already exists: ${group.name}`);
    }
    
    for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
      const itemName = group.items[itemIndex];
      
      const existingItem = await db
        .select()
        .from(categoryItems)
        .where(eq(categoryItems.name, itemName))
        .limit(1);
      
      if (existingItem.length === 0) {
        await db
          .insert(categoryItems)
          .values({
            categoryId: categoryId,
            name: itemName,
            sortOrder: itemIndex
          });
        
        logger.info(`Created category item: ${group.name} > ${itemName}`);
      }
    }
  }
  
  logger.info('Default categories initialized successfully');
}

export async function isDefaultCategoriesInitialized(): Promise<boolean> {
  const result = await db
    .select()
    .from(categories)
    .limit(1);
  
  return result.length > 0;
}