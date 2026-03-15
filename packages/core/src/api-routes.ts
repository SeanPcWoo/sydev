import type { Express, Request, Response, NextFunction } from 'express';
import { ConfigReader } from './config-reader.js';

export function registerApiRoutes(app: Express): void {
  const configReader = new ConfigReader();

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Status endpoints
  app.get('/api/status/workspace', (_req: Request, res: Response) => {
    res.json(configReader.getWorkspaceStatus());
  });

  app.get('/api/status/projects', (_req: Request, res: Response) => {
    res.json(configReader.getProjects());
  });

  app.get('/api/status/devices', (_req: Request, res: Response) => {
    res.json(configReader.getDevices());
  });

  // Workspace
  app.post('/api/workspace/init', placeholder);

  // Project
  app.post('/api/project/create', placeholder);

  // Device
  app.post('/api/device/add', placeholder);

  // Templates CRUD
  app.get('/api/templates', placeholder);
  app.post('/api/templates', placeholder);
  app.get('/api/templates/:id', placeholder);
  app.put('/api/templates/:id', placeholder);
  app.delete('/api/templates/:id', placeholder);

  // Template import/export
  app.post('/api/templates/import', placeholder);
  app.get('/api/templates/:id/export', placeholder);

  // Batch
  app.post('/api/batch/execute', placeholder);

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', err.message);
    res.status(500).json({ error: err.message });
  });
}

function placeholder(_req: Request, res: Response): void {
  res.status(501).json({ error: 'Not implemented' });
}
