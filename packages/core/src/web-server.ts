import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { join } from 'path';
import { existsSync } from 'fs';
import { registerApiRoutes } from './api-routes.js';
import { WsBridge } from './ws-bridge.js';

export interface WebServerOptions {
  port?: number;
  staticDir?: string;
  open?: boolean;
}

export interface WebServerInstance {
  server: ReturnType<typeof createServer>;
  app: express.Express;
  wsBridge: WsBridge;
  close(): Promise<void>;
}

export async function createWebServer(
  options: WebServerOptions = {}
): Promise<WebServerInstance> {
  const { port = 3456, staticDir, open = true } = options;

  const app = express();
  app.use(express.json());

  // Register API routes
  registerApiRoutes(app);

  // Serve static files if staticDir exists
  if (staticDir && existsSync(staticDir)) {
    app.use(express.static(staticDir));

    // SPA fallback: non-API routes serve index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(join(staticDir, 'index.html'));
      }
    });
  }

  const server = createServer(app);

  // WebSocket server on /ws path
  const wss = new WebSocketServer({ server, path: '/ws' });
  const wsBridge = new WsBridge(wss);

  return new Promise((resolve) => {
    server.listen(port, async () => {
      if (open) {
        try {
          // Dynamic import — open is an optional dependency
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const openModule = await (Function('return import("open")')() as Promise<{ default: (url: string) => Promise<unknown> }>);
          await openModule.default(`http://localhost:${port}`);
        } catch {
          // open is optional, ignore if not available
        }
      }

      resolve({
        server,
        app,
        wsBridge,
        async close() {
          wsBridge.detachReporter();
          wss.close();
          return new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          });
        },
      });
    });
  });
}
