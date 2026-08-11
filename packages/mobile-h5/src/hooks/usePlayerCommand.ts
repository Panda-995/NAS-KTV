/* Hallmark · genre: editorial · theme: Garden · usePlayerCommand hook
 * 手机遥控：通过 WebSocket 向 TV 端播放器下发播放控制命令
 */
import { wsClient } from '../ws/client';
import { WsMessageType, type PlayerCommandPayload, type LyricOffsetPayload } from '@nasktv/shared';

export function sendPlayerCommand(command: PlayerCommandPayload): void {
  wsClient.send({
    type: WsMessageType.PLAYER_COMMAND,
    payload: command,
    timestamp: Date.now(),
  });
}

export function sendLyricOffset(offsetMs: number): void {
  const payload: LyricOffsetPayload = { offsetMs };
  wsClient.send({
    type: WsMessageType.LYRIC_OFFSET,
    payload,
    timestamp: Date.now(),
  });
}
