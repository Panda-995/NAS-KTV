/* Hallmark · genre: editorial · theme: Garden · Skeleton component
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

interface SkeletonProps {
  lines?: number;
  avatar?: boolean;
}

export default function Skeleton({ lines = 3, avatar = false }: SkeletonProps) {
  return (
    <div className="flex flex-col gap-sm">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-md p-md bg-paper-2 rounded-md"
        >
          {avatar && (
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full skeleton-pulse"
              style={{ backgroundColor: 'var(--color-paper-3)' }}
            />
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-sm">
            <div
              className="h-4 rounded-sm skeleton-pulse"
              style={{
                backgroundColor: 'var(--color-paper-3)',
                width: i % 3 === 2 ? '50%' : i % 3 === 1 ? '70%' : '85%',
              }}
            />
            <div
              className="h-3 rounded-sm skeleton-pulse"
              style={{
                backgroundColor: 'var(--color-paper-3)',
                width: i % 2 === 0 ? '45%' : '60%',
                animationDelay: `${i * 100}ms`,
              }}
            />
          </div>

          <div
            className="flex-shrink-0 w-10 h-10 rounded-full skeleton-pulse"
            style={{
              backgroundColor: 'var(--color-paper-3)',
              animationDelay: `${i * 80}ms`,
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
