import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-accent" aria-hidden="true" />
      <span className="ml-3 text-ink-2">加载中...</span>
    </div>
  );
}
