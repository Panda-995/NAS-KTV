import type {
  rooms,
  roomQueues,
  roomSessions,
  artists,
  categories,
  categoryItems,
  settings,
} from '../schema';

export interface ApiResponse<T = void> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Song {
  id: number;
  title: string;
  artistId: number | null;
  albumId: number | null;
  filePath: string;
  fileType: 'audio' | 'video';
  duration: number;
  lyricsPath: string | null;
  pitchDefault: number;
  playCount: number;
  vocalsPath: string | null;
  instrumentalPath: string | null;
  separationStatus: 'pending' | 'processing' | 'completed' | 'failed';
  separationModel: string | null;
  separationStartedAt: string | null;
  separationCompletedAt: string | null;
  separationError: string | null;
  aiParsed: boolean;
  aiParsedAt: string | null;
  aiConfidence: number | null;
  aiNeedReview: boolean;
  rawTags: Record<string, unknown> | null;
  createdAt: string;
  artist?: Artist;
  artistName?: string | null;
  artistNames?: string[];
  album?: Album;
  categories?: CategoryItem[];
}

export interface Album {
  id: number;
  name: string;
  artistId: number | null;
  cover: string | null;
  year: number | null;
}

export interface User {
  id: number;
  username: string;
  role: 'admin';
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthorizeDeviceRequest {
  type: 'permanent' | 'temporary';
  expiresHours?: number;
  name?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SongListParams extends PaginationParams {
  search?: string;
  artistId?: number;
  categoryId?: number;
  separationStatus?: string;
  aiParsed?: boolean;
}

// ========== 以下类型基于数据库 schema 推导 ==========

// 房间（基于 rooms 表）
export type Room = typeof rooms.$inferSelect;

// 房间队列项（基于 room_queues 表）
export type RoomQueue = typeof roomQueues.$inferSelect;

// 房间会话（基于 room_sessions 表）
export type RoomSession = typeof roomSessions.$inferSelect;

// 歌手（基于 artists 表，扩展 songCount 为可选）
export type Artist = Omit<typeof artists.$inferSelect, 'songCount'> & {
  songCount?: number;
};

// 分类组（基于 categories 表）
export type Category = typeof categories.$inferSelect;

// 分类项（基于 category_items 表，扩展 songCount 为可选）
export type CategoryItem = Omit<typeof categoryItems.$inferSelect, 'songCount'> & {
  songCount?: number;
};

// 分类组视图（含分类项列表）
export type CategoryGroup = Category & {
  items?: CategoryItem[];
};

// 系统设置（基于 settings 表）
export type Setting = typeof settings.$inferSelect;

// 歌手列表查询参数
export interface ArtistListParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
  firstLetter?: string;
}
