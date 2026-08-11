/* Hallmark · component: card · genre: atmospheric · theme: Midnight · states: 8 */
import { Music, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface LeanbackCardProps {
  title: string;
  subtitle?: string;      // 歌手名
  imageUrl?: string;      // 歌曲封面（可选，无则用占位）
  aspectRatio?: '16:9' | '1:1';  // 默认 1:1（音频），MV 用 16:9
  onClick?: () => void;
  active?: boolean;       // 当前选中
  loading?: boolean;      // 加载中状态
  error?: boolean;        // 错误状态
  success?: boolean;      // 成功状态
  disabled?: boolean;     // 禁用状态
}

/**
 * Leanback 风格卡片（10-foot UI / D-pad 可达）
 *
 * 8 状态完整支持：
 * 1. default  - 默认（bg-paper-2 / elevation）
 * 2. hover    - 悬停（bg-paper-3）
 * 3. focus    - 焦点（scale 1.05 + var(--ring-width) solid var(--color-focus)）
 * 4. active   - 当前选中（border-accent）
 * 5. disabled - 禁用（opacity-50 / tabIndex=-1）
 * 6. loading  - 加载中（Loader2 旋转覆盖层）
 * 7. error    - 错误（border-danger + AlertCircle 覆盖层）
 * 8. success  - 成功（border-success + CheckCircle 覆盖层）
 */
export default function LeanbackCard({
  title,
  subtitle,
  imageUrl,
  aspectRatio = '1:1',
  onClick,
  active = false,
  loading = false,
  error = false,
  success = false,
  disabled = false,
}: LeanbackCardProps) {
  // 状态优先级：disabled > error > success > active > default
  // 常态无 hairline（elevation 分层）；error/success/active 用细亮边表达状态
  const stateBorder = disabled
    ? 'opacity-50 cursor-not-allowed'
    : error
      ? 'border border-danger'
      : success
        ? 'border border-success'
        : active
          ? 'border border-accent [box-shadow:var(--shadow-glow-soft)]'
          : '';

  // 焦点环：禁用时不可聚焦；其余状态可聚焦
  const tabIndex = disabled ? -1 : 0;

  return (
    <div
      data-focusable
      data-focus-id={title}
      tabIndex={tabIndex}
      role="button"
      aria-disabled={disabled}
      aria-label={`歌曲 ${title}${subtitle ? ` - ${subtitle}` : ''}`}
      onClick={disabled || loading ? undefined : onClick}
      className={[
        // 容器基底（elevation 语言：分层卡而非 hairline）
        'group relative bg-paper-2 rounded-lg overflow-hidden',
        // 仅 transition transform 与 box-shadow（Hallmark 规范）
        'transition-[transform,box-shadow] duration-base ease-out',
        stateBorder,
        // hover 态（未禁用时）：微升 + 柔影
        disabled ? '' : 'hover:[box-shadow:var(--shadow-md)]',
        // 禁用默认 outline，改用 :focus-visible 自定义焦点环
        'focus:outline-none',
        // 焦点环（Hallmark 规范：var(--ring-width) solid var(--color-focus), offset var(--ring-offset)）
        // outline 不受 overflow-hidden 裁剪，可正常显示
        'focus-visible:[outline:var(--ring-width)_solid_var(--color-focus)]',
        'focus-visible:[outline-offset:var(--ring-offset)]',
        // 焦点：glow 光晕 + 缩放 1.05（atmospheric 分层语言）
        disabled
          ? ''
          : 'focus-visible:[box-shadow:var(--shadow-glow)] focus-visible:scale-[1.05]',
        // 按下缩放（CSS :active，与 active prop 区分）
        disabled ? '' : 'active:scale-[0.98]',
      ].join(' ')}
    >
      {/* 图片 / 占位区域 */}
      <div
        className={[
          'relative',
          aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square',
        ].join(' ')}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'var(--grad-card)' }}
          >
            <Music size={48} className="text-ink-3" strokeWidth={1.5} />
          </div>
        )}

        {/* Loading 状态覆盖层 */}
        {loading && (
          <div className="absolute inset-0 bg-paper-2/80 flex items-center justify-center">
            <Loader2 size={48} className="text-loading animate-spin" />
          </div>
        )}

        {/* Error 状态覆盖层 */}
        {error && (
          <div className="absolute inset-0 bg-paper-2/80 flex items-center justify-center">
            <AlertCircle size={48} className="text-danger" />
          </div>
        )}

        {/* Success 状态覆盖层 */}
        {success && (
          <div className="absolute inset-0 bg-paper-2/80 flex items-center justify-center">
            <CheckCircle size={48} className="text-success" />
          </div>
        )}
      </div>

      {/* 标题区 */}
      <div className="p-md">
        <h3 className="text-base text-ink font-medium truncate">{title}</h3>
        {subtitle && (
          <p className="text-sm text-ink-3 truncate mt-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
