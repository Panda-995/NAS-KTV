import type { roomQueues } from '../schema';

// 房间列表查询参数
export interface RoomListParams {
  status?: 'pending' | 'active' | 'closed' | 'revoked';
  page?: number;
  pageSize?: number;
}

// 房间注册参数（TV 端首次启动时调用）
export interface RoomCreateParams {
  deviceId: string;
  name?: string;
  deviceInfo?: string;
}

// 房间注册响应
export interface RoomRegisterResponse {
  roomCode: string;
  roomId: number;
  status: string;
}

// 加入队列参数
export interface QueueAddParams {
  songId: number;
  sessionToken: string;
  nickname?: string;
}

// 置顶下一首参数
export interface QueueInsertNextParams {
  songId: number;
  sessionToken: string;
}

// 顶歌（置顶待播队列项）参数
export interface QueueTopParams {
  sessionToken: string;
}

// 跳过队列项参数
export interface QueueSkipParams {
  queueItemId: number;
  sessionToken: string;
}

// 加入房间会话参数
export interface RoomSessionJoinParams {
  authorizationCode: string;
  joinToken?: string;
  nickname: string;
  avatar?: string;
}

export interface RoomJoinTicket {
  authorizationCode: string;
  joinToken: string;
  expiresAt: string;
}

// 队列列表项（基于 room_queues schema 扩展歌曲和点歌人信息）
export type QueueListItem = typeof roomQueues.$inferSelect & {
  songTitle: string;
  songArtist: string;
  nickname: string | null;
  fileType: 'audio' | 'video' | null;
  vocalsPath: string | null;
  instrumentalPath: string | null;
};
