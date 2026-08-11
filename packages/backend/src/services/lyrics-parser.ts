/**
 * LRC 歌词解析器
 *
 * 将标准 LRC 文本解析为 `{ time, text }` 数组，time 单位为秒。
 * 支持两种时间戳格式：
 *   - [mm:ss.xx]（如 [00:12.50]一行歌词 → { time: 12.5, text: "一行歌词" }）
 *   - [mm:ss]    （如 [01:30]一行歌词   → { time: 90, text: "一行歌词" }）
 * 支持多时间戳行（如 [00:01.00][01:30.00]同一行歌词 展开为两条记录）。
 * 不含时间戳的行（含 ID 标签如 [ti:xxx]、空行等）跳过。
 */

import fs from 'fs';

export interface LyricLine {
  /** 时间戳，单位秒 */
  time: number;
  /** 歌词文本 */
  text: string;
}

export interface ParseResult {
  lines: LyricLine[];
  /** 是否为逐字歌词（text 中含 <mm:ss.xx> 逐字时间标签） */
  wordTiming: boolean;
}

// 匹配单条时间戳：[mm:ss] 或 [mm:ss.xx]，秒与毫秒均允许 1-2 位
const TIMESTAMP_REGEX = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;

// 逐字歌词标签：<mm:ss.xx> 或 <mm:ss>
const WORD_TIMING_REGEX = /<\d{1,2}:\d{1,2}(?:\.\d{1,3})?>/;

/**
 * 读取歌词文件并智能解码。
 *
 * 优先按 UTF-8 解码；若出现替换字符 U+FFFD（说明原文件为 GBK/GB2312
 * 等中文编码），则回退用 GBK 解码，避免导入的 .lrc 显示乱码。
 * 解码后统一剥离 BOM。
 */
export function readLyricsFile(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const utf8 = new TextDecoder('utf-8').decode(buf);
  if (!utf8.includes('\uFFFD')) {
    return utf8.replace(/^\uFEFF/, '');
  }
  try {
    return new TextDecoder('gbk').decode(buf).replace(/^\uFEFF/, '');
  } catch {
    return utf8;
  }
}

/**
 * 解析 LRC 文本为歌词行数组。
 *
 * @param content LRC 原始文本
 * @returns 按时间升序排列的歌词行 + 是否逐字歌词
 */
export function parseLRC(content: string): ParseResult {
  const lines: LyricLine[] = [];
  let wordTiming = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const stamps = [...rawLine.matchAll(TIMESTAMP_REGEX)];
    if (stamps.length === 0) continue;

    // 去掉所有时间戳得到纯歌词文本
    const text = rawLine.replace(TIMESTAMP_REGEX, '').trim();

    // 检测逐字歌词标签 <mm:ss.xx>
    if (!wordTiming && WORD_TIMING_REGEX.test(text)) {
      wordTiming = true;
    }

    for (const stamp of stamps) {
      const mm = parseInt(stamp[1], 10);
      const ss = parseInt(stamp[2], 10);
      // 将小数部分作为 0.{frac} 解析，自动适配 1-3 位精度
      const fracSeconds = stamp[3] ? parseFloat('0.' + stamp[3]) : 0;
      lines.push({ time: mm * 60 + ss + fracSeconds, text });
    }
  }

  // 按时间升序排列
  lines.sort((a, b) => a.time - b.time);
  return { lines, wordTiming };
}
