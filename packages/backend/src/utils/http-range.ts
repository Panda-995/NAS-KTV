export interface ByteRange {
  start: number;
  end: number;
}

export function parseByteRange(header: string, fileSize: number): ByteRange | null {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number.parseInt(match[2], 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(fileSize - suffixLength, 0),
      end: fileSize - 1,
    };
  }

  const start = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(start) || start < 0 || start >= fileSize) return null;

  const requestedEnd = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) return null;

  return { start, end: Math.min(requestedEnd, fileSize - 1) };
}
