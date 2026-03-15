import type { Express, Request, Response, NextFunction } from 'express';
import { ConfigReader } from './config-reader.js';
import { TemplateManager } from './template-manager.js';
import { templateContentSchema } from './schemas/template-schema.js';
import { workspaceSchema } from './schemas/workspace-schema.js';
import { projectSchema } from './schemas/project-schema.js';
import { deviceSchema } from './schemas/device-schema.js';
import { RlWrapper } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';
import type { TemplateType } from './template-manager.js';
import type { ZodError } from 'zod';

function zodFieldErrors(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export interface ApiRoutesOptions {
  cwd?: string;
}

export function registerApiRoutes(app: Express, options: ApiRoutesOptions = {}): void {
  const cwd = options.cwd || process.cwd();
  const configReader = new ConfigReader();
  const templateManager = new TemplateManager(cwd);

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
  app.post('/api/workspace/init', async (req: Request, res: Response) => {
    const parsed = workspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: '验证失败', fields: zodFieldErrors(parsed.error) });
      return;
    }
    try {
      const reporter = new ProgressReporter();
      reporter.on('error', () => {}); // prevent unhandled throw
      const rl = new RlWrapper(reporter);
      const result = await rl.initWorkspace(parsed.data);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // Project
  app.post('/api/project/create', async (req: Request, res: Response) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: '验证失败', fields: zodFieldErrors(parsed.error) });
      return;
    }
    try {
      const reporter = new ProgressReporter();
      reporter.on('error', () => {});
      const rl = new RlWrapper(reporter);
      const result = await rl.createProject(parsed.data);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // Device
  app.post('/api/device/add', async (req: Request, res: Response) => {
    const parsed = deviceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: '验证失败', fields: zodFieldErrors(parsed.error) });
      return;
    }
    try {
      const reporter = new ProgressReporter();
      reporter.on('error', () => {});
      const rl = new RlWrapper(reporter);
      const result = await rl.addDevice(parsed.data);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // --- Templates CRUD ---

  // List templates (optional ?type= filter)
  app.get('/api/templates', (req: Request, res: Response) => {
    try {
      const type = req.query.type as TemplateType | undefined;
      const validTypes = ['workspace', 'project', 'device', 'full'];
      if (type && !validTypes.includes(type)) {
        res.status(400).json({ error: `无效的模板类型: ${type}` });
        return;
      }
      const templates = templateManager.list(type);
      res.json(templates);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Create template
  app.post('/api/templates', (req: Request, res: Response) => {
    try {
      const { name, description, type, data } = req.body;
      if (!name || !type) {
        res.status(400).json({ error: '缺少必填字段: name, type' });
        return;
      }
      const meta = templateManager.save(name, description || '', type, data);
      res.status(201).json(meta);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('无效') ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  });

  // Import template (must be before :id routes)
  app.post('/api/templates/import', (req: Request, res: Response) => {
    try {
      const { name, description, type, data } = req.body;
      if (!name || !type || data === undefined) {
        res.status(400).json({ error: '缺少必填字段: name, type, data' });
        return;
      }
      // Validate content against schema
      templateContentSchema.parse({ type, data });
      const meta = templateManager.save(name, description || '', type, data);
      res.status(201).json(meta);
    } catch (err) {
      const msg = (err as Error).message;
      res.status(400).json({ error: msg });
    }
  });

  // Get template by ID
  app.get('/api/templates/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = templateManager.load(id);
      res.json(result);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('不存在') || msg.includes('丢失') ? 404 : 500;
      res.status(status).json({ error: msg });
    }
  });

  // Update template
  app.put('/api/templates/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!templateManager.exists(id)) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }
      const { name, description, type, data } = req.body;
      if (!name || !type) {
        res.status(400).json({ error: '缺少必填字段: name, type' });
        return;
      }
      const meta = templateManager.save(name, description || '', type, data);
      res.json(meta);
    } catch (err) {
      const msg = (err as Error).message;
      res.status(500).json({ error: msg });
    }
  });

  // Delete template
  app.delete('/api/templates/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      if (!templateManager.exists(id)) {
        res.status(404).json({ error: '模板不存在' });
        return;
      }
      templateManager.delete(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Export template (download JSON)
  app.get('/api/templates/:id/export', (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = templateManager.load(id);
      res.setHeader('Content-Disposition', `attachment; filename="${id}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(result);
    } catch (err) {
      const msg = (err as Error).message;
      const status = msg.includes('不存在') || msg.includes('丢失') ? 404 : 500;
      res.status(status).json({ error: msg });
    }
  });

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
