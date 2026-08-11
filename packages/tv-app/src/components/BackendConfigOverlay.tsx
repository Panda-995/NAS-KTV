/* Hallmark · genre: atmospheric · component: BackendConfigOverlay · tv-app
 * 运行时后端 WebSocket 连接中断持续一段时间后弹出，提供二维码扫码 / 手动配置 重新连接后端
 * 注意：当用户已在连接/设置页时不会弹出（避免与 Setup 页功能重复）
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Keyboard,
  X,
  WifiOff,
} from 'lucide-react';
import QRCode from 'qrcode';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useLocation } from 'react-router-dom';
import { saveBackendConfig } from '../lib/backend-config';
import { useConfigStore } from '../stores/config';
import { wsClient } from '../ws/client';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// 断线持续多久后弹出配置（毫秒）
const SHOW_AFTER_MS = 10_000;

// 验证后端地址：GET /api/health 返回 success 即可
async function verifyBackend(apiUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${apiUrl}/api/health`, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.success !== false;
  } catch {
    return false;
  }
}

// 将任意 CSS 颜色值转为 hex（兼容 OKLCH/RGB/HSL 等现代格式）
function cssColorToHex(cssColor: string): string {
  if (!cssColor || cssColor.startsWith('#')) return cssColor || '#000000';
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch {
    return '#000000';
  }
}

export default function BackendConfigOverlay() {
  const { setConfig, configured } = useConfigStore();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrState, setQrState] = useState<'ready' | 'received' | 'error' | 'success'>('ready');
  const [manualUrl, setManualUrl] = useState('');
  const [manualStatus, setManualStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [manualError, setManualError] = useState('');
  const [error, setError] = useState('');

  const doneRef = useRef(false);
  const dismissedRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // 监听 WS 连接状态：非 connected 持续 SHOW_AFTER_MS 后弹出；connected 时隐藏并复位
  useEffect(() => {
    const schedule = () => {
      if (timerRef.current || dismissedRef.current) return;
      timerRef.current = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    };
    const off = wsClient.onStatusChange((status) => {
      if (status === 'connected') {
        clearTimer();
        dismissedRef.current = false;
        setVisible(false);
        setError('');
      } else {
        schedule();
      }
    });
    if (wsClient.getStatus() !== 'connected') schedule();
    return () => {
      off();
      clearTimer();
    };
  }, [clearTimer]);

  // 显示时：启动手机配置服务 + 生成二维码 + 监听回填事件
  useEffect(() => {
    if (!visible) return;
    if (IS_TAURI) {
      // 拉起 UDP 发现（幂等），确保手机配置页能拉取局域网已发现的后端列表
      invoke('start_discovery').catch(() => {});
      invoke('start_config_server').catch(() => {});
      (async () => {
        try {
          const ips = (await invoke('get_local_ips')) as unknown;
          if (Array.isArray(ips) && ips.length > 0) {
            const url = `http://${ips[0]}:45678/p`;
            const cs = getComputedStyle(document.documentElement);
            const qrDark = cssColorToHex(cs.getPropertyValue('--color-paper').trim()) || '#0a0d16';
            const qrLight = cssColorToHex(cs.getPropertyValue('--color-ink').trim()) || '#ffffff';
            const dataUrl = await QRCode.toDataURL(url, {
              width: 420,
              margin: 1,
              color: { dark: qrDark, light: qrLight },
            });
            setQrUrl(dataUrl);
          } else {
            setQrError('无法获取本机 IP，请检查网络连接');
          }
        } catch {
          setQrError('二维码生成失败，请使用下方手动配置');
        }
      })();
    } else {
      setQrError('浏览器环境不支持扫码，请使用下方手动配置');
    }

    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen<string>('nasktv:config-received', async (event) => {
          if (doneRef.current) return;
          const url = event.payload;
          setQrState('received');
          setError('');
          const ok = await verifyBackend(url);
          if (ok) {
            setQrState('success');
            await finishConfigure(url);
          } else {
            setQrState('error');
            setError('该地址无法访问，请确认后端服务已启动后重试');
          }
        });
      } catch {
        // 非 Tauri 环境无事件通道，忽略
      }
    })();
    return () => {
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 保存配置并重启（App 会按新地址重新 bootstrap）
  const finishConfigure = useCallback(
    async (url: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      try {
        const cfg = await saveBackendConfig(url);
        setConfig(cfg);
        window.location.reload();
      } catch (e) {
        console.error('Failed to save backend config:', e);
        doneRef.current = false;
        const details = e instanceof Error ? e.message : String(e);
        setError(`配置保存失败：${details || '未知错误'}，请检查磁盘权限后重试`);
      }
    },
    [setConfig],
  );

  // 手动配置提交（浏览器调试 / 无扫码环境）
  const submitManual = useCallback(async () => {
    if (doneRef.current) return;
    const url = manualUrl.trim().replace(/\/+$/, '');
    if (!url) return;
    setManualStatus('verifying');
    setManualError('');
    const ok = await verifyBackend(url);
    if (doneRef.current) return;
    if (ok) {
      setManualStatus('success');
      await finishConfigure(url);
    } else {
      setManualStatus('error');
      setManualError('无法连接该地址，请确认后端服务已启动且地址正确');
    }
  }, [manualUrl, finishConfigure]);

  const close = useCallback(() => {
    dismissedRef.current = true;
    setVisible(false);
    setError('');
  }, []);

  // 已在连接/设置页（未配置 或 路径为 /setup）时不弹窗，避免与 Setup 页功能重复
  const isOnSetupPage = !configured || location.pathname === '/setup';

  if (!visible || isOnSetupPage) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 px-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="后端连接配置"
    >
      <div className="w-full max-w-4xl bg-paper rounded-2xl border border-border p-xl flex flex-col gap-lg max-h-[90vh] overflow-auto">
        <header className="flex items-start justify-between gap-lg shrink-0">
          <div className="flex items-center gap-md min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl text-ink tracking-tight leading-tight">无法连接后端服务</h2>
              <p className="text-ink-3 text-sm mt-xs leading-relaxed">
                请扫码或用手机/电脑重新配置后端地址，配置后自动重连。
              </p>
            </div>
          </div>
          <button
            onClick={close}
            tabIndex={0}
            role="button"
            aria-label="关闭"
            className="w-10 h-10 rounded-2xl bg-paper-2 text-ink-2 flex items-center justify-center hover:bg-border focus-visible:ring-2 focus-visible:ring-accent shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-md px-lg py-sm bg-paper-2 border border-danger/30 rounded-2xl text-danger shrink-0"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-lg flex-1 min-h-0 items-start">
          {/* 扫码 */}
          <section
            className="bg-paper-2 border border-border rounded-2xl p-xl flex flex-col items-center gap-md overflow-hidden min-w-0"
            aria-label="扫码配置"
          >
            <h3 className="text-lg font-semibold text-ink flex items-center gap-md self-start shrink-0 flex-wrap w-full leading-snug">
              <span className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </span>
              <span className="min-w-0">手机扫码</span>
            </h3>
            <div
              className="bg-paper rounded-2xl p-md flex-1 flex items-center justify-center min-h-0 max-h-[50vh]"
              tabIndex={0}
              role="img"
              aria-label="配置二维码"
            >
              {qrUrl ? (
                <img src={qrUrl} alt="配置二维码" className="max-w-full max-h-full object-contain" />
              ) : qrError ? (
                <div className="flex flex-col items-center justify-center gap-md text-center px-lg">
                  <AlertCircle className="w-8 h-8 text-danger" />
                  <p className="text-danger text-sm">{qrError}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-ink-2 animate-spin" />
                </div>
              )}
            </div>
            <div className="text-center text-ink-3 text-xs leading-relaxed shrink-0 min-h-[2rem] break-words">
              {qrState === 'ready' && (
                <>用手机相机扫描二维码，在手机页面输入后端地址并提交。</>
              )}
              {qrState === 'received' && (
                <span className="flex items-center justify-center gap-md text-ink">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  已收到配置，正在验证...
                </span>
              )}
              {qrState === 'error' && <span className="text-danger">验证失败，请在手机上重试</span>}
            </div>
          </section>

          {/* 手动配置 */}
          <section
            className="bg-paper-2 border border-border rounded-2xl p-xl flex flex-col gap-md overflow-hidden min-w-0"
            aria-label="手动配置"
          >
            <h3 className="text-lg font-semibold text-ink flex items-center gap-md shrink-0 flex-wrap leading-snug">
              <span className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Keyboard className="w-5 h-5" />
              </span>
              <span className="min-w-0">手动配置</span>
            </h3>
            <p className="text-ink-3 text-xs leading-relaxed shrink-0 break-words">
              浏览器调试或无法扫码时，直接输入后端服务地址（如
              <span className="font-mono text-ink-2 break-all"> http://192.168.1.100:8080</span>）。
            </p>
            <div className="flex flex-col gap-sm shrink-0">
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => {
                  setManualUrl(e.target.value);
                  if (manualStatus !== 'idle') setManualStatus('idle');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitManual();
                }}
                placeholder="http://host:port"
                aria-label="后端服务地址"
                tabIndex={0}
                disabled={manualStatus === 'verifying'}
                className="w-full px-lg py-sm bg-paper border border-border rounded-2xl text-ink font-mono text-base placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
              />
              <button
                onClick={submitManual}
                disabled={!manualUrl.trim() || manualStatus === 'verifying' || doneRef.current}
                tabIndex={0}
                role="button"
                className="self-start flex items-center gap-md px-lg py-sm bg-accent text-on-accent rounded-2xl text-base font-medium disabled:opacity-50"
              >
                {manualStatus === 'verifying' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {manualStatus === 'verifying' ? '连接中...' : '连接'}
              </button>
            </div>
            <div className="text-sm shrink-0 min-h-[1.5rem]">
              {manualStatus === 'error' && (
                <span className="flex items-center gap-md text-danger">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {manualError}
                </span>
              )}
              {manualStatus === 'success' && (
                <span className="flex items-center gap-md text-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  验证通过，正在进入...
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
