/* Hallmark · genre: editorial · theme: Garden · Index-First · Search page
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { songsApi } from '../api/songs';
import BottomNav from '../components/BottomNav';
import SongList from '../components/SongList';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import type { Song } from '@nasktv/shared';
import { Search as SearchIcon, X, Clock, Trash2, TrendingUp } from 'lucide-react';

const SEARCH_HISTORY_KEY = 'nasktv-search-history';

const css = `
/* Hallmark · genre: editorial · theme: Garden · Index-First · Search page */

.search-bar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  padding: calc(env(safe-area-inset-top) + var(--space-lg)) var(--space-xl) var(--space-md);
  background-color: color-mix(in oklab, var(--color-paper) 92%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-paper-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: border-color var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out),
              background-color var(--dur-fast) var(--ease-out);
  min-height: 48px;
}

.search-input-wrap:hover {
  border-color: var(--color-ink-3);
}

.search-input-wrap:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
  background-color: var(--color-paper);
}

.search-input-wrap[data-state="disabled"] {
  opacity: 0.5;
  pointer-events: none;
}

.search-input-wrap[data-state="error"] {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px var(--color-danger-soft);
}

.search-input-wrap[data-state="loading"] {
  pointer-events: none;
}

.search-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--color-ink);
}

.search-input::placeholder {
  color: var(--color-ink-3);
}

.search-input:focus-visible {
  outline: none;
}

.search-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--color-ink-3);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out);
  min-width: 44px;
  min-height: 44px;
}

.search-clear-btn:hover {
  background-color: var(--color-paper-3);
  color: var(--color-ink-2);
}

.search-clear-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.search-clear-btn:active {
  transform: scale(0.9);
  color: var(--color-ink);
}

.search-clear-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.history-section {
  padding: var(--space-md) var(--space-xl) 0;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.history-title {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-ink-2);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.history-clear-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border: none;
  background: transparent;
  color: var(--color-ink-3);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  min-height: 44px;
  min-width: 44px;
  justify-content: center;
  transition: color var(--dur-fast) var(--ease-out),
              background-color var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out);
}

.history-clear-btn:hover {
  color: var(--color-danger);
  background-color: var(--color-danger-soft);
}

.history-clear-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.history-clear-btn:active {
  transform: scale(0.95);
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.history-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background-color: var(--color-paper-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ink-2);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out);
  min-height: 44px;
  white-space: nowrap;
}

.history-tag:hover {
  background-color: var(--color-paper-3);
  border-color: var(--color-ink-3);
  color: var(--color-ink);
}

.history-tag:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.history-tag:active {
  transform: scale(0.96);
  background-color: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.history-tag:disabled {
  opacity: 0.4;
  pointer-events: none;
}

.results-section {
  padding: var(--space-md) var(--space-xl);
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.results-count {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ink-3);
}

.suggestion-section {
  padding: var(--space-lg) var(--space-xl);
}

.suggestion-title {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-ink-2);
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}
`;

export default function Search() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const doSearch = useCallback(async (kw: string, p: number = 1) => {
    if (!kw.trim()) return;
    setLoading(true);
    try {
      const result = await songsApi.getSongs({ keyword: kw, page: p, pageSize: 20 });
      if (p === 1) {
        setResults(result.items);
        setResultCount(result.total ?? result.items.length);
      } else {
        setResults(prev => [...prev, ...result.items]);
      }
      setHasMore((result.total ?? result.items.length) > p * 20);
      setPage(p);
      setSearched(true);

      if (p === 1) {
        const newHistory = [kw, ...history.filter(h => h !== kw)].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      }
    } finally {
      setLoading(false);
    }
  }, [history]);

  const handleSearch = () => {
    doSearch(keyword);
    inputRef.current?.blur();
  };

  const handleLoadMore = () => doSearch(keyword, page + 1);

  const handleHistoryClick = (kw: string) => {
    setKeyword(kw);
    doSearch(kw);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  const handleClearKeyword = () => {
    setKeyword('');
    setResults([]);
    setSearched(false);
    setResultCount(0);
    inputRef.current?.focus();
  };

  const showHistory = !searched && history.length > 0;
  const showEmpty = searched && !loading && results.length === 0;
  const showResults = searched && results.length > 0;
  const showInitial = !searched && history.length === 0;

  return (
    <>
      <style>{css}</style>

      <div className="min-h-screen bg-paper" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        <div className="search-bar">
          <div className="search-input-wrap" role="search" aria-label="搜索歌曲">
            <SearchIcon size={20} className="text-ink-3 flex-shrink-0" strokeWidth={1.8} />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索歌曲、歌手"
              className="search-input"
              aria-label="搜索关键词"
              autoComplete="off"
              enterKeyHint="search"
            />
            {keyword && (
              <button
                onClick={handleClearKeyword}
                className="search-clear-btn"
                aria-label="清除搜索"
                type="button"
              >
                <X size={18} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {showHistory && (
          <section className="history-section" aria-label="搜索历史">
            <div className="history-header">
              <span className="history-title">
                <Clock size={14} />
                搜索历史
              </span>
              <button
                onClick={clearHistory}
                className="history-clear-btn"
                aria-label="清除搜索历史"
                type="button"
              >
                <Trash2 size={14} />
                清除
              </button>
            </div>
            <div className="history-tags" role="list">
              {history.map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  onClick={() => handleHistoryClick(h)}
                  className="history-tag"
                  role="listitem"
                  type="button"
                >
                  {h}
                </button>
              ))}
            </div>
          </section>
        )}

        {loading && searched && (
          <div className="results-section">
            <Skeleton lines={5} />
          </div>
        )}

        {showResults && (
          <section className="results-section" aria-label="搜索结果">
            <div className="results-header">
              <span className="results-count">
                {resultCount > 0 ? `共 ${resultCount} 首` : `${results.length} 首歌曲`}
              </span>
            </div>
            <SongList
              songs={results}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />
          </section>
        )}

        {showEmpty && (
          <EmptyState
            icon={SearchIcon}
            title="未找到相关歌曲"
            description={`没有找到与"${keyword}"匹配的歌曲，换个关键词试试`}
          />
        )}

        {showInitial && (
          <div className="suggestion-section">
            <span className="suggestion-title">
              <TrendingUp size={14} />
              输入关键词开始搜索
            </span>
          </div>
        )}

        <BottomNav />
      </div>
    </>
  );
}
