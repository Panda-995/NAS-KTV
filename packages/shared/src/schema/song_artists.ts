import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { songs } from './songs';
import { artists } from './artists';

/**
 * 歌曲-歌手多对多关联表（合唱/多人演唱支持）
 *
 * songs.artist_id 为主歌手（position=0 的记录与之对应），
 * 副歌手通过本表记录，便于按任意歌手查询与统计。
 */
export const songArtists = sqliteTable(
  'song_artists',
  {
    id: integer('id').primaryKey(),
    songId: integer('song_id')
      .notNull()
      .references(() => songs.id),
    artistId: integer('artist_id')
      .notNull()
      .references(() => artists.id),
    position: integer('position').default(0),
  },
  (t) => ({ songArtistUnique: unique().on(t.songId, t.artistId) }),
);

export type SongArtist = typeof songArtists.$inferSelect;
export type NewSongArtist = typeof songArtists.$inferInsert;
