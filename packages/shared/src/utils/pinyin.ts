let pinyinPro: ((text: string, options?: Record<string, unknown>) => string) | null = null;
let pinyinProAvailable = true;

try {
  const mod = require('pinyin-pro');
  pinyinPro = mod.pinyin;
} catch {
  pinyinProAvailable = false;
}

function withFallback<T>(fn: () => T, fallback: T): T {
  if (!pinyinProAvailable || !pinyinPro) return fallback;
  try {
    return fn();
  } catch {
    pinyinProAvailable = false;
    return fallback;
  }
}

function basicGetPinyin(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-_]+/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

function basicGetFirstLetter(text: string): string {
  const first = text.trim().charAt(0);
  if (!first) return '#';
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  return '#';
}

export function getPinyin(text: string): string {
  if (!text) return '';
  return withFallback(
    () =>
      pinyinPro!(text, { toneType: 'none', multiple: true })
        .replace(/,/g, '')
        .replace(/\s+/g, '')
        .toLowerCase(),
    basicGetPinyin(text),
  );
}

export function getFirstLetter(text: string): string {
  if (!text) return '#';
  const first = text.trim().charAt(0);
  if (!first) return '#';
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  if (/[\u4e00-\u9fff]/.test(first)) {
    return withFallback(
      () => {
        const result = pinyinPro!(first, { pattern: 'first', multiple: true });
        const letter = result.replace(/,/g, '').trim().charAt(0);
        return letter ? letter.toUpperCase() : '#';
      },
      basicGetFirstLetter(first),
    );
  }
  return '#';
}
