/**
 * 通用歌曲信息识别脚本（非 AI 本地识别）
 *
 * 扫描导入时用于从音频 ID3 标签、文件名、目录结构中推断歌曲名与歌手：
 *   1. 音频文件优先读取 ID3 标签（标题 / 歌手 / 专辑）
 *   2. 标签缺失时解析文件名（支持 `歌手 - 歌名`、`歌名 - 歌手`、`[歌手]歌名` 等常见格式）
 *   3. 仍未识别出歌手时，使用父目录名兜底（排除通用目录名）
 *
 * 同时提供"未知"兜底能力：
 *   - 没有歌手的歌曲分配到「未知歌手」
 *   - 没有分类的歌曲分配到「未知」分类
 *   待后续（AI 解析 / 手动编辑）识别到真实信息后再移除兜底。
 */

import * as path from 'path';
import { eq, and } from 'drizzle-orm';
import logger from '../logger';
import { db, schema } from '../db';
import { config } from '../config';
import { getPinyin, getFirstLetter } from '@nasktv/shared';
import { parseAudioTags, getFileType, type AudioTags } from './id3';

/** 未知歌手名称（无歌手歌曲的默认归属） */
export const UNKNOWN_ARTIST_NAME = '未知歌手';
/** 未知分类组名称 */
export const UNKNOWN_CATEGORY_GROUP = '未知';
/** 未知分类项名称 */
export const UNKNOWN_CATEGORY_NAME = '未知';

/**
 * 酷我音乐下载文件名归一化：
 * 酷我客户端把 `&` 写成字面 `u0026`（JSON 转义损坏，反斜杠被吞），
 * 如 `王铮亮、、u0026谭松韵-小半 (Live).mp4` → `王铮亮、、&谭松韵-小半 (Live).mp4`
 * ID3 标签中可能残留单个/多个反斜杠（`\u0026`、`\\u0026`），一并归一化。
 */
export function normalizeKwName(value: string): string {
  return value.replace(/\\*u0026/gi, '&').trim();
}

/**
 * 拆分多歌手字符串（如 `王铮亮&谭松韵`、`王铮亮、谭松韵`、`王铮亮/谭松韵`），
 * 返回去重后的歌手列表（过滤空串）。单歌手时返回单元素数组。
 */
export function splitArtistNames(value: string | null): string[] {
  if (!value) return [];
  const parts = value
    .split(/&|、|，|,|；|;|\/|\\/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return [...new Set(parts)];
}

export interface SongInfo {
  title: string;
  artist: string | null;
  /** 多歌手歌曲中除主歌手外的合作歌手（position 依次 1..n） */
  secondaryArtists: string[];
  album: string | null;
}

export interface ParsedName {
  title: string;
  artist: string | null;
}

/** 通用目录名，不作为歌手兜底 */
const GENERIC_DIR_NAMES = new Set([
  'songs',
  'music',
  'musics',
  'mv',
  'mvs',
  'video',
  'videos',
  'media',
  'audio',
  'album',
  'albums',
  'ktv',
  'singer',
  'artists',
  'downloads',
  'download',
  'unknown',
  '歌曲',
  '音乐',
  '歌',
  '歌曲库',
  '音乐库',
  '歌库',
  '媒体',
  '视频',
  '音乐文件',
  '精选',
  '合集',
  'data',
]);

/** 括号/标注中的品质与版本关键词（含这些内容的括号整体移除） */
const META_PATTERN =
  /(?:320k|192k|128k|flac|ape|wav|dts|dsd|hires|hi-res|hd|sq|mv|live|ktv|伴奏|原版|原唱|官方|无损|高音质|高清|4k|1080p|720p|2160p|试听|铃声|现场版|演唱会版|录音室版|重制版|正式版|官方版|中文版|粤语版|国语版|翻唱|remix|cover|karaoke|instrumental|acoustic|unplugged)/i;

/** 文件名尾部的裸品质/版本词（无括号包裹时移除） */
const TRAILING_META_PATTERN =
  /\s+(?:mv|live|ktv|伴奏|原版|原唱|官方|无损|高清|现场版|演唱会版|翻唱|4k|1080p|720p|320k|flac|remix|cover|karaoke|instrumental|acoustic)$/i;

/**
 * 清洗标注信息：
 *   - 移除含品质/版本关键词的括号内容（`(FLAC)`、`[320K]` 等）
 *   - 移除尾部裸品质词（` 晴天 MV` → `晴天`）
 *   - 压缩多余空格
 */
export function stripMetaBrackets(text: string): string {
  return text
    .replace(/[\[\(（][^\]\)）]*[\]\)）]/g, (m) => (META_PATTERN.test(m) ? '' : m))
    .replace(TRAILING_META_PATTERN, '')
    .replace(/\s*[-–—~]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** 判断歌手名是否已存在于歌手库（用于区分 `歌手 - 歌名` 与 `歌名 - 歌手`） */
async function isKnownArtist(name: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.artists.id })
    .from(schema.artists)
    .where(eq(schema.artists.name, name))
    .limit(1);
  return rows.length > 0;
}

/**
 * 解析左右两部分，判断哪边是歌手：
 *   - 右侧已在歌手库且左侧不在 → `歌名 - 歌手`
 *   - 其余情况默认左侧为歌手（KTV 文件名最常见格式）
 */
async function resolveArtistOrder(
  left: string,
  right: string,
): Promise<ParsedName> {
  const leftKnown = await isKnownArtist(left);
  const rightKnown = await isKnownArtist(right);
  if (rightKnown && !leftKnown) {
    return { title: left, artist: right };
  }
  return { title: right, artist: left };
}

/**
 * 从文件名推断歌曲名与歌手
 *
 * 支持格式：
 *   - `歌手 - 歌名` / `歌名 - 歌手`（`-`、`–`、`—`、`~` 分隔，带空格优先）
 *   - `[歌手] 歌名`
 *   - 前导序号（`01. 歌名`、`01-歌名`）与尾部序号（`歌名 [01]`）自动去除
 *   - 品质/版本标注自动清洗（`(FLAC)`、`[320K]`、`MV` 等）
 */
export async function parseFilename(baseName: string): Promise<ParsedName> {
  let name = normalizeKwName(baseName);
  name = name.replace(/^\d{1,4}\s*[.\-_\s、）)]\s*/, '');
  name = name.replace(/\s*[\[\(（]?\d{1,4}[\]\)）]?\s*$/, '');

  // [歌手] 歌名
  const bracket = /^\[([^\]\[]+)\]\s*(.+)$/.exec(name);
  if (bracket) {
    const artist = stripMetaBrackets(bracket[1]);
    const title = stripMetaBrackets(bracket[2]);
    if (artist && title) {
      return { title, artist };
    }
  }

  // 歌手 - 歌名（带空格分隔符）
  const spaced = name.split(/\s+[-–—~]\s+/);
  if (spaced.length === 2) {
    const left = stripMetaBrackets(spaced[0]);
    const right = stripMetaBrackets(spaced[1]);
    if (left && right) {
      return resolveArtistOrder(left, right);
    }
  }

  // 歌手-歌名（无空格分隔符）
  const tight = /^(.+?)[-–—~_](.+)$/.exec(name);
  if (tight) {
    const left = stripMetaBrackets(tight[1]);
    const right = stripMetaBrackets(tight[2]);
    if (left && right) {
      return resolveArtistOrder(left, right);
    }
  }

  // 歌名 (歌手) —— 括号内容非品质标注/数字时视为歌手，如「海阔天空 (Beyond)」
  const parenArtist = /^(.+?)\s*[\(（]([^\(\)（）]{1,12})[\)）]$/.exec(name);
  if (parenArtist) {
    const content = parenArtist[2].trim();
    if (
      content &&
      !META_PATTERN.test(content) &&
      !/^\d{1,4}$/.test(content)
    ) {
      const title = stripMetaBrackets(parenArtist[1]);
      const artist = stripMetaBrackets(content);
      if (title && artist) {
        return { title, artist };
      }
    }
  }

  // 仅歌名
  const title = stripMetaBrackets(name);
  return { title: title || baseName.trim(), artist: null };
}

/**
 * 通用歌曲信息识别：
 *   1. 音频文件读取 ID3 标签
 *   2. 缺失部分由文件名推断
 *   3. 歌手仍未识别时用父目录名兜底
 */
export async function parseSongInfo(filePath: string): Promise<SongInfo> {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const fileType = getFileType(filePath);

  let tags: AudioTags | null = null;
  if (fileType === 'audio') {
    try {
      tags = await parseAudioTags(filePath);
    } catch (error) {
      logger.warn(`parseSongInfo: failed to read tags for ${filePath}:`, error);
    }
  }

  // ID3 标签同样可能携带酷我 `u0026` 损坏字符，一并归一化
  let title: string | null = tags?.title ? normalizeKwName(tags.title) : null;
  let artist: string | null = tags?.artist ? normalizeKwName(tags.artist) : null;

  if (!title || !artist) {
    const parsed = await parseFilename(baseName);
    if (!title) title = parsed.title;
    if (!artist) artist = parsed.artist;
  }

  if (!title) title = normalizeKwName(stripMetaBrackets(baseName)) || normalizeKwName(baseName);

  if (!artist) {
    // 目录兜底：优先祖父目录（`歌手/专辑/歌名` 结构），其次父目录（`歌手/歌名` 结构）
    // 候选目录必须位于扫描根目录内部，避免把扫描根/扫描根外层目录误当歌手
    const scanRoot = path.resolve(config.scanPath) + path.sep;
    const parentDir = path.basename(path.dirname(filePath));
    const grandDir = path.basename(path.dirname(path.dirname(filePath)));
    const parentDirPath = path.dirname(filePath);
    const grandDirPath = path.dirname(path.dirname(filePath));
    const insideScanRoot = (p: string) =>
      path.resolve(p).startsWith(scanRoot);

    let dirArtist: string | null = null;
    if (
      grandDir &&
      !GENERIC_DIR_NAMES.has(grandDir.toLowerCase()) &&
      insideScanRoot(grandDirPath)
    ) {
      dirArtist = grandDir;
    } else if (
      parentDir &&
      !GENERIC_DIR_NAMES.has(parentDir.toLowerCase()) &&
      insideScanRoot(parentDirPath)
    ) {
      dirArtist = parentDir;
    }
    if (dirArtist) {
      const cleaned = stripMetaBrackets(dirArtist);
      if (cleaned) artist = cleaned;
    }
  }

  // 多歌手拆分：酷我等文件名/标签常以 `&`、`、` 分隔合作歌手
  const artists = splitArtistNames(artist);
  return {
    title,
    artist: artists[0] ?? null,
    secondaryArtists: artists.slice(1),
    album: tags?.album?.trim() || null,
  };
}

/** 确保「未知歌手」存在，返回其 id */
export async function ensureUnknownArtist(): Promise<number> {
  const existing = await db
    .select()
    .from(schema.artists)
    .where(eq(schema.artists.name, UNKNOWN_ARTIST_NAME))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [artist] = await db
    .insert(schema.artists)
    .values({
      name: UNKNOWN_ARTIST_NAME,
      pinyin: getPinyin(UNKNOWN_ARTIST_NAME),
      firstLetter: getFirstLetter(UNKNOWN_ARTIST_NAME),
      songCount: 0,
    })
    .returning();

  logger.info(`Created unknown artist: ${UNKNOWN_ARTIST_NAME}`);
  return artist.id;
}

/** 确保「未知」分类组与分类项存在，返回分类项 id */
export async function ensureUnknownCategory(): Promise<number> {
  let group = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.name, UNKNOWN_CATEGORY_GROUP))
    .limit(1);

  let groupId: number;
  if (group.length === 0) {
    const maxSort = await db
      .select({ sortOrder: schema.categories.sortOrder })
      .from(schema.categories)
      .all();
    const nextSort =
      maxSort.length > 0
        ? Math.max(...maxSort.map((r) => r.sortOrder ?? 0)) + 1
        : 0;
    const [created] = await db
      .insert(schema.categories)
      .values({ name: UNKNOWN_CATEGORY_GROUP, sortOrder: nextSort })
      .returning();
    groupId = created.id;
    logger.info(`Created unknown category group: ${UNKNOWN_CATEGORY_GROUP}`);
  } else {
    groupId = group[0].id;
  }

  const item = await db
    .select()
    .from(schema.categoryItems)
    .where(
      and(
        eq(schema.categoryItems.categoryId, groupId),
        eq(schema.categoryItems.name, UNKNOWN_CATEGORY_NAME),
      ),
    )
    .limit(1);

  if (item.length > 0) {
    return item[0].id;
  }

  const maxSort = await db
    .select({ sortOrder: schema.categoryItems.sortOrder })
    .from(schema.categoryItems)
    .where(eq(schema.categoryItems.categoryId, groupId))
    .all();
  const nextSort =
    maxSort.length > 0
      ? Math.max(...maxSort.map((r) => r.sortOrder ?? 0)) + 1
      : 0;
  const [created] = await db
    .insert(schema.categoryItems)
    .values({
      categoryId: groupId,
      name: UNKNOWN_CATEGORY_NAME,
      sortOrder: nextSort,
      songCount: 0,
    })
    .returning();

  logger.info(`Created unknown category item: ${UNKNOWN_CATEGORY_NAME}`);
  return created.id;
}

/**
 * 移除歌曲的「未知」分类关联（识别到真实分类信息后调用），并刷新该项歌曲数
 */
export async function removeUnknownCategory(songId: number): Promise<void> {
  const group = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.name, UNKNOWN_CATEGORY_GROUP))
    .limit(1);
  if (group.length === 0) return;

  const item = await db
    .select()
    .from(schema.categoryItems)
    .where(
      and(
        eq(schema.categoryItems.categoryId, group[0].id),
        eq(schema.categoryItems.name, UNKNOWN_CATEGORY_NAME),
      ),
    )
    .limit(1);
  if (item.length === 0) return;

  const link = await db
    .select()
    .from(schema.songCategories)
    .where(
      and(
        eq(schema.songCategories.songId, songId),
        eq(schema.songCategories.categoryItemId, item[0].id),
      ),
    )
    .limit(1);
  if (link.length === 0) return;

  await db
    .delete(schema.songCategories)
    .where(eq(schema.songCategories.id, link[0].id));

  const count = (
    await db
      .select()
      .from(schema.songCategories)
      .where(eq(schema.songCategories.categoryItemId, item[0].id))
      .all()
  ).length;

  await db
    .update(schema.categoryItems)
    .set({ songCount: count })
    .where(eq(schema.categoryItems.id, item[0].id));

  // 移除后该分类项已无歌曲关联：直接删除
  if (count === 0) {
    await db
      .delete(schema.categoryItems)
      .where(eq(schema.categoryItems.id, item[0].id))
      .run();
    logger.info(`Deleted empty unknown category item (id=${item[0].id})`);
  }
}

/**
 * 歌手已无任何歌曲关联时删除（本地识别 / AI 解析 / 手动编辑替换歌手后调用）。
 * 仅删除系统自动创建（source='auto'）的歌手，手动后台创建的保留。
 * @returns 是否删除了歌手
 */
export async function deleteArtistIfOrphan(
  artistId: number | null | undefined,
): Promise<boolean> {
  if (artistId == null) return false;

  const artist = await db
    .select()
    .from(schema.artists)
    .where(eq(schema.artists.id, artistId))
    .limit(1);
  if (artist.length === 0) return false;
  if (artist[0].source === 'manual') return false;

  const links = await db
    .select()
    .from(schema.songArtists)
    .where(eq(schema.songArtists.artistId, artistId))
    .all();
  if (links.length > 0) return false;

  await db.delete(schema.artists).where(eq(schema.artists.id, artistId)).run();
  logger.info(`Deleted orphan artist (id=${artistId})`);
  return true;
}

/**
 * 分类项已无任何歌曲关联时删除（本地识别 / AI 解析 / 手动编辑替换分类后调用）。
 * 仅删除系统自动创建（source='auto'）的分类项，手动后台创建的保留。
 * @returns 是否删除了分类项
 */
export async function deleteCategoryItemIfOrphan(
  categoryItemId: number | null | undefined,
): Promise<boolean> {
  if (categoryItemId == null) return false;

  const item = await db
    .select()
    .from(schema.categoryItems)
    .where(eq(schema.categoryItems.id, categoryItemId))
    .limit(1);
  if (item.length === 0) return false;
  if (item[0].source === 'manual') return false;

  const links = await db
    .select()
    .from(schema.songCategories)
    .where(eq(schema.songCategories.categoryItemId, categoryItemId))
    .all();
  if (links.length > 0) return false;

  await db
    .delete(schema.categoryItems)
    .where(eq(schema.categoryItems.id, categoryItemId))
    .run();
  logger.info(`Deleted orphan category item (id=${categoryItemId})`);
  return true;
}
