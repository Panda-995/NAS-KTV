import { eq, and, sql, desc } from 'drizzle-orm';
import { db, schema } from '../db';
import { getPinyin, getFirstLetter } from '@nasktv/shared';
import type { Artist, ArtistListParams } from '@nasktv/shared';

const { artists, songs, songArtists } = schema;

/**
 * 歌手歌曲数（主歌手或副歌手参与的都统计）
 */
const songCountSubquery = sql<number>`(
  SELECT COUNT(*) FROM ${songs} s
  WHERE s.artist_id = ${sql.raw('artists.id')}
    OR EXISTS (
      SELECT 1 FROM ${songArtists} sa
      WHERE sa.song_id = s.id AND sa.artist_id = ${sql.raw('artists.id')}
    )
)`;

/**
 * 歌手列表：分页 + keyword 搜索（name/pinyin） + firstLetter 过滤
 * 每个 artist 含 songCount（统计 songs 表中 artistId = artist.id 的数量）
 */
export async function getArtists(
  params: ArtistListParams
): Promise<{ items: Artist[]; total: number }> {
  const { keyword, firstLetter, page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (keyword) {
    const pattern = `%${keyword}%`;
    conditions.push(
      sql`(${artists.name} LIKE ${pattern} OR ${artists.pinyin} LIKE ${pattern})`
    );
  }

  if (firstLetter) {
    conditions.push(eq(artists.firstLetter, firstLetter));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(artists)
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  const rows = await db
    .select({
      id: artists.id,
      name: artists.name,
      pinyin: artists.pinyin,
      firstLetter: artists.firstLetter,
      avatar: artists.avatar,
      bio: artists.bio,
      songCount: songCountSubquery,
      createdAt: artists.createdAt,
    })
    .from(artists)
    .where(whereClause)
    .orderBy(desc(artists.songCount), desc(artists.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items: rows as Artist[], total };
}

/**
 * 根据 ID 查询歌手
 */
export async function getArtistById(id: number): Promise<Artist | null> {
  const rows = await db
    .select({
      id: artists.id,
      name: artists.name,
      pinyin: artists.pinyin,
      firstLetter: artists.firstLetter,
      avatar: artists.avatar,
      bio: artists.bio,
      songCount: songCountSubquery,
      createdAt: artists.createdAt,
    })
    .from(artists)
    .where(eq(artists.id, id))
    .limit(1);

  return (rows[0] as Artist | undefined) ?? null;
}

/**
 * 创建歌手：自动生成 pinyin 和 firstLetter
 */
export async function createArtist(data: {
  name: string;
  bio?: string;
  avatar?: string | null;
}): Promise<Artist> {
  const trimmedName = data.name.trim();
  const pinyin = getPinyin(trimmedName);
  const firstLetter = getFirstLetter(trimmedName);

  const [artist] = await db
    .insert(artists)
    .values({
      name: trimmedName,
      pinyin,
      firstLetter,
      bio: data.bio ?? null,
      avatar: data.avatar ?? null,
      songCount: 0,
      source: 'manual',
      createdAt: new Date(),
    })
    .returning();

  return { ...artist, songCount: artist.songCount ?? 0 };
}

/**
 * 更新歌手：name 变更时同步 pinyin/firstLetter
 */
export async function updateArtist(
  id: number,
  data: { name?: string; bio?: string; avatar?: string | null }
): Promise<Artist | null> {
  const updateData: Partial<typeof artists.$inferInsert> = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    updateData.name = trimmedName;
    updateData.pinyin = getPinyin(trimmedName);
    updateData.firstLetter = getFirstLetter(trimmedName);
  }

  if (data.bio !== undefined) {
    updateData.bio = data.bio;
  }

  if (data.avatar !== undefined) {
    updateData.avatar = data.avatar;
  }

  const [artist] = await db
    .update(artists)
    .set(updateData)
    .where(eq(artists.id, id))
    .returning();

  return artist ? { ...artist, songCount: artist.songCount ?? 0 } : null;
}

/**
 * 删除歌手：若仍有关联歌曲（主歌手或副歌手）则报错
 */
export async function deleteArtist(id: number): Promise<void> {
  const linkedSongs = await db
    .select({ id: songs.id })
    .from(songs)
    .where(
      sql`${songs.artistId} = ${id} OR EXISTS (
        SELECT 1 FROM ${songArtists} sa
        WHERE sa.song_id = ${sql.raw('songs.id')} AND sa.artist_id = ${id}
      )`,
    )
    .limit(1);

  if (linkedSongs.length > 0) {
    throw new Error('该歌手下仍有歌曲，无法删除。请先迁移歌曲再删除');
  }

  await db.delete(songArtists).where(eq(songArtists.artistId, id));
  await db.delete(artists).where(eq(artists.id, id));
}

/**
 * 合并歌手：将 source 的所有歌曲 artistId 迁移到 target，然后删除 source
 * 返回 target Artist
 */
export async function mergeArtists(
  sourceId: number,
  targetId: number
): Promise<Artist> {
  if (sourceId === targetId) {
    throw new Error('源歌手与目标歌手不能相同');
  }

  const target = await getArtistById(targetId);
  if (!target) {
    throw new Error('目标歌手不存在');
  }

  const source = await getArtistById(sourceId);
  if (!source) {
    throw new Error('源歌手不存在');
  }

  // 将 source 的所有歌曲迁移到 target（主歌手）
  await db
    .update(songs)
    .set({ artistId: targetId })
    .where(eq(songs.artistId, sourceId));

  // 迁移副歌手关联：先移除同歌曲中已存在的 target 关联（避免唯一约束冲突），再迁移
  const sourceLinks = db
    .select({ songId: songArtists.songId })
    .from(songArtists)
    .where(eq(songArtists.artistId, sourceId))
    .all();

  for (const link of sourceLinks) {
    if (link.songId == null) continue;
    db.delete(songArtists)
      .where(and(eq(songArtists.songId, link.songId), eq(songArtists.artistId, targetId)))
      .run();
  }
  await db
    .update(songArtists)
    .set({ artistId: targetId })
    .where(eq(songArtists.artistId, sourceId))
    .run();

  // 更新 target 的 songCount
  const targetCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(songs)
    .where(eq(songs.artistId, targetId));
  await db
    .update(artists)
    .set({ songCount: targetCount[0]?.count ?? 0 })
    .where(eq(artists.id, targetId));

  // 删除 source
  await db.delete(artists).where(eq(artists.id, sourceId));

  const merged = await getArtistById(targetId);
  return merged!;
}
