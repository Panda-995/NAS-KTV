/* Hallmark · genre: atmospheric · macrostructure: settings · design-system: design.md · designed-as-app */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Smartphone, AlertCircle, RefreshCw, CheckCircle2, Keyboard } from 'lucide-react';
import QRCode from 'qrcode';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { resetBackendConfig, saveBackendConfig } from '../lib/backend-config';
import { useConfigStore } from '../stores/config';

// 浏览器环境检测（Tauri 2 的 invoke 存在于 window.__TAURI_INTERNALS__）
const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// 验证后端地址：GET /api/health 返回 success 即可
async function verifyBackend(apiUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${apiUrl}/api/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.success !== false;
  } catch (e) {
    return false;
  }
}

const css = `
/* 二维码卡片光晕（focus 时高亮） */
.setup-qr-wrap {
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-glow-soft);
  transition: box-shadow 200ms var(--ease-out);
}
.setup-qr-wrap:focus-visible {
  box-shadow: 0 0 0 2px var(--color-accent), var(--shadow-glow-soft);
}
`;

export default function Setup() {
  const { configured, apiUrl, setConfig, setUnconfigured } = useConfigStore();
  const [qrUrl, setQrUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrState, setQrState] = useState<'ready' | 'received' | 'error'>('ready');
  const [error, setError] = useState('');

  // 手动配置（浏览器调试 / 无扫码环境）：输入后端地址直接连接
  const [manualUrl, setManualUrl] = useState('');
  const [manualStatus, setManualStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [manualError, setManualError] = useState('');

  // 已完成配置标记（reload 前避免重复保存）
  const doneRef = useRef(false);

// 将任意 CSS 颜色值转为 hex（兼容 OKLCH/RGB/HSL 等现代格式，
// 避免 QRCode.toDataURL 在旧版 WebView Canvas 中无法解析 oklch() 导致崩溃）
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

// 生成手机扫码二维码（依赖本机 IP，失败时返回错误文案供界面展示）
const genQr = useCallback(async () => {
  setQrUrl('');
  setQrError('');
  if (!IS_TAURI) {
    setQrError('浏览器环境不支持此功能，请使用 tauri dev 或 Android APK 运行');
    return;
  }
  try {
    const ips = (await invoke('get_local_ips')) as unknown;
    if (!Array.isArray(ips) || ips.length === 0) {
      setQrError('无法获取本机 IP，请检查网络连接');
      return;
    }
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
  } catch (e) {
    console.error('genQr failed:', e);
    setQrError('二维码生成失败，请重试');
  }
}, []);

  // 重试：重新启动配置服务 + 重新生成二维码
  const retryQr = useCallback(async () => {
    if (!IS_TAURI) return;
    invoke('start_config_server').catch(() => {});
    await genQr();
  }, [genQr]);

  // 保存配置并重启 App 流程（App.tsx 会按新地址重新 bootstrap）
  const finishConfigure = useCallback(
    async (url: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      try {
        const cfg = await saveBackendConfig(url);
        setConfig(cfg);
        window.location.reload();
      } catch (e) {
        // 保存失败时绝不能 reload，否则会陷入「保存失败→再保存」死循环
        console.error('Failed to save backend config:', e);
        doneRef.current = false;
        const details = e instanceof Error ? e.message : String(e);
        setError(`配置保存失败：${details || '未知错误'}，请检查磁盘权限后重试`);
      }
    },
    [setConfig],
  );

  // 启动扫码配置服务 + 生成二维码
  useEffect(() => {
    if (IS_TAURI) {
      invoke('start_config_server').catch(() => {});
    }
    genQr();
  }, [genQr]);

  // 监听手机扫码回填的后端地址（Tauri 事件）
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        unlisten = await listen<string>('nasktv:config-received', async (event) => {
          if (cancelled || doneRef.current) return;
          const url = event.payload;
          setQrState('received');
          setError('');
          const ok = await verifyBackend(url);
          if (cancelled) return;
          if (ok) {
            await finishConfigure(url);
          } else {
            setQrState('error');
            setError('该地址无法访问，请确认后端服务已启动后重试');
          }
        });
      } catch (e) {
        // 非 Tauri 环境无事件通道，忽略
      }
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [finishConfigure]);

  // 重新配置：清除保存的配置并重启（回到首次使用流程）
  const reconfig = useCallback(async () => {
    await resetBackendConfig();
    setUnconfigured();
    window.location.reload();
  }, [setUnconfigured]);

  // 手动配置：输入后端地址，验证通过后保存并进入（浏览器调试与非 Tauri 环境均可用）
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

  return (
    <div className="h-screen overflow-hidden bg-paper flex flex-col">
      <style>{css}</style>
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-2xl py-xl min-h-0">
        <header className="mb-xl shrink-0">
          <h1 className="font-display text-2xl text-ink mb-md tracking-tight leading-tight">
            {configured ? '后端设置' : '连接 NASKTV'}
          </h1>
          <p className="text-ink-3 text-lg leading-relaxed">
            {configured
              ? '当前后端服务不可用时，可重新配置。'
              : '请用手机扫码快速配置，或在下方手动输入后端地址。'}
          </p>
        </header>

        {configured && apiUrl && (
          <div className="flex items-center justify-between gap-lg mb-lg px-lg py-sm bg-paper-2 border border-border rounded-2xl shrink-0">
            <span className="flex items-center gap-md text-ink text-sm min-w-0">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              <span className="font-mono truncate">{apiUrl}</span>
            </span>
            <button
              className="flex items-center gap-sm text-danger text-sm underline underline-offset-4 shrink-0"
              tabIndex={0}
              role="button"
              onClick={reconfig}
            >
              <RefreshCw className="w-4 h-4" />
              重新配置
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-md mb-lg px-lg py-sm bg-paper-2 border border-danger/30 rounded-2xl text-danger shrink-0"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-lg flex-1 min-h-0 items-stretch">
          {/* 手动配置（浏览器调试 / 无扫码环境可用） */}
          <section
            className="bg-paper-2 border border-border rounded-2xl p-xl flex flex-col gap-md overflow-hidden min-w-0"
            aria-label="手动配置"
          >
            <h2 className="text-lg font-semibold text-ink flex items-center gap-md shrink-0 flex-wrap leading-snug">
              <span className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Keyboard className="w-5 h-5" />
              </span>
              <span className="min-w-0">手动配置</span>
            </h2>

            <p className="text-ink-3 text-sm leading-relaxed shrink-0 break-words">
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

          {/* 手机扫码 */}
          <section
            className="bg-paper-2 border border-border rounded-2xl p-xl flex flex-col items-center gap-md overflow-hidden min-w-0"
            aria-label="手机扫码配置"
          >
            <h2 className="text-lg font-semibold text-ink flex items-center gap-md self-start shrink-0 flex-wrap w-full leading-snug">
              <span className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </span>
              <span className="min-w-0">手机扫码</span>
            </h2>

            <div
              className="setup-qr-wrap bg-paper rounded-2xl p-md flex-1 flex items-center justify-center min-h-0 max-h-[50vh] w-full"
              tabIndex={0}
              role="img"
              aria-label="手机扫码配置二维码"
            >
              {qrUrl ? (
                <img src={qrUrl} alt="配置二维码" className="max-w-full max-h-full object-contain" />
              ) : qrError ? (
                <div className="flex flex-col items-center justify-center gap-md text-center px-lg">
                  <AlertCircle className="w-8 h-8 text-danger" />
                  <p className="text-danger text-sm">{qrError}</p>
                  <button
                    className="flex items-center gap-sm text-accent text-sm underline underline-offset-4"
                    tabIndex={0}
                    role="button"
                    onClick={retryQr}
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-ink-2 animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center text-ink-3 text-xs leading-relaxed shrink-0 min-h-[2rem] break-words">
              {qrState === 'ready' && (
                <>
                  用手机相机扫描二维码，在手机页面输入
                  <br />
                  后端服务地址，提交后电视自动保存并进入。
                </>
              )}
              {qrState === 'received' && (
                <span className="flex items-center justify-center gap-md text-ink">
                  <Loader2 className="w-5 h-5 animate-spin text-accent" />
                  已收到配置，正在验证...
                </span>
              )}
              {qrState === 'error' && (
                <span className="text-danger">验证失败，请在手机上重试</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
