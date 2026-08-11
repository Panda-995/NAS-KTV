import dgram from 'dgram';
import os from 'os';
import logger from '../logger';
import { config } from '../config';

// 局域网发现端口：TV 端监听同一端口接收广播
const DISCOVERY_PORT = 45678;
const BROADCAST_INTERVAL_MS = 5000;

let socket: dgram.Socket | null = null;
let timer: NodeJS.Timeout | null = null;

/**
 * 获取本机第一个局域网 IPv4 地址（用于拼装局域网可达的服务地址）。
 * 过滤 WSL/Docker 内网（172.16–31.x），优先 192.168.x / 10.x。
 */
function getLocalIPv4(): string | null {
  const ifaces = os.networkInterfaces();
  let fallback: string | null = null;
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      const octets = iface.address.split('.').map(Number);
      // 过滤 WSL / Docker 内网段（172.16.0.0 – 172.31.255.255）
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) continue;
      // 优先 192.168.x（家庭局域网最常见）
      if (octets[0] === 192 && octets[1] === 168) return iface.address;
      // 其次 10.x
      if (octets[0] === 10) return iface.address;
      // 其余保留作为 fallback
      if (!fallback) fallback = iface.address;
    }
  }
  return fallback;
}

/**
 * 启动 UDP 局域网发现广播：周期性向 255.255.255.255:45678 广播服务信息，
 * 供 TV 端自动扫描局域网内的后端服务（幂等，重复调用直接返回）。
 */
export function startDiscoveryBroadcast(): void {
  if (timer) {
    return;
  }

  socket = dgram.createSocket('udp4');
  socket.on('error', (err) => {
    logger.warn({ err }, 'UDP discovery socket error');
  });
  socket.bind(() => {
    socket?.setBroadcast(true);
  });

  const broadcast = () => {
    const ip = getLocalIPv4();
    if (!ip) {
      return;
    }
    const payload = Buffer.from(
      JSON.stringify({
        service: 'nasktv-backend',
        name: 'NASKTV',
        apiBaseUrl: `http://${ip}:${config.port}`,
        wsUrl: `ws://${ip}:${config.port}`,
      }),
    );
    socket?.send(payload, DISCOVERY_PORT, '255.255.255.255', (err) => {
      if (err) {
        logger.warn({ err }, 'UDP discovery broadcast failed');
      }
    });
  };

  broadcast();
  timer = setInterval(broadcast, BROADCAST_INTERVAL_MS);
  logger.info(`UDP discovery broadcast started on port ${DISCOVERY_PORT}`);
}
