/* Hallmark · genre: editorial · component: QrScanner · mobile-h5
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X } from 'lucide-react';

interface QrScannerProps {
  onScan: (result: { authorizationCode: string; joinToken?: string }) => void;
  onClose: () => void;
}

const css = `
.qs-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--color-paper);
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
}

.qs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  padding-top: calc(env(safe-area-inset-top) + var(--space-md));
  background-color: var(--color-paper-2);
  border-bottom: 1px solid var(--color-border);
}

.qs-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-full);
  background-color: transparent;
  color: var(--color-ink-2);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.qs-close:hover {
  background-color: var(--color-paper-3);
  color: var(--color-ink);
}
.qs-close:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
.qs-close:active {
  transform: scale(0.92);
}

.qs-corners {
  position: absolute;
  width: 220px;
  height: 220px;
  pointer-events: none;
}
.qs-corners::before,
.qs-corners::after {
  content: '';
  position: absolute;
  width: 44px;
  height: 44px;
  border: 3px solid var(--color-accent);
}
.qs-corners::before {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: var(--radius-lg);
}
.qs-corners::after {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: var(--radius-lg);
}
.qs-corner-tr {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 44px;
  height: 44px;
  border: 3px solid var(--color-accent);
  border-left: none;
  border-bottom: none;
  border-top-right-radius: var(--radius-lg);
}
.qs-corner-bl {
  position: absolute;
  bottom: -2px;
  left: -2px;
  width: 44px;
  height: 44px;
  border: 3px solid var(--color-accent);
  border-right: none;
  border-top: none;
  border-bottom-left-radius: var(--radius-lg);
}

.qs-hint {
  padding: var(--space-md);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--space-md));
  background-color: var(--color-paper-2);
  border-top: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: reduce) {
  .qs-close {
    transition-duration: 0.01ms !important;
  }
}
`;

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanLoop();
        }
      } catch (e) {
        setError('无法访问摄像头，请检查权限或使用手动输入');
      }
    }

    function scanLoop() {
      if (!scanning || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationId = requestAnimationFrame(scanLoop);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        // 解析动态加入二维码，提取 authorizationCode + joinToken。
        const data = code.data;
        let authorizationCode = data;
        let joinToken: string | undefined;

        try {
          const url = new URL(data, window.location.origin);
          authorizationCode = url.searchParams.get('authorizationCode') ?? data;
          joinToken = url.searchParams.get('joinToken') ?? undefined;
        } catch {
          const match = data.match(/authorizationCode=([A-Z0-9]{6})/);
          if (match) authorizationCode = match[1];
        }

        if (/^[A-Z0-9]{6}$/.test(authorizationCode)) {
          setScanning(false);
          onScan({ authorizationCode, joinToken });
          return;
        }
      }

      animationId = requestAnimationFrame(scanLoop);
    }

    startCamera();

    return () => {
      setScanning(false);
      cancelAnimationFrame(animationId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [onScan]);

  return (
    <>
      <style>{css}</style>
      <div className="qs-overlay">
        <div className="qs-header">
          <h2 className="font-display text-lg text-ink">扫描房间二维码</h2>
          <button
            onClick={onClose}
            className="qs-close"
            aria-label="关闭"
            type="button"
          >
            <X size={24} strokeWidth={1.8} />
          </button>
        </div>

        {/* 摄像头预览 */}
        <div className="flex-1 relative overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-md p-xl">
              <Camera size={48} className="text-ink-3" strokeWidth={1.5} />
              <p className="text-ink-2 text-base text-center">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* 扫描框指示器 — 四角标记 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="qs-corners">
                  <span className="qs-corner-tr" />
                  <span className="qs-corner-bl" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部提示 */}
        <div className="qs-hint">
          <p className="text-ink-3 text-sm text-center">
            将 TV 端显示的二维码对准扫描框
          </p>
        </div>
      </div>
    </>
  );
}
