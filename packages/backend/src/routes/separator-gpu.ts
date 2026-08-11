import { Router, Request, Response } from 'express';
import logger from '../logger';
import { separatorClient } from '../services/separator-client';
import { authenticateToken } from '../middleware/jwt';
import * as settingsService from '../services/settings-service';

const router = Router();

router.get('/separator/gpu/info', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const info = await separatorClient.getGpuInfo();
    res.json({ success: true, data: info });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get GPU info');
    res.status(502).json({ success: false, error: err.message || 'Separator service unavailable' });
  }
});

router.get('/separator/gpu/proxy', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const proxy = await settingsService.getPytorchProxy();
    res.json({ success: true, data: { proxy } });
  } catch (err: any) {
    logger.error({ err }, 'Failed to get PyTorch proxy config');
    res.status(500).json({ success: false, error: err.message || 'Failed to get proxy config' });
  }
});

router.put('/separator/gpu/proxy', authenticateToken, async (req: Request, res: Response) => {
  try {
    const proxy = (req.body?.proxy ?? '').toString().trim();
    await settingsService.updateSettings([{ key: 'pytorch_proxy', value: proxy }]);
    res.json({ success: true, data: { proxy } });
  } catch (err: any) {
    logger.error({ err }, 'Failed to save PyTorch proxy config');
    res.status(500).json({ success: false, error: err.message || 'Failed to save proxy config' });
  }
});

async function installPytorch(
  req: Request,
  res: Response,
  installFn: (proxy: string) => ReturnType<typeof fetch>,
) {
  try {
    const proxy = await settingsService.getPytorchProxy();
    const upstream = await installFn(proxy);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!upstream.body) {
      res.write('data: ERROR: No response from separator\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const reader = (upstream.body as any).getReader?.() ?? null;

    if (reader) {
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (err: any) {
        logger.error({ err }, 'SSE stream read error');
      }
    } else {
      const text = await upstream.text();
      res.write(text);
    }

    res.end();
  } catch (err: any) {
    logger.error({ err }, 'Failed to install PyTorch');
    res.write(`data: ERROR: ${err.message || 'Separator service unavailable'}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

router.post('/separator/gpu/install-gpu', authenticateToken, (req: Request, res: Response) => {
  return installPytorch(req, res, proxy => separatorClient.installGpu(proxy));
});

router.post('/separator/gpu/install-cpu', authenticateToken, (req: Request, res: Response) => {
  return installPytorch(req, res, proxy => separatorClient.installCpu(proxy));
});

export default router;
