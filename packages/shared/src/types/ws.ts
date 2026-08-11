export enum WsMessageType {
  ROOM_AUTHORIZED = 'ROOM_AUTHORIZED',
  ROOM_UNAUTHORIZED = 'ROOM_UNAUTHORIZED',
  ROOM_CLOSED = 'ROOM_CLOSED',
  ROOM_EXPIRING_SOON = 'ROOM_EXPIRING_SOON',

  JOIN_ROOM = 'JOIN_ROOM',
  ADD_SONG = 'ADD_SONG',
  INSERT_NEXT = 'INSERT_NEXT',
  SKIP_SONG = 'SKIP_SONG',
  PLAYER_STATE = 'PLAYER_STATE',
  PLAYER_COMMAND = 'PLAYER_COMMAND',
  QUEUE_UPDATED = 'QUEUE_UPDATED',
  LYRIC_SYNC = 'LYRIC_SYNC',
  LYRIC_OFFSET = 'LYRIC_OFFSET',

  // 心跳检测：客户端发 PING，服务端回 PONG
  PING = 'PING',
  PONG = 'PONG',
  // 房间状态快照：客户端重连后由服务端推送当前完整状态
  ROOM_STATE_SNAPSHOT = 'ROOM_STATE_SNAPSHOT',

  SEPARATION_STARTED = 'SEPARATION_STARTED',
  SEPARATION_PROGRESS = 'SEPARATION_PROGRESS',
  SEPARATION_COMPLETED = 'SEPARATION_COMPLETED',
  SEPARATION_FAILED = 'SEPARATION_FAILED',

  AI_PARSE_STARTED = 'AI_PARSE_STARTED',
  AI_PARSE_PROGRESS = 'AI_PARSE_PROGRESS',
  AI_PARSE_COMPLETED = 'AI_PARSE_COMPLETED',
  AI_PARSE_FAILED = 'AI_PARSE_FAILED',

  SCAN_STARTED = 'SCAN_STARTED',
  SCAN_PROGRESS = 'SCAN_PROGRESS',
  SCAN_COMPLETED = 'SCAN_COMPLETED',
  SCAN_FAILED = 'SCAN_FAILED',
}

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  timestamp: number;
}

export interface RoomAuthorizedPayload {
  roomCode: string;
  roomName: string;
  authorizeType: 'permanent' | 'temporary';
  expiresAt: string | null;
}

export interface RoomUnauthorizedPayload {
  roomCode: string;
  reason: 'manual_revoke' | 'expired' | 'session_expired';
}

export interface RoomClosedPayload {
  roomCode: string;
  reason: string;
}

export interface RoomExpiringSoonPayload {
  roomCode: string;
  expiresAt: string;
  remainingMinutes: number;
}

export interface JoinRoomPayload {
  roomCode: string;
  nickname: string;
  avatar?: string;
}

export interface AddSongPayload {
  songId: number;
  userSessionId: string;
}

export interface InsertNextPayload {
  songId: number;
  userSessionId: string;
}

export interface SkipSongPayload {
  queueItemId: number;
  userSessionId: string;
}

export interface PlayerStatePayload {
  songId: number | null;
  status: 'playing' | 'paused' | 'stopped';
  currentTime: number;
  duration: number;
  vocalMode: 'original' | 'instrumental' | 'vocal_assist';
  // 音效参数（阶段6.5 TV 端人声控制扩展）
  pitch?: number;        // -12 ~ +12 半音，默认 0
  reverb?: number;       // 0 ~ 1 wet ratio，默认 0
  reverbPreset?: 'hall' | 'room' | 'stage' | 'off' | 'custom';  // 默认 'off'
  reverbDuration?: number;  // 自定义混响时长秒（0.5~5），reverbPreset='custom' 时有效
  reverbDecay?: number;     // 自定义混响衰减（1~4），reverbPreset='custom' 时有效
  vocalAssistVolume?: number;  // 0 ~ 1 人声辅助模式下原声音量，默认 0.5
  instrumentalVolume?: number; // 0 ~ 1 伴奏轨道音量，默认 1
  // 状态版本号：TV 端每次广播自增，客户端据此丢弃过期状态（seek/调节后的回退抖动）
  stateVersion?: number;
}

/**
 * 手机遥控命令：Mobile H5 发送，服务端仅转发给房间内 TV 端播放器执行。
 * 注意：play/pause 为显式命令（多 H5 并发操作时不会像 toggle_play 那样互相抵消）；
 * toggle_play 保留用于兼容旧版 H5 客户端。
 */
export type PlayerCommandName =
  | 'play'
  | 'pause'
  | 'toggle_play'
  | 'seek'
  | 'set_pitch'
  | 'set_reverb'
  | 'set_reverb_preset'
  | 'set_reverb_custom'
  | 'set_vocal_mode'
  | 'set_vocal_assist_volume'
  | 'set_instrumental_volume'
  // 相对调节命令：只带增量，由 TV 端基于自身权威值累加。
  // 多台手机同时点 ±1 时不会因各自读到同一份陈旧广播值而丢更新。
  | 'adjust_pitch'
  | 'adjust_vocal_assist_volume'
  | 'adjust_instrumental_volume'
  | 'adjust_lyric_offset';

export interface ReverbCustomParams {
  duration: number; // 混响时长秒 0.5~5
  decay: number;    // 衰减指数 1~4
}

export interface PlayerCommandPayload {
  command: PlayerCommandName;
  // play/pause/toggle_play 无需 value；seek/set_pitch/set_reverb/set_vocal_assist_volume 为 number；
  // set_reverb_preset 为 'hall' | 'room' | 'stage' | 'off'；
  // set_reverb_custom 为 { duration, decay }（自定义混响参数）；
  // set_vocal_mode 为 'original' | 'instrumental' | 'vocal_assist'
  value?: number | string | ReverbCustomParams;
  userSessionId?: string;
}

export interface QueueUpdatedPayload {
  queue: QueueItem[];
  queueVersion: number;
}

export interface QueueItem {
  id: number;
  songId: number;
  songTitle: string;
  songArtist: string;
  userSessionId: string;
  nickname: string;
  fileType: 'audio' | 'video' | null;
  status: 'pending' | 'playing' | 'played' | 'skipped';
  sortOrder: number;
  requestedAt: string;
  /** 人声分离产物路径（无分离时为 null），TV 端据此预防性降级，避免 404 等待 */
  vocalsPath: string | null;
  instrumentalPath: string | null;
}

export interface LyricSyncPayload {
  songId: number;
  currentTime: number;
  lineIndex: number;
}

/**
 * 歌词时间偏移配置：Mobile H5 发送，服务端转发给 TV 端应用。
 * offsetMs 为正表示歌词提前显示（歌词匹配滞后时补偿），
 * TV 端歌词匹配使用 effectiveTime = currentTime + offsetMs / 1000。
 */
export interface LyricOffsetPayload {
  offsetMs: number; // 范围 -10000 ~ 10000
}

export interface SeparationStartedPayload {
  taskId: number;
  songId: number;
  songTitle: string;
}

export interface SeparationProgressPayload {
  taskId: number;
  songId: number;
  progress: number;
  stage: 'extracting' | 'separating' | 'encoding' | 'done';
}

export interface SeparationCompletedPayload {
  taskId: number;
  songId: number;
  vocalsPath: string;
  instrumentalPath: string;
}

export interface SeparationFailedPayload {
  taskId: number;
  songId: number;
  error: string;
}

// AI解析相关Payload
export interface AiParseStartedPayload {
  taskId: number;
  songId: number;
  songTitle: string;
  startTime: number;
}

export interface AiParseProgressPayload {
  taskId: number;
  songId: number;
  stage: 'fetching_data' | 'building_prompt' | 'calling_ai' | 'parsing_result' | 'applying_result';
  progress: number; // 0-100
  message: string;
}

export interface AiParseCompletedPayload {
  taskId: number;
  songId: number;
  success: boolean;
  confidence: number;
  autoApplied: boolean;
  needReview: boolean;
  result?: {
    title: string;
    artist: string;
    album?: string;
    year?: number;
    genre?: string;
    language?: string;
    mood?: string;
  };
  duration: number;
}

export interface AiParseFailedPayload {
  taskId: number;
  songId: number;
  error: string;
  retryCount: number;
  maxRetries: number;
}

export interface ScanStartedPayload {
  scanId: string;
  scanPath: string;
  startTime: number;
}

export interface ScanProgressPayload {
  scanId: string;
  current: number;
  total: number;
  percentage: number;
  currentFile: string;
}

export interface ScanCompletedPayload {
  scanId: string;
  totalSongs: number;
  newSongs: number;
  updatedSongs: number;
  skippedSongs: number;
  duration: number;
}

export interface ScanFailedPayload {
  scanId: string;
  error: string;
  partialResults?: {
    totalSongs: number;
    newSongs: number;
  };
}

// ===== 心跳检测 =====

/**
 * 客户端心跳请求。clientTime 用于 RTT 计算（可选）。
 */
export interface PingPayload {
  clientTime: number;
}

/**
 * 服务端心跳响应。回传 clientTime 便于客户端计算 RTT。
 */
export interface PongPayload {
  clientTime: number;
  serverTime: number;
}

// ===== 房间状态恢复 =====

/**
 * 房间完整状态快照。客户端（TV / Mobile）重连后由服务端主动推送，
 * 用于恢复队列、当前播放项和播放进度。
 */
export interface RoomStateSnapshotPayload {
  roomCode: string;
  authorized: boolean;
  roomStatus: 'pending' | 'active' | 'closed' | 'revoked';
  queue: QueueItem[];
  queueVersion: number;
  playerState: PlayerStatePayload | null;
  serverTime: number;
}
