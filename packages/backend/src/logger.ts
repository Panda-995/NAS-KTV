import pino, { type Logger } from 'pino';
import { Writable } from 'stream';

let _logger: Logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function initLogger(customStream: Writable): void {
  _logger = pino(
    { level: process.env.LOG_LEVEL || 'info' },
    pino.multistream([process.stdout, customStream]),
  );
}

export function getLogger(): Logger {
  return _logger;
}

const logger: Record<string, unknown> = {};

export default new Proxy(logger, {
  get(_, prop) {
    const val = (_logger as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === 'function') {
      return val.bind(_logger);
    }
    return val;
  },
}) as unknown as Logger;
