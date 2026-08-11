/* Hallmark · genre: editorial · theme: Garden · Categories page
 * paper-band: light (>85%) · display: classical-serif · accent: leaf-green ~145°
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (≥4.5:1)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesApi } from '../api';
import BottomNav from '../components/BottomNav';
import type { CategoryGroup, CategoryItem } from '@nasktv/shared';
import { Loader2, ListMusic, Globe, CalendarDays, Music, Heart, Tag, Folder } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const groupIcons: Record<string, LucideIcon> = {
  '语种': Globe,
  '年代': CalendarDays,
  '风格': Music,
  '心情': Heart,
  '主题': Tag,
};

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cats = await categoriesApi.getCategories();
        if (!cancelled) setCategories(cats);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-paper pb-20" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <div className="p-xl pt-3xl bg-paper-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + var(--space-2xl))' }}>
        <h1 className="font-display text-2xl text-ink flex items-center gap-sm">
          <ListMusic size={24} className="text-accent" strokeWidth={1.6} />
          分类浏览
        </h1>
      </div>

      <div className="p-xl">
        {loading ? (
          <div className="flex justify-center py-3xl">
            <Loader2 className="text-accent animate-spin" size={24} />
          </div>
        ) : error ? (
          <div className="text-center py-3xl">
            <p className="text-ink-3 text-base mb-md">加载失败，请稍后重试</p>
            <button
              onClick={() => { setError(false); setLoading(true); }}
              className="px-lg py-sm bg-accent text-on-accent rounded-md text-sm
                hover:bg-accent-hover
                focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2
                active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-transform"
            >
              重试
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-3xl">
            <p className="text-ink-3 text-base">暂无分类</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-md">
            {categories.map(group => (
              <div
                key={group.id}
                className="bg-paper-2 rounded-lg border border-border p-md"
              >
                <button
                  onClick={() => navigate(`/category/${group.id}`)}
                  className="w-full flex items-center gap-sm mb-md text-left
                    hover:opacity-80
                    focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2
                    active:scale-[0.98]
                    transition-all rounded-md"
                  tabIndex={0}
                  role="link"
                >
                  {(() => { const Icon = groupIcons[group.name] || Folder; return (
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} strokeWidth={1.6} />
                    </span>
                  ); })()}
                  <h2 className="font-display text-lg text-ink flex-1">{group.name}</h2>
                  <span className="text-ink-3 text-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                    {group.items?.length || 0} 项
                  </span>
                </button>

                <div className="flex flex-wrap gap-sm">
                  {group.items?.map((item: CategoryItem) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/category/${group.id}?itemId=${item.id}`)}
                      className="px-md py-xs rounded-full text-sm
                        bg-paper text-ink-2 border border-border
                        hover:bg-accent-soft hover:text-accent hover:border-accent
                        focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2
                        active:scale-95 active:bg-accent active:text-on-accent active:border-accent
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-all"
                      tabIndex={0}
                      role="link"
                    >
                      {item.name}
                      {item.songCount ? (
                        <span className="text-ink-3 ml-1 text-xs">({item.songCount})</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
