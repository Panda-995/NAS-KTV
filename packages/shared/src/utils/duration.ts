export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function parseDuration(str: string): number {
  const match = str.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return 0;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  if (secs >= 60) return 0;
  return mins * 60 + secs;
}
