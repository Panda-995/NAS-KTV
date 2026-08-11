export const NICK_KEY = 'nasktv_nickname';

const NICK_ADJ = ['快乐', '活力', '逍遥', '星光', '梦想', '心动', '热辣', '清新', '酷炫', '元气', '幸运', '温柔', '闪亮', '自由'];
const NICK_NOUN = ['麦霸', '歌神', '唱将', '夜莺', '音浪', '乐迷', '知音', '歌姬', '灵魂', '节拍'];

export function randomNickname(): string {
  const adj = NICK_ADJ[Math.floor(Math.random() * NICK_ADJ.length)];
  const noun = NICK_NOUN[Math.floor(Math.random() * NICK_NOUN.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}

// 读取本地昵称：无则生成随机昵称并保存，避免每次进入界面重新设置
export function loadNickname(): string {
  try {
    const saved = localStorage.getItem(NICK_KEY);
    if (saved && saved.trim()) return saved;
  } catch {
    // localStorage 不可用时降级为纯随机
  }
  const gen = randomNickname();
  saveNickname(gen);
  return gen;
}

export function saveNickname(name: string): void {
  try {
    localStorage.setItem(NICK_KEY, name);
  } catch {
    // 忽略写入失败
  }
}
