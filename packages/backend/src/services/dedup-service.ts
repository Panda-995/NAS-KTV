import { db, schema } from '../db';
import { eq, desc } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../logger';
import { getAiDedupEnabled } from './settings-service';
import { deleteSong } from './song-service';
import { processMediaFile } from './scanner';
import { parseAudioTags } from './id3';
import { UNKNOWN_ARTIST_NAME } from './song-info-parser';

/**
 * 本地脚本去重（不调用 AI 判定，仅用库内歌曲信息做本地规则比对）。
 *
 * 重复判定规则：同名 + 同歌手 + 同版本（版本标记如 Live/Remix/伴奏/钢琴版等从标题提取），
 * 且文件类型相同（音频与视频互不判定为重复）。
 * 数据全部来自本地：AI 解析过使用解析结果，未解析使用本地识别（ID3 标签）结果。
 *
 * 每次执行记录到 dedup_tasks；手动还原的歌曲写入 dedup_exceptions，后续去重跳过，
 * 防止被再次识别删除。
 */

// 版本标记表（按优先级匹配，命中即认为该歌带版本标识）
const VERSION_MARKERS = [
  '现场版',
  '演唱会版',
  '钢琴版',
  '吉他版',
  '小提琴版',
  '古筝版',
  '笛子版',
  '萨克斯版',
  '二胡版',
  '伴奏',
  '纯音乐',
  '翻唱',
  '合唱版',
  '对唱版',
  'dj版',
  '慢摇版',
  '男声版',
  '女声版',
  '铃声',
  '片段',
  '高潮版',
  '抖音版',
  '片段版',
  'live',
  'remix',
  'cover',
  'acoustic',
  'instrumental',
  'karaoke',
  'remaster',
];

export interface DedupDuplicate {
  keepId: number;
  removedId: number;
  title: string;
  artistId: number | null;
  fileType: string | null;
  filePath: string; // 删除歌曲的文件路径（供还原）
  reason: string;
}

export interface DedupResult {
  taskId: number | null;
  isRunning: boolean;
  enabled: boolean; // AI 智能去重开关
  checked: number; // 参与判定的歌曲数
  removed: number; // 实际删除的重复歌曲数
  duplicates: DedupDuplicate[];
}

export interface DedupTaskItem {
  id: number;
  scanId: string | null;
  status: string;
  startedAt: number;
  completedAt: number | null;
  checked: number;
  removed: number;
  duplicates: DedupDuplicate[];
  error: string | null;
}

export interface DedupProgress {
  running: boolean;
  stage: string;
  processed: number;
  total: number;
  percent: number;
}

let isRunning = false;
let lastResult: DedupResult | null = null;
let progress: DedupProgress = { running: false, stage: '', processed: 0, total: 0, percent: 0 };

/**
 * 标题规范化：去括号内容、空格与分隔符、统一小写
 */
function normalizeTitle(title: string): string {
  return title
    .replace(/[\(\[\{（【][^\)\]\}）】]*[\)\]\}）】]/g, '')
    .replace(/[\s\-_\.]+/g, '')
    .toLowerCase()
    .trim();
}

/**
 * 从标题提取版本标记，返回 [去掉版本后的规范化标题, 版本标记]
 */
function splitVersion(title: string): { base: string; version: string } {
  const normalized = normalizeTitle(title);
  for (const marker of VERSION_MARKERS) {
    if (normalized.includes(marker)) {
      return { base: normalized.replace(marker, ''), version: marker };
    }
  }
  return { base: normalized, version: '' };
}

/**
 * 获取去重状态（进度 + 上次结果）
 */
export function getDedupStatus(): { progress: DedupProgress; lastResult: DedupResult | null } {
  return { progress: { ...progress }, lastResult };
}

/**
 * 查询去重任务记录
 */
export function getDedupTasks(limit = 20): DedupTaskItem[] {
  const rows = db
    .select()
    .from(schema.dedupTasks)
    .orderBy(desc(schema.dedupTasks.id))
    .limit(limit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    scanId: row.scanId ?? null,
    status: row.status,
    startedAt: row.startedAt?.getTime() ?? 0,
    completedAt: row.completedAt ? row.completedAt.getTime() : null,
    checked: row.checked ?? 0,
    removed: row.removed ?? 0,
    duplicates: parseDuplicates(row.duplicates),
    error: row.error,
  }));
}

/**
 * 查询最近一次已完成扫描的 scan_id（用于自动去重关联扫描任务）
 */
function getLatestScanId(): string | null {
  const row = db
    .select({ scanId: schema.scanJobs.scanId })
    .from(schema.scanJobs)
    .where(eq(schema.scanJobs.status, 'completed'))
    .orderBy(desc(schema.scanJobs.endTime))
    .limit(1)
    .get();
  return row?.scanId ?? null;
}

function parseDuplicates(json: string | null): DedupDuplicate[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface RawTags {
  title?: string;
  artist?: string;
}

/**
 * 解析内嵌标签 JSON（songs.raw_tags）
 */
function parseRawTags(raw: string | null): RawTags | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 歌曲信息不完整判断：
 * - 标题：等于文件名（无内嵌标题，扫描时回退到文件名）
 * - 歌手：artistId 为空，或指向「未知歌手」
 */
function needsTagFallback(
  song: { title: string; artistId: number | null; filePath: string },
  unknownArtistIds: Set<number>,
): boolean {
  const baseName = path.basename(song.filePath, path.extname(song.filePath));
  const titleIsFileName = song.title === baseName;
  const artistMissing = song.artistId == null || unknownArtistIds.has(song.artistId);
  return titleIsFileName || artistMissing;
}

/**
 * 为信息不完整的歌曲补齐有效信息（标题/歌手），用于去重比对：
 * 优先使用内嵌标签（songs.raw_tags）；为空时读取文件解析并回填，后续去重不再重复解析。
 * 并发限制 8，失败静默跳过（保持原信息）。
 */
async function enrichWithRawTags(
  songs: Array<{
    id: number;
    title: string;
    artistId: number | null;
    filePath: string;
    rawTags: string | null;
  }>,
  unknownArtistIds: Set<number>,
  artistIdByName: Map<string, number>,
): Promise<Map<number, { title: string; artistId: number | null }>> {
  const effective = new Map<number, { title: string; artistId: number | null }>();

  // 需要解析文件的歌曲（raw_tags 为空且信息不完整）
  const toParse: typeof songs = [];

  for (const song of songs) {
    const tags = parseRawTags(song.rawTags);
    const baseName = path.basename(song.filePath, path.extname(song.filePath));

    // 有效内嵌标题：非空且不是文件名
    const tagTitle = tags?.title && tags.title !== baseName ? tags.title : null;
    // 有效内嵌歌手：非空
    const tagArtist = tags?.artist ? tags.artist.trim() : '';

    let effectiveTitle = song.title;
    let effectiveArtistId = song.artistId;

    if (needsTagFallback(song, unknownArtistIds)) {
      if (tagTitle) {
        effectiveTitle = tagTitle;
      } else if (!tags && !tagArtist) {
        // 无内嵌标签且信息不完整：解析文件并回填
        toParse.push(song);
        continue;
      }
      if (!tagArtist && song.artistId != null && !unknownArtistIds.has(song.artistId)) {
        // 歌手有效，无需兜底
      } else if (tagArtist) {
        effectiveArtistId = artistIdByName.get(tagArtist) ?? song.artistId;
      }
    }

    effective.set(song.id, { title: effectiveTitle, artistId: effectiveArtistId });
  }

  // 分批解析（8 并发）
  const CONCURRENCY = 8;
  for (let i = 0; i < toParse.length; i += CONCURRENCY) {
    const batch = toParse.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (song) => {
        const tags = await parseAudioTags(song.filePath);
        if (!tags) return { song, tags: null };
        db.update(schema.songs)
          .set({ rawTags: JSON.stringify(tags) })
          .where(eq(schema.songs.id, song.id))
          .run();
        return { song, tags };
      }),
    );

    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value.tags) continue;
      const { song, tags } = r.value;
      const baseName = path.basename(song.filePath, path.extname(song.filePath));
      const tagTitle = tags.title && tags.title !== baseName ? tags.title : null;
      const tagArtist = tags.artist ? tags.artist.trim() : '';
      effective.set(song.id, {
        title: tagTitle ?? song.title,
        artistId: tagArtist ? artistIdByName.get(tagArtist) ?? song.artistId : song.artistId,
      });
    }
  }

  return effective;
}

/**
 * 执行本地去重脚本。
 * 前置条件：仅需 ai_dedup_enabled 开关开启（数据全部来自本地，不依赖 AI 解析功能）。
 * 重复组内保留最早入库的一首（createdAt 最小，其次 id 最小），其余删除；
 * 正在播放队列中的歌曲、以及 dedup_exceptions 中的文件（手动还原）跳过不删。
 * @param scanId 关联的扫描任务 id（自动触发时传入，用于扫描页关联跳转）
 */
export async function runLocalDedup(scanId?: string | null): Promise<DedupResult> {
  const enabled = await getAiDedupEnabled();

  const base: DedupResult = {
    taskId: null,
    isRunning,
    enabled,
    checked: 0,
    removed: 0,
    duplicates: [],
  };

  // 开关关闭：不执行
  if (!enabled) {
    lastResult = base;
    return base;
  }
  if (isRunning) {
    return { ...base, isRunning: true };
  }

  isRunning = true;
  progress = { running: true, stage: '准备中', processed: 0, total: 0, percent: 0 };

  // 创建任务记录
  const [task] = await db
    .insert(schema.dedupTasks)
    .values({
      status: 'running',
      scanId: scanId ?? getLatestScanId(),
      startedAt: new Date(),
    })
    .returning();

  const result: DedupResult = { ...base, taskId: task.id, isRunning: true };

  try {
    // 手动还原的例外文件：这些歌曲的去重组整组跳过，防止再次被删
    const exceptionPaths = new Set(
      db.select({ filePath: schema.dedupExceptions.filePath }).from(schema.dedupExceptions).all()
        .map((r) => r.filePath),
    );

    // 当前正在播放队列中的歌曲不参与删除，避免中断播放
    const playingSongIds = new Set(
      db
        .select({ songId: schema.roomQueues.songId })
        .from(schema.roomQueues)
        .where(eq(schema.roomQueues.status, 'playing'))
        .all()
        .map((r) => r.songId)
        .filter((id): id is number => id != null),
    );

    progress = { ...progress, stage: '读取歌曲信息', percent: 10 };

    // 全部歌曲参与判定（数据来自本地：AI 解析或 ID3 标签识别结果）
    const songs = db
      .select({
        id: schema.songs.id,
        title: schema.songs.title,
        artistId: schema.songs.artistId,
        fileType: schema.songs.fileType,
        filePath: schema.songs.filePath,
        createdAt: schema.songs.createdAt,
        rawTags: schema.songs.rawTags,
      })
      .from(schema.songs)
      .all();

    result.checked = songs.length;
    progress = { ...progress, total: songs.length, percent: 20 };

    // 「未知歌手」id 集合 + 歌手名→id 映射（内嵌标签歌手兜底解析用）
    const artists = db.select().from(schema.artists).all();
    const artistIdByName = new Map(artists.map((a) => [a.name, a.id]));
    const unknownArtistIds = new Set(
      artists.filter((a) => a.name === UNKNOWN_ARTIST_NAME).map((a) => a.id),
    );

    // 标题/歌手信息不完整时用内嵌标签兜底（无标签则解析文件并回填）
    const effectiveMap = await enrichWithRawTags(songs, unknownArtistIds, artistIdByName);

    // 分组：文件类型 | 歌手 | 规范化标题 | 版本标记
    const groups = new Map<string, typeof songs>();
    for (const song of songs) {
      if (exceptionPaths.has(song.filePath)) continue;
      const eff = effectiveMap.get(song.id) ?? { title: song.title, artistId: song.artistId };
      const { base: titleBase, version } = splitVersion(eff.title);
      const key = `${song.fileType ?? 'audio'}|${eff.artistId ?? ''}|${titleBase}|${version}`;
      const group = groups.get(key);
      if (group) {
        group.push(song);
      } else {
        groups.set(key, [song]);
      }
    }

    progress = { ...progress, stage: '比对重复歌曲', percent: 40 };

    let processedGroups = 0;
    const groupCount = groups.size;

    for (const group of groups.values()) {
      if (group.length >= 2) {
        // 组内包含例外文件：整组跳过（用户已表达保留意愿）
        if (group.some((s) => exceptionPaths.has(s.filePath))) {
          processedGroups++;
          continue;
        }

        // 保留最早入库的歌曲
        group.sort((a, b) => {
          const at = a.createdAt?.getTime() ?? 0;
          const bt = b.createdAt?.getTime() ?? 0;
          if (at !== bt) return at - bt;
          return a.id - b.id;
        });

        const keep = group[0];
        for (const dup of group.slice(1)) {
          if (playingSongIds.has(dup.id)) continue;
          await deleteSong(dup.id);
          result.removed++;
          result.duplicates.push({
            keepId: keep.id,
            removedId: dup.id,
            title: dup.title,
            artistId: dup.artistId,
            fileType: dup.fileType,
            filePath: dup.filePath,
            reason: `与 #${keep.id}「${keep.title}」同名同歌手同版本`,
          });
          logger.info(
            `Local dedup: removed song ${dup.id} (${dup.title}) as duplicate of ${keep.id} (${keep.title})`,
          );
        }
      }

      processedGroups++;
      progress = {
        running: true,
        stage: '比对重复歌曲',
        processed: processedGroups,
        total: groupCount,
        percent: 40 + Math.round((processedGroups / Math.max(1, groupCount)) * 50),
      };
    }

    progress = { ...progress, stage: '记录结果', percent: 95 };

    db.update(schema.dedupTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        checked: result.checked,
        removed: result.removed,
        duplicates: JSON.stringify(result.duplicates),
      })
      .where(eq(schema.dedupTasks.id, task.id))
      .run();
  } catch (error) {
    logger.error('Local dedup failed:', error);
    db.update(schema.dedupTasks)
      .set({
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(schema.dedupTasks.id, task.id))
      .run();
  } finally {
    isRunning = false;
    result.isRunning = false;
    progress = { running: false, stage: '完成', processed: 0, total: 0, percent: 100 };
  }

  lastResult = result;
  return result;
}

/**
 * 还原被去重删除的歌曲：
 * 1. 写入 dedup_exceptions（防止下次去重再次识别删除）
 * 2. 文件仍在磁盘则重新入库（跳过 MD5 查重，避免与保留副本哈希相同被跳过）
 */
export async function restoreSong(taskId: number, removedId: number): Promise<{ songId: number | null; restored: boolean }> {
  const task = db
    .select()
    .from(schema.dedupTasks)
    .where(eq(schema.dedupTasks.id, taskId))
    .get();

  if (!task) {
    throw new Error('去重任务不存在');
  }

  const dup = parseDuplicates(task.duplicates).find((d) => d.removedId === removedId);
  if (!dup) {
    throw new Error('未找到该去重记录');
  }

  // 写入例外，防止下次去重再次删除
  const existingException = db
    .select()
    .from(schema.dedupExceptions)
    .where(eq(schema.dedupExceptions.filePath, dup.filePath))
    .get();

  if (!existingException) {
    db.insert(schema.dedupExceptions)
      .values({
        filePath: dup.filePath,
        reason: `手动还原（去重任务 #${taskId}）`,
        createdAt: new Date(),
      })
      .run();
  }

  // 文件已不存在：仅记录例外，无法还原数据
  if (!fs.existsSync(dup.filePath)) {
    logger.warn(`Restore song ${removedId}: file missing ${dup.filePath}, exception recorded only`);
    return { songId: null, restored: false };
  }

  // 重新入库（跳过 MD5 查重；路径已从库中删除，路径查重不会命中）
  const result = await processMediaFile(dup.filePath, { skipDedup: true });
  logger.info(`Restore song ${removedId}: reimported ${dup.filePath} (${result.status})`);
  return { songId: result.songId ?? null, restored: result.status === 'new' };
}
