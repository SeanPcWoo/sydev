import type { Express, Request, Response, NextFunction } from 'express';

export function registerApiRoutes(app: Express): void {
  // Health check
  app.get('/api/status', (_req: Request, res: Response) => {
    res.json({ ok: true });
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
