import { useEffect, useRef, useState } from 'react';

/**
 * 数字滚动动画：目标值变化时从旧值缓动过渡到新值（ease-out cubic）。
 * 刷新数据时数值平滑变化，符合 modern-minimal 动效克制原则。
 */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    if (target === from) return;
    prevRef.current = target;
    if (typeof window === 'undefined') {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return Math.round(value);
}
