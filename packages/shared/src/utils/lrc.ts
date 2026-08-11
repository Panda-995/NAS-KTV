export interface LrcLine {
  time: number;
  text: string;
}

export function parseLrc(lrcContent: string): LrcLine[] {
  if (!lrcContent) return [];

  const lines = lrcContent.split('\n');
  const result: LrcLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matches = trimmed.match(/\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g);
    if (!matches) continue;

    const text = trimmed.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();

    for (const match of matches) {
      const [, mins, secs, ms] = match.match(/\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/)!;
      const time =
        parseInt(mins, 10) * 60 +
        parseInt(secs, 10) +
        (ms ? parseInt(ms.padEnd(3, '0'), 10) / 1000 : 0);
      result.push({ time, text });
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}
