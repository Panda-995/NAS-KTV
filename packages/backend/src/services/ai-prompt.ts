import logger from '../logger';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';

export interface AiParseResult {
  title: string;
  artists: string[];
  album?: string;
  year?: number;
  genre?: string;
  language?: string;
  mood?: string;
  confidence: number;
}

interface SongInfo {
  id: number;
  title: string;
  filePath: string;
  fileType: string;
  artistName?: string;
}

const PROMPT_TEMPLATE_KEY = 'ai_prompt_template';

export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的音乐元数据解析助手。你的任务是分析歌曲文件信息，推断出歌曲的完整元数据。

你需要返回一个JSON对象，包含以下字段：
- title: 歌曲标题（字符串）
- artists: 歌手名数组。若为多人合唱/对唱，必须列出全部歌手名；单人演唱则数组只含一个歌手名
- album: 专辑名（字符串，可选）
- year: 发行年份（数字，可选）
- genre: 音乐风格（字符串，可选）
- language: 语种（字符串，可选）
- mood: 心情标签（字符串，可选）
- confidence: 置信度（0-1之间的数字，表示你对解析结果的信心）

语种可选值：国语、粤语、英语、日语、韩语、闽南语、其他
风格可选值：流行、摇滚、民谣、古典、电子、说唱、R&B、爵士、其他
心情可选值：伤感、欢快、励志、浪漫、激情、安静、思念、其他

请只返回JSON对象，不要包含其他文字。`;

export const DEFAULT_USER_PROMPT_TEMPLATE = `请解析以下歌曲信息：

文件名: {fileName}
当前标题: {title}
当前歌手: {artistName}
文件类型: {fileType}

已有歌手参考列表（如果匹配请使用已有歌手名）：
{existingArtists}

已有分类参考：
{existingCategories}

请根据文件名和已有信息，推断歌曲的完整元数据，并以JSON格式返回。`;

/**
 * 获取已有歌手列表（用于参考）
 */
async function getExistingArtists(limit: number = 200): Promise<string[]> {
  try {
    const result = db
      .select({ name: schema.artists.name })
      .from(schema.artists)
      .limit(limit)
      .all();
    
    return result.map(r => r.name);
  } catch (error) {
    logger.error('Failed to get existing artists:', error);
    return [];
  }
}

/**
 * 获取已有分类列表（用于参考）
 */
async function getExistingCategories(): Promise<{
  groups: Array<{ name: string; items: string[] }>;
}> {
  try {
    const groups = db.select().from(schema.categories).all();

    const result: Array<{ name: string; items: string[] }> = [];

    for (const group of groups) {
      const items = db
        .select({ name: schema.categoryItems.name })
        .from(schema.categoryItems)
        .where(eq(schema.categoryItems.categoryId, group.id))
        .all();

      result.push({
        name: group.name,
        items: items.map(i => i.name)
      });
    }

    return { groups: result };
  } catch (error) {
    logger.error('Failed to get existing categories:', error);
    return { groups: [] };
  }
}

export function getPromptTemplate(): { systemPrompt: string; userPromptTemplate: string } {
  try {
    const row = db.select().from(schema.settings).where(eq(schema.settings.key, PROMPT_TEMPLATE_KEY)).get();
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      return {
        systemPrompt: parsed.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        userPromptTemplate: parsed.userPromptTemplate || DEFAULT_USER_PROMPT_TEMPLATE,
      };
    }
  } catch (e) {
    logger.error('Failed to get prompt template:', e);
  }
  return { systemPrompt: DEFAULT_SYSTEM_PROMPT, userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE };
}

export function updatePromptTemplate(systemPrompt: string, userPromptTemplate: string): void {
  const existing = db.select().from(schema.settings).where(eq(schema.settings.key, PROMPT_TEMPLATE_KEY)).get();
  const value = JSON.stringify({ systemPrompt, userPromptTemplate });
  if (!existing) {
    db.insert(schema.settings).values({ key: PROMPT_TEMPLATE_KEY, value }).run();
  } else {
    db.update(schema.settings).set({ value }).where(eq(schema.settings.key, PROMPT_TEMPLATE_KEY)).run();
  }
}

export async function buildParsePrompt(
  songInfo: SongInfo,
  options?: { existingArtists?: string[]; existingCategories?: { groups: Array<{ name: string; items: string[] }> } }
): Promise<Array<{ role: string; content: string }>> {
  const existingArtists = options?.existingArtists || await getExistingArtists();
  const existingCategories = options?.existingCategories || await getExistingCategories();
  const fileName = songInfo.filePath.split('/').pop() || songInfo.filePath.split('\\').pop() || songInfo.title;

  const { systemPrompt, userPromptTemplate } = getPromptTemplate();

  const userPrompt = userPromptTemplate
    .replace(/\{fileName\}/g, fileName)
    .replace(/\{title\}/g, songInfo.title)
    .replace(/\{artistName\}/g, songInfo.artistName || '未知')
    .replace(/\{fileType\}/g, songInfo.fileType)
    .replace(/\{existingArtists\}/g, existingArtists.join('、'))
    .replace(/\{existingCategories\}/g, existingCategories.groups.map(g => `${g.name}: ${g.items.join('、')}`).join('\n'));

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * 拆分歌手字符串为歌手名数组。
 * 支持「、」「/」「,」「，」「&」「×」等分隔符及 feat./ft./with 等协作标记，去空去重。
 */
const ARTIST_SPLIT_REGEX = /[、/,，&×;；]/;

export function splitArtists(input: string): string[] {
  const parts = input
    .replace(/\s+(?:feat\.?|ft\.?|with|vs\.?|featuring)\s+/gi, ',')
    .split(ARTIST_SPLIT_REGEX);
  const result: string[] = [];
  for (const p of parts) {
    const name = p.trim().replace(/^【|】$/g, '');
    if (!name) continue;
    if (!result.includes(name)) result.push(name);
  }
  return result;
}

export function parseAiResponse(response: string): AiParseResult | null {
  try {
    let result = JSON.parse(response);

    if (typeof result === 'string') {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      }
    }

    if (!result.title) {
      return null;
    }

    let artists: string[] = [];
    if (Array.isArray(result.artists)) {
      for (const a of result.artists) {
        artists.push(...splitArtists(String(a)));
      }
    } else if (typeof result.artist === 'string') {
      artists = splitArtists(result.artist);
    }
    artists = artists.filter((n) => n && n !== '未知' && n !== '未知歌手');
    if (artists.length === 0) {
      return null;
    }

    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5;
    }
    
    return {
      title: String(result.title),
      artists,
      album: result.album ? String(result.album) : undefined,
      year: result.year ? Number(result.year) : undefined,
      genre: result.genre ? String(result.genre) : undefined,
      language: result.language ? String(result.language) : undefined,
      mood: result.mood ? String(result.mood) : undefined,
      confidence: Number(result.confidence)
    };
  } catch (error) {
    logger.error('Failed to parse AI response:', error);
    logger.error('Response:', response);
    return null;
  }
}
