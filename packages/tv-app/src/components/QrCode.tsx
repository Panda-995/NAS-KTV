import { useState } from 'react';
import { roomsApi } from '../api/rooms';

interface QrCodeProps {
  value: string;
  size?: number;
}

export default function QrCode({ value, size = 200 }: QrCodeProps) {
  const [error, setError] = useState(false);
  const qrUrl = roomsApi.getQrCodeUrl(value);

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-paper-3 rounded"
        style={{ width: size, height: size }}
      >
        <span className="text-ink-3 text-xs text-center px-sm">
          二维码加载失败
        </span>
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt={`QR Code: ${value}`}
      width={size}
      height={size}
      onError={() => setError(true)}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
