import { Router, Request, Response, NextFunction } from 'express';
import { eq, sql, desc, asc, and } from 'drizzle-orm';
import { db, schema } from '../db';
import { authenticateToken } from '../middleware/jwt';
import { createAppError } from '../middleware/error';

const router = Router();

const { playlists, playlistSongs, songs, artists } = schema;

/**
 * GET /api/playlists - 歌单列表（含歌曲数）
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = db
      .select({
        id: playlists.id,
        name: playlists.name,
        cover: playlists.cover,
        description: playlists.description,
        sortOrder: playlists.sortOrder,
        songCount: sql<number>`(
          SELECT count(*) FROM playlist_songs ps WHERE ps.playlist_id = ${playlists.id}
        )`.mapWith(Number),
      })
      .from(playlists)
      .orderBy(asc(playlists.sortOrder), desc(playlists.id))
      .all();

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to fetch playlists', 500));
  }
});

/**
 * POST /api/playlists - 创建歌单
 */
router.post('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, cover, description, sortOrder } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw createAppError('name is required', 400);
    }

    const [row] = await db
      .insert(playlists)
      .values({
        name: name.trim(),
        cover: cover ?? null,
        description: description ?? null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      })
      .returning();

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to create playlist', 500));
  }
});

/**
 * GET /api/playlists/:id - 歌单详情（含歌曲列表）
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const playlist = db
      .select()
      .from(playlists)
      .where(eq(playlists.id, id))
      .get();

    if (!playlist) {
      throw createAppError('Playlist not found', 404);
    }

    const items = db
      .select({
        id: songs.id,
        title: songs.title,
        artistId: songs.artistId,
        artistName: artists.name,
        duration: songs.duration,
        fileType: songs.fileType,
        sortOrder: playlistSongs.sortOrder,
      })
      .from(playlistSongs)
      .innerJoin(songs, eq(playlistSongs.songId, songs.id))
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .where(eq(playlistSongs.playlistId, id))
      .orderBy(asc(playlistSongs.sortOrder), asc(playlistSongs.id))
      .all();

    res.json({
      success: true,
      data: { ...playlist, items },
    });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to fetch playlist', 500));
  }
});

/**
 * PUT /api/playlists/:id - 更新歌单信息
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { name, cover, description, sortOrder } = req.body;

    const updateData: Partial<typeof playlists.$inferInsert> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw createAppError('name is invalid', 400);
      }
      updateData.name = name.trim();
    }
    if (cover !== undefined) updateData.cover = cover;
    if (description !== undefined) updateData.description = description;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const [row] = await db
      .update(playlists)
      .set(updateData)
      .where(eq(playlists.id, id))
      .returning();

    if (!row) {
      throw createAppError('Playlist not found', 404);
    }

    res.json({ success: true, data: row });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to update playlist', 500));
  }
});

/**
 * DELETE /api/playlists/:id - 删除歌单（连带清空关联）
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const existing = db.select({ id: playlists.id }).from(playlists).where(eq(playlists.id, id)).get();
    if (!existing) {
      throw createAppError('Playlist not found', 404);
    }

    await db.delete(playlistSongs).where(eq(playlistSongs.playlistId, id)).run();
    await db.delete(playlists).where(eq(playlists.id, id)).run();

    res.json({ success: true, message: 'Playlist deleted' });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to delete playlist', 500));
  }
});

/**
 * POST /api/playlists/:id/songs - 向歌单添加歌曲
 * body: { songIds: number[] }
 */
router.post('/:id/songs', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { songIds } = req.body as { songIds?: number[] };

    if (!Array.isArray(songIds) || songIds.length === 0) {
      throw createAppError('songIds array is required', 400);
    }

    const playlist = db.select({ id: playlists.id }).from(playlists).where(eq(playlists.id, id)).get();
    if (!playlist) {
      throw createAppError('Playlist not found', 404);
    }

    const existing = db
      .select({ songId: playlistSongs.songId })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, id))
      .all()
      .map((r) => r.songId);

    const maxSort = db
      .select({ max: sql<number>`max(${playlistSongs.sortOrder})` })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, id))
      .get();

    let nextSort = (maxSort?.max ?? 0) + 1;
    let added = 0;

    for (const songId of songIds) {
      if (typeof songId !== 'number' || existing.includes(songId)) {
        continue;
      }
      await db
        .insert(playlistSongs)
        .values({ playlistId: id, songId, sortOrder: nextSort++ });
      added++;
    }

    res.json({ success: true, data: { added } });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to add songs to playlist', 500));
  }
});

/**
 * DELETE /api/playlists/:id/songs/:songId - 从歌单移除歌曲
 */
router.delete('/:id/songs/:songId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const songId = parseInt(req.params.songId);

    const result = await db
      .delete(playlistSongs)
      .where(and(eq(playlistSongs.playlistId, id), eq(playlistSongs.songId, songId)))
      .run();

    if (result.changes === 0) {
      throw createAppError('Song not found in playlist', 404);
    }

    res.json({ success: true, message: 'Song removed from playlist' });
  } catch (error) {
    next(error instanceof Error && 'statusCode' in error
      ? error
      : createAppError('Failed to remove song from playlist', 500));
  }
});

export default router;
