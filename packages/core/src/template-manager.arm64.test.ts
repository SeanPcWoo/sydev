import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TemplateManager } from './template-manager.js';

describe('TemplateManager ARM64 workspace templates', () => {
  let baseDir: string;
  let manager: TemplateManager;

  beforeEach(() => {
    baseDir = mkdtempSync(join(tmpdir(), 'sydev-template-arm64-'));
    manager = new TemplateManager(baseDir);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('should save and load workspace template with arm64PageShift and baseComponents', () => {
    const meta = manager.save('arm64-ws', 'workspace template', 'workspace', {
      cwd: '/tmp/ws',
      basePath: '/tmp/base',
      platform: ['ARM64_GENERIC'],
      version: 'default',
      debugLevel: 'release',
      os: 'sylixos',
      createbase: true,
      build: false,
      arm64PageShift: 16,
      baseComponents: ['libsylixos', 'libcextern', 'openssl'],
    });

    const loaded = manager.load(meta.id) as {
      content: {
        type: 'workspace';
        data: { arm64PageShift?: number; baseComponents?: string[] };
      };
    };

    expect(loaded.content.type).toBe('workspace');
    expect(loaded.content.data.arm64PageShift).toBe(16);
    expect(loaded.content.data.baseComponents).toEqual(['libsylixos', 'libcextern', 'openssl']);
  });

  it('should save full template with research workspace clone settings and baseComponents', () => {
    const meta = manager.save('research-full', 'full template', 'full', {
      workspace: {
        cwd: '/tmp/ws',
        basePath: '/tmp/base',
        platform: ['ARM64_GENERIC'],
        version: 'research',
        researchBranch: 'dev/rk3568',
        debugLevel: 'release',
        os: 'sylixos',
        createbase: true,
        build: false,
        arm64PageShift: 14,
        baseComponents: ['libsylixos', 'libcextern', 'openssl'],
      },
      projects: [],
      devices: [],
    });

    const loaded = manager.load(meta.id) as {
      content: {
        type: 'full';
        data: {
          workspace: { version: string; researchBranch?: string; arm64PageShift?: number; baseComponents?: string[] };
        };
      };
    };

    expect(loaded.content.type).toBe('full');
    expect(loaded.content.data.workspace.version).toBe('research');
    expect(loaded.content.data.workspace.researchBranch).toBe('dev/rk3568');
    expect(loaded.content.data.workspace.arm64PageShift).toBe(14);
    expect(loaded.content.data.workspace.baseComponents).toEqual(['libsylixos', 'libcextern', 'openssl']);
  });
});
