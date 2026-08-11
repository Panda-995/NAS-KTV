import { db, schema } from '../db';
import { eq, and } from 'drizzle-orm';
import logger from '../logger';
import { chatCompletion } from './ai-client';
import { buildParsePrompt, parseAiResponse, AiParseResult } from './ai-prompt';
import { getPinyin, getFirstLetter } from '@nasktv/shared';
import {
  ensureUnknownArtist,
  removeUnknownCategory,
  deleteArtistIfOrphan,
  deleteCategoryItemIfOrphan,
} from './song-info-parser';
import { countArtistSongs } from './song-service';

export interface ParseContext {
  result: AiParseResult;
  requestMessages: Array<{ role: string; content: string }>;
  responseRaw: string;
  originalTitle: string;
  originalArtistId: number | null;
  originalArtistName: string;
}

class AiParseService {
  async parseSong(
    songId: number,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<ParseContext | null> {
    if (onProgress) onProgress('fetching_data', 10);

    const song = db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.id, songId))
      .get();

    if (!song) {
      throw new Error(`Song not found: ${songId}`);
    }

    let artistName = '';
    const originalArtistId = song.artistId ?? null;
    if (song.artistId) {
      const artist = db
        .select()
        .from(schema.artists)
        .where(eq(schema.artists.id, song.artistId))
        .get();
      if (artist) {
        artistName = artist.name;
      }
    }

    if (onProgress) onProgress('building_prompt', 30);

    const messages = await buildParsePrompt({
      id: song.id,
      title: song.title,
      filePath: song.filePath,
      fileType: song.fileType ?? 'audio',
      artistName
    });

    logger.info('[AI Parse] songId=%d title=%s artist=%s', song.id, song.title, artistName);

    if (onProgress) onProgress('calling_ai', 50);

    const response = await chatCompletion(messages, {
      temperature: 0.3,
      maxTokens: 8000
    });

    if (!response) {
      logger.error('[AI Parse] songId=%d AI returned null/empty content', song.id);
      throw new Error('AI returned empty response');
    }

    if (onProgress) onProgress('parsing_result', 70);

    const result = parseAiResponse(response);
    if (!result) {
      logger.error('[AI Parse] songId=%d failed to parse JSON from response: %s', song.id, response.substring(0, 500));
      throw new Error('Failed to parse AI response');
    }

    logger.info('[AI Parse] songId=%d result=%j', song.id, result);

    return {
      result,
      requestMessages: messages,
      responseRaw: response,
      originalTitle: song.title,
      originalArtistId,
      originalArtistName: artistName,
    };
  }

  /**
   * 查找或创建歌手，返回 artistId
   */
  private resolveArtist(name: string): number | null {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = db
      .select()
      .from(schema.artists)
      .where(eq(schema.artists.name, trimmed))
      .get();

    if (existing) {
      return existing.id;
    }

    const pinyin = getPinyin(trimmed);
    const firstLetter = getFirstLetter(trimmed);

    const newArtist = db
      .insert(schema.artists)
      .values({
        name: trimmed,
        pinyin,
        firstLetter,
        songCount: 0,
      })
      .returning()
      .get();

    logger.info(`Created new artist from AI: ${trimmed}`);
    return newArtist.id;
  }

  /**
   * 应用 AI 解析结果到歌曲
   *
   * 多歌手规则：result.artists 中的每个歌手都会创建/关联到歌手库；
   * 第一个作为主歌手写入 songs.artist_id，其余写入 song_artists 关联表，
   * 因此用任意一位歌手查询都能找到该歌曲。
   *
   * @param opts.approved 管理员审核通过（approve / modify）时传 true：
   *   此时视为人工确认，aiParsed 强制置为 1（已解析）并清除待审核标记，
   *   不再按置信度判定；自动解析仍按置信度阈值判定。
   */
  async applyParseResult(
    songId: number,
    result: AiParseResult,
    opts?: { approved?: boolean },
  ): Promise<{ applied: boolean; aiParsed: number }> {
    const song = db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.id, songId))
      .get();
    const originalArtistId = song?.artistId ?? null;

    // 记录旧的关联歌手（含副歌手），用于刷新歌曲数量
    const oldArtistIds = db
      .select({ artistId: schema.songArtists.artistId })
      .from(schema.songArtists)
      .where(eq(schema.songArtists.songId, songId))
      .all()
      .map((r) => r.artistId)
      .filter((id): id is number => id != null);

    const CONFIDENCE_THRESHOLD = 0.8;
    // 管理员审核通过视为已确认；否则按置信度判定是否需要人工复核
    const aiParsedValue = opts?.approved
      ? 1
      : (result.confidence ?? 0) >= CONFIDENCE_THRESHOLD
        ? 1
        : 2;

    // 低置信度（待人工复核）：不覆盖本地已回写的标题/歌手/分类，仅记录 AI 结果供审核参考
    if (aiParsedValue === 2) {
      db.update(schema.songs)
        .set({
          aiParsed: 2,
          aiParsedAt: new Date(),
          aiConfidence: result.confidence,
          aiNeedReview: 1,
        })
        .where(eq(schema.songs.id, songId))
        .run();
      logger.info(
        `AI parse result kept for review on song ${songId} (confidence=${result.confidence})`,
      );
      return { applied: false, aiParsed: 2 };
    }

    // 置信度达标或人工审核通过：用 AI 结果覆盖本地元数据
    // 多歌手拆分：逐一解析歌手
    let artistIds: number[] = [];
    for (const name of result.artists) {
      const id = this.resolveArtist(name);
      if (id !== null) artistIds.push(id);
    }

    if (artistIds.length === 0) {
      // AI 未识别出歌手：回退到「未知歌手」，等待后续人工修改
      const unknownId = await ensureUnknownArtist();
      artistIds = [unknownId];
    }

    const artistId = artistIds[0];

    // 重建歌曲-歌手关联（主歌手 position=0，其余依次）
    db.delete(schema.songArtists)
      .where(eq(schema.songArtists.songId, songId))
      .run();
    db.insert(schema.songArtists)
      .values(
        artistIds.map((aid, i) => ({
          songId,
          artistId: aid,
          position: i,
        })),
      )
      .run();

    db.update(schema.songs)
      .set({
        title: result.title,
        artistId,
        aiParsed: aiParsedValue,
        aiParsedAt: new Date(),
        aiConfidence: result.confidence,
        aiNeedReview: 0,
      })
      .where(eq(schema.songs.id, songId))
      .run();

    // 刷新新/旧关联歌手的歌曲数量；被替换掉的旧歌手若无其他歌曲关联则直接删除
    const allArtistIds = new Set([...oldArtistIds, ...artistIds]);
    for (const aid of allArtistIds) {
      db.update(schema.artists)
        .set({ songCount: countArtistSongs(aid) })
        .where(eq(schema.artists.id, aid))
        .run();
      if (!artistIds.includes(aid)) {
        await deleteArtistIfOrphan(aid);
      }
    }

    const categoryMappings: { groupName: string; value: string | undefined }[] = [
      { groupName: '语种', value: result.language },
      { groupName: '风格', value: result.genre },
      { groupName: '心情', value: result.mood },
    ];

    if (result.year) {
      const decade = Math.floor(result.year / 10) * 10;
      const decadeLabel = decade < 2000 ? `${decade - 1900}年代` : `${decade - 2000}年代`;
      categoryMappings.push({ groupName: '年代', value: decadeLabel });
    }

    const hasCategoryInfo = categoryMappings.some((m) => m.value);
    if (hasCategoryInfo) {
      for (const mapping of categoryMappings) {
        if (!mapping.value) continue;
        this.assignSongToCategory(songId, mapping.groupName, mapping.value);
      }
      // 识别到分类信息：移除扫描时挂的「未知」分类兜底
      await removeUnknownCategory(songId);
    }

    logger.info(`Applied AI parse result to song ${songId}, aiParsed=${aiParsedValue}`);
    return { applied: true, aiParsed: aiParsedValue };
  }

  private assignSongToCategory(songId: number, groupName: string, itemName: string): void {
    try {
      const category = db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.name, groupName))
        .get();

      if (!category) {
        logger.warn(`Category group "${groupName}" not found, skipping assignment of "${itemName}"`);
        return;
      }

      let item = db
        .select()
        .from(schema.categoryItems)
        .where(eq(schema.categoryItems.name, itemName))
        .all()
        .find(i => i.categoryId === category.id);

      if (!item) {
        const maxSort = db
          .select({ sortOrder: schema.categoryItems.sortOrder })
          .from(schema.categoryItems)
          .where(eq(schema.categoryItems.categoryId, category.id))
          .all();

        const nextSort = maxSort.length > 0 ? Math.max(...maxSort.map(m => m.sortOrder ?? 0)) + 1 : 0;

        item = db
          .insert(schema.categoryItems)
          .values({
            categoryId: category.id,
            name: itemName,
            sortOrder: nextSort,
            songCount: 0,
          })
          .returning()
          .get();

        logger.info(`Created new category item: ${groupName} > ${itemName}`);
      }

      const existing = db
        .select()
        .from(schema.songCategories)
        .where(eq(schema.songCategories.songId, songId))
        .all()
        .find(sc => sc.categoryItemId === item!.id);

      if (existing) {
        return;
      }

      db.insert(schema.songCategories)
        .values({
          songId,
          categoryItemId: item.id,
          source: 'ai',
        })
        .run();

      const songCount = db
        .select()
        .from(schema.songCategories)
        .where(eq(schema.songCategories.categoryItemId, item.id))
        .all().length;

      db.update(schema.categoryItems)
        .set({ songCount })
        .where(eq(schema.categoryItems.id, item.id))
        .run();

      logger.info(`Assigned song ${songId} to ${groupName} > ${itemName}`);
    } catch (err) {
      logger.error(`Failed to assign song ${songId} to ${groupName} > ${itemName}:`, err);
    }
  }

  async rollbackParseResult(
    songId: number,
    originalTitle: string,
    originalArtistId: number | null
  ): Promise<boolean> {
    db.update(schema.songs)
      .set({
        title: originalTitle,
        artistId: originalArtistId,
        aiParsed: 0,
      })
      .where(eq(schema.songs.id, songId))
      .run();

    // 重建歌手关联：仅保留原主歌手；被移除的 AI 歌手若无其他歌曲关联则删除
    const beforeArtistIds = db
      .select({ artistId: schema.songArtists.artistId })
      .from(schema.songArtists)
      .where(eq(schema.songArtists.songId, songId))
      .all()
      .map((r) => r.artistId)
      .filter((id): id is number => id != null);

    db.delete(schema.songArtists)
      .where(eq(schema.songArtists.songId, songId))
      .run();
    if (originalArtistId) {
      db.insert(schema.songArtists)
        .values({ songId, artistId: originalArtistId, position: 0 })
        .run();
      db.update(schema.artists)
        .set({ songCount: countArtistSongs(originalArtistId) })
        .where(eq(schema.artists.id, originalArtistId))
        .run();
    }
    for (const aid of beforeArtistIds) {
      if (aid !== originalArtistId) {
        await deleteArtistIfOrphan(aid);
      }
    }

    const aiCategories = db
      .select()
      .from(schema.songCategories)
      .where(and(eq(schema.songCategories.songId, songId), eq(schema.songCategories.source, 'ai')))
      .all();

    for (const sc of aiCategories) {
      db.delete(schema.songCategories).where(eq(schema.songCategories.id, sc.id)).run();

      const remaining = db
        .select()
        .from(schema.songCategories)
        .where(eq(schema.songCategories.categoryItemId, sc.categoryItemId!))
        .all().length;

      // 移除后该 AI 分类项已无歌曲关联：直接删除
      if (remaining === 0) {
        await deleteCategoryItemIfOrphan(sc.categoryItemId!);
      } else {
        db.update(schema.categoryItems)
          .set({ songCount: remaining })
          .where(eq(schema.categoryItems.id, sc.categoryItemId!))
          .run();
      }
    }

    logger.info(`Rolled back AI parse result for song ${songId}, removed ${aiCategories.length} AI category assignments`);
    return true;
  }
}

export const aiParseService = new AiParseService();
