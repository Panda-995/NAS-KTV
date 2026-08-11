import { useEffect, useCallback, useRef } from 'react';

interface DpadFocusable {
  id: string;
  element: HTMLElement;
  rect: DOMRect;
}

export interface DpadNavigationOptions {
  /** MediaAudio：循环切换 vocalMode */
  onMediaAudio?: () => void;
  /** MediaPrevious：上一首 */
  onMediaPrevious?: () => void;
  /** MediaNext：下一首/切歌 */
  onMediaNext?: () => void;
  /** Menu：打开/关闭高级控制面板 */
  onMenu?: () => void;
  /** 数字键 0-9，n 为 0-9，用于跳转到歌词 n*10% 位置 */
  onNumberKey?: (n: number) => void;
  /** 可聚焦元素选择器，默认 '[data-focusable]' */
  selector?: string;
}

/**
 * D-pad 方向键导航 hook
 * 支持上下左右方向键在可聚焦元素间导航（10-foot UI 必备）
 * 同时支持遥控器多媒体按键、菜单键和数字键
 */
export function useDpadNavigation(options?: DpadNavigationOptions): void {
  // 用 ref 持有最新的 options，避免每次渲染都重新绑定事件监听
  const optionsRef = useRef<DpadNavigationOptions | undefined>(options);
  optionsRef.current = options;

  const getFocusables = useCallback((): DpadFocusable[] => {
    const selector = optionsRef.current?.selector ?? '[data-focusable]';
    const elements = document.querySelectorAll<HTMLElement>(selector);
    return Array.from(elements).map((el, i) => ({
      id: el.dataset.focusId || `item-${i}`,
      element: el,
      rect: el.getBoundingClientRect(),
    }));
  }, []);

  const focusNearest = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const selector = optionsRef.current?.selector ?? '[data-focusable]';
    const focusables = getFocusables();
    if (focusables.length === 0) return;

    const current = document.activeElement as HTMLElement | null;
    let currentRect: DOMRect | null = null;
    if (current && current.matches(selector)) {
      currentRect = current.getBoundingClientRect();
    } else {
      // 没有焦点时，聚焦第一个
      focusables[0].element.focus();
      return;
    }

    if (!currentRect) return;

    // 找到方向上最近的可聚焦元素
    let best: DpadFocusable | null = null;
    let bestScore = Infinity;

    for (const f of focusables) {
      if (f.element === current) continue;

      const dx = f.rect.left + f.rect.width / 2 - (currentRect.left + currentRect.width / 2);
      const dy = f.rect.top + f.rect.height / 2 - (currentRect.top + currentRect.height / 2);

      let score = Infinity;
      let valid = false;

      switch (direction) {
        case 'up':
          if (dy < -10) {
            score = Math.abs(dy) + Math.abs(dx) * 2;
            valid = true;
          }
          break;
        case 'down':
          if (dy > 10) {
            score = Math.abs(dy) + Math.abs(dx) * 2;
            valid = true;
          }
          break;
        case 'left':
          if (dx < -10) {
            score = Math.abs(dx) + Math.abs(dy) * 2;
            valid = true;
          }
          break;
        case 'right':
          if (dx > 10) {
            score = Math.abs(dx) + Math.abs(dy) * 2;
            valid = true;
          }
          break;
      }

      if (valid && score < bestScore) {
        bestScore = score;
        best = f;
      }
    }

    if (best) {
      best.element.focus();
    }
  }, [getFocusables]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const key = e.key;
      const code = e.keyCode;
      const opts = optionsRef.current;

      // 优先用 event.key，回退到 event.keyCode（Tauri WebView 中两者都可用）

      // MediaAudio：循环切换 vocalMode
      if (key === 'MediaAudio' || code === 209) {
        opts?.onMediaAudio?.();
        e.preventDefault();
        return;
      }
      // MediaPrevious：上一首
      if (key === 'MediaPrevious' || code === 88) {
        opts?.onMediaPrevious?.();
        e.preventDefault();
        return;
      }
      // MediaNext：下一首/切歌
      if (key === 'MediaNext' || code === 87) {
        opts?.onMediaNext?.();
        e.preventDefault();
        return;
      }
      // Menu：打开/关闭高级控制面板
      if (key === 'Menu' || code === 82) {
        opts?.onMenu?.();
        e.preventDefault();
        return;
      }
      // 数字键 0-9：跳转到歌词 n*10% 位置
      if (key >= '0' && key <= '9') {
        const n = parseInt(key, 10);
        opts?.onNumberKey?.(n);
        e.preventDefault();
        return;
      }

      // 方向键 + Enter 导航（保留既有逻辑）
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          focusNearest('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          focusNearest('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          focusNearest('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          focusNearest('right');
          break;
        case 'Enter':
          if (document.activeElement && (document.activeElement as HTMLElement).click) {
            e.preventDefault();
            (document.activeElement as HTMLElement).click();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusNearest]);
}
