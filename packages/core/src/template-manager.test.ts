import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TemplateManager } from './template-manager.js';
import { fullConfigSchema } from './schemas/full-config-schema.js';

describe('TemplateManager', () => {
  let baseDir: string;
  let manager: TemplateManager;

  beforeEach(() => {
    baseDir = mkdtempSync(join(tmpdir(), 'sydev-test-'));
    manager = new TemplateManager(baseDir);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  // --- slugify ---

  describe('slugify', () => {
    it('保留中文字符', () => {
      expect(TemplateManager.slugify('ARM64 开发环境')).toBe('arm64-开发环境');
    });

    it('去除首尾空格并转小写', () => {
      expect(TemplateManager.slugify('  My Dev Env  ')).toBe('my-dev-env');
    });

    it('合并连续下划线和连字符', () => {
      expect(TemplateManager.slugify('test__name')).toBe('test-name');
    });
  });

  // --- save ---

  describe('save', () => {
    const workspaceContent = {
      cwd: '/tmp/ws',
      basePath: '/tmp/base',
      platform: ['ARM64_GENERIC'] as const,
    };

    it('保存 workspace 模板后创建索引和内容文件', () => {
      const meta = manager.save('测试环境', '测试用', 'workspace', workspaceContent);

      const indexPath = join(baseDir, 'templates', 'index.json');
      expect(existsSync(indexPath)).toBe(true);
      const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
      expect(index.templates).toHaveLength(1);
      expect(index.templates[0].id).toBe(meta.id);

      const contentPath = join(baseDir, 'templates', `${meta.id}.json`);
      expect(existsSync(contentPath)).toBe(true);
    });

    it('四种类型模板均通过 schema 验证', () => {
      const ws = manager.save('ws', '描述', 'workspace', workspaceContent);
      expect(ws.type).toBe('workspace');

      const proj = manager.save('proj', '描述', 'project', {
        name: 'my-app',
        template: 'app' as const,
        makeTool: 'make' as const,
      });
      expect(proj.type).toBe('project');

      const dev = manager.save('dev', '描述', 'device', {
        name: 'board',
        ip: '192.168.1.1',
        platform: ['ARM64_GENERIC'],
        username: 'root',
      });
      expect(dev.type).toBe('device');

      const full = manager.save('full', '描述', 'full', {
        workspace: workspaceContent,
        projects: [{ name: 'my-app', template: 'app' as const, makeTool: 'make' as const }],
        devices: [{ name: 'board', ip: '192.168.1.1', platform: ['ARM64_GENERIC'], username: 'root' }],
      });
      expect(full.type).toBe('full');
    });

    it('同名模板时 exists() 返回 true', () => {
      manager.save('my-env', '描述', 'workspace', workspaceContent);
      expect(manager.exists('my-env')).toBe(true);
    });
  });

  // --- list ---

  describe('list', () => {
    const workspaceContent = {
      cwd: '/tmp/ws',
      basePath: '/tmp/base',
      platform: ['ARM64_GENERIC'] as const,
    };

    it('返回所有模板，按 updatedAt 降序排列', async () => {
      manager.save('first', '第一个', 'workspace', workspaceContent);
      // Small delay to ensure different timestamps
      await new Promise(r => setTimeout(r, 10));
      manager.save('second', '第二个', 'project', {
        name: 'my-app',
        template: 'app' as const,
        makeTool: 'make' as const,
      });

      const all = manager.list();
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('second');
      expect(all[1].name).toBe('first');
    });

    it('按类型过滤只返回匹配的模板', () => {
      manager.save('ws1', '描述', 'workspace', workspaceContent);
      manager.save('proj1', '描述', 'project', {
        name: 'my-app',
        template: 'app' as const,
        makeTool: 'make' as const,
      });

      const wsOnly = manager.list('workspace');
      expect(wsOnly).toHaveLength(1);
      expect(wsOnly[0].type).toBe('workspace');
    });
  });

  // --- load ---

  describe('load', () => {
    const workspaceContent = {
      cwd: '/tmp/ws',
      basePath: '/tmp/base',
      platform: ['ARM64_GENERIC'] as const,
    };

    it('返回 { meta, content } 结构', () => {
      const saved = manager.save('load-test', '描述', 'workspace', workspaceContent);
      const loaded = manager.load(saved.id);

      expect(loaded.meta.id).toBe(saved.id);
      expect(loaded.meta.name).toBe('load-test');
      expect(loaded.content).toHaveProperty('type', 'workspace');
      expect(loaded.content).toHaveProperty('data');
    });

    it('加载不存在的 id 抛出错误', () => {
      expect(() => manager.load('nonexistent')).toThrow();
    });
  });

  // --- delete ---

  describe('delete', () => {
    const workspaceContent = {
      cwd: '/tmp/ws',
      basePath: '/tmp/base',
      platform: ['ARM64_GENERIC'] as const,
    };

    it('删除文件并从 index.json 移除条目', () => {
      const saved = manager.save('del-test', '描述', 'workspace', workspaceContent);
      const contentPath = join(baseDir, 'templates', `${saved.id}.json`);
      expect(existsSync(contentPath)).toBe(true);

      manager.delete(saved.id);

      expect(existsSync(contentPath)).toBe(false);
      expect(manager.list()).toHaveLength(0);
    });

    it('删除不存在的 id 抛出错误', () => {
      expect(() => manager.delete('nonexistent')).toThrow();
    });
  });

  // --- fullConfigSchema ---

  describe('fullConfigSchema', () => {
    it('验证包含 workspace + projects + devices 的完整配置', () => {
      const config = {
        workspace: {
          cwd: '/tmp/ws',
          basePath: '/tmp/base',
          platform: ['ARM64_GENERIC'],
        },
        projects: [{ name: 'my-app', template: 'app', makeTool: 'make' }],
        devices: [{ name: 'board', ip: '192.168.1.1', platform: ['ARM64_GENERIC'], username: 'root' }],
      };
      const result = fullConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('projects 和 devices 为 optional', () => {
      const config = {
        workspace: {
          cwd: '/tmp/ws',
          basePath: '/tmp/base',
          platform: ['ARM64_GENERIC'],
        },
      };
      const result = fullConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('包含 schemaVersion 字段默认值为 1', () => {
      const config = {
        workspace: {
          cwd: '/tmp/ws',
          basePath: '/tmp/base',
          platform: ['ARM64_GENERIC'],
        },
      };
      const result = fullConfigSchema.parse(config);
      expect(result.schemaVersion).toBe(1);
    });
  });
});
