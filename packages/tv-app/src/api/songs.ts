import client from './client';

// 歌词行
export interface LyricLine {
  time: number;  // 秒
  text: string;
}

export const songsApi = {
  // 获取指定歌曲的歌词列表
  getLyrics: (songId: number, signal?: AbortSignal): Promise<LyricLine[]> =>
    client.get<{ success: boolean; data: { lines: LyricLine[]; wordTiming: boolean } | LyricLine[] }>(
      `/songs/${songId}/lyrics`,
      { signal },
    ).then(res => {
      const data = res.data.data;
      // 后端返回 { lines, wordTiming }，兼容旧版直接返回数组
      const lyrics = Array.isArray(data) ? data : data?.lines;
      return Array.isArray(lyrics) ? lyrics : [];
    }),
};
