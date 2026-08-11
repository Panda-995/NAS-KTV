import { relations } from 'drizzle-orm';
import { users } from './users';
import { artists } from './artists';
import { songs } from './songs';
import { categories, categoryItems } from './categories';
import { songCategories } from './song_categories';
import { rooms, roomQueues } from './rooms';
import { playlists, playlistSongs } from './playlists';
import { separationTasks } from './separation';
import { aiParseTasks } from './ai-parse';
import { settings } from './settings';
import { playHistory } from './play_history';
import { roomSessions } from './room_sessions';
import { scanJobs } from './scan-jobs';
import { scanResults } from './scan-results';
import { songArtists } from './song_artists';
import { dedupTasks, dedupExceptions } from './dedup';

export * from './users';
export * from './artists';
export * from './songs';
export * from './categories';
export * from './song_categories';
export * from './rooms';
export * from './playlists';
export * from './separation';
export * from './ai-parse';
export * from './settings';
export * from './play_history';
export * from './room_sessions';
export * from './scan-jobs';
export * from './scan-results';
export * from './song_artists';
export * from './dedup';

export const artistsRelations = relations(artists, ({ many }) => ({
  songs: many(songs),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  artist: one(artists, {
    fields: [songs.artistId],
    references: [artists.id],
  }),
  songCategories: many(songCategories),
  separationTasks: many(separationTasks),
  aiParseTasks: many(aiParseTasks),
  roomQueues: many(roomQueues),
  playlistSongs: many(playlistSongs),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(categoryItems),
}));

export const categoryItemsRelations = relations(categoryItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [categoryItems.categoryId],
    references: [categories.id],
  }),
  songCategories: many(songCategories),
}));

export const songCategoriesRelations = relations(songCategories, ({ one }) => ({
  song: one(songs, {
    fields: [songCategories.songId],
    references: [songs.id],
  }),
  categoryItem: one(categoryItems, {
    fields: [songCategories.categoryItemId],
    references: [categoryItems.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  queues: many(roomQueues),
  sessions: many(roomSessions),
}));

export const roomQueuesRelations = relations(roomQueues, ({ one }) => ({
  room: one(rooms, {
    fields: [roomQueues.roomId],
    references: [rooms.id],
  }),
  song: one(songs, {
    fields: [roomQueues.songId],
    references: [songs.id],
  }),
}));

export const playlistsRelations = relations(playlists, ({ many }) => ({
  songs: many(playlistSongs),
}));

export const playlistSongsRelations = relations(playlistSongs, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistSongs.playlistId],
    references: [playlists.id],
  }),
  song: one(songs, {
    fields: [playlistSongs.songId],
    references: [songs.id],
  }),
}));

export const separationTasksRelations = relations(separationTasks, ({ one }) => ({
  song: one(songs, {
    fields: [separationTasks.songId],
    references: [songs.id],
  }),
}));

export const aiParseTasksRelations = relations(aiParseTasks, ({ one }) => ({
  song: one(songs, {
    fields: [aiParseTasks.songId],
    references: [songs.id],
  }),
}));

export const songArtistsRelations = relations(songArtists, ({ one }) => ({
  song: one(songs, {
    fields: [songArtists.songId],
    references: [songs.id],
  }),
  artist: one(artists, {
    fields: [songArtists.artistId],
    references: [artists.id],
  }),
}));

export {
  users,
  artists,
  songs,
  categories,
  categoryItems,
  songCategories,
  rooms,
  roomQueues,
  playlists,
  playlistSongs,
  separationTasks,
  aiParseTasks,
  settings,
  playHistory,
  roomSessions,
  scanJobs,
  scanResults,
  songArtists,
  dedupTasks,
  dedupExceptions,
};
