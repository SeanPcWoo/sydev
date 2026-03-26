import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WorkspaceOptionParser } from './workspace-parser.js';

describe('WorkspaceOptionParser', () => {
  it('should parse arm64PageShift from CLI options', () => {
    const parser = new WorkspaceOptionParser();

    const result = parser.parse({
      cwd: '/tmp/ws',
      basePath: '/tmp/ws/.realevo/base',
      version: 'default',
      platforms: 'ARM64_GENERIC,X86_64',
      os: 'sylixos',
      debugLevel: 'release',
      arm64PageShift: '14',
      createBase: true,
      build: false,
    });

    expect(result.config.arm64PageShift).toBe(14);
    expect(result.config.platforms).toEqual(['ARM64_GENERIC', 'X86_64']);
  });

  it('should parse baseComponents from CLI options', () => {
    const parser = new WorkspaceOptionParser();

    const result = parser.parse({
      cwd: '/tmp/ws',
      basePath: '/tmp/ws/.realevo/base',
      version: 'default',
      platforms: 'ARM64_GENERIC',
      os: 'sylixos',
      debugLevel: 'release',
      baseComponents: 'libsylixos, libcextern, openssl tcpdump',
      createBase: true,
      build: false,
    });

    expect(result.config.baseComponents).toEqual(['libsylixos', 'libcextern', 'openssl', 'tcpdump']);
  });

  it('should support config file plus CLI override for arm64PageShift', () => {
    const parser = new WorkspaceOptionParser();
    const tempDir = mkdtempSync(join(tmpdir(), 'sydev-workspace-parser-'));
    const configPath = join(tempDir, 'workspace.json');

    writeFileSync(configPath, JSON.stringify({
      cwd: '/tmp/ws',
      basePath: '/tmp/ws/.realevo/base',
      version: 'default',
      platforms: ['ARM64_GENERIC'],
      os: 'sylixos',
      debugLevel: 'release',
      createBase: true,
      build: false,
      arm64PageShift: 12,
    }), 'utf-8');

    const result = parser.parse({
      config: configPath,
      arm64PageShift: '16',
    });

    expect(result.config.arm64PageShift).toBe(16);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load baseComponents from config file in non-interactive mode', () => {
    const parser = new WorkspaceOptionParser();
    const tempDir = mkdtempSync(join(tmpdir(), 'sydev-workspace-parser-'));
    const configPath = join(tempDir, 'workspace.json');

    writeFileSync(configPath, JSON.stringify({
      cwd: '/tmp/ws',
      basePath: '/tmp/ws/.realevo/base',
      version: 'default',
      platforms: ['ARM64_GENERIC'],
      os: 'sylixos',
      debugLevel: 'release',
      createBase: true,
      build: false,
      baseComponents: ['libsylixos', 'libcextern', 'openssl'],
    }), 'utf-8');

    const result = parser.parse({
      config: configPath,
    });

    expect(result.config.baseComponents).toEqual(['libsylixos', 'libcextern', 'openssl']);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should reject arm64PageShift when ARM64 platform is not selected', () => {
    const parser = new WorkspaceOptionParser();

    expect(() => parser.parse({
      cwd: '/tmp/ws',
      basePath: '/tmp/ws/.realevo/base',
      version: 'default',
      platforms: 'X86_64',
      os: 'sylixos',
      debugLevel: 'release',
      arm64PageShift: '14',
      createBase: true,
      build: false,
    })).toThrow('arm64PageShift requires at least one ARM64 platform');
  });

  it('should reject unsupported baseComponents names', () => {
    const parser = new WorkspaceOptionParser();

    expect(() => parser.parse({
      cwd: '/tmp/ws',
      basePath: '/tmp/ws/.realevo/base',
      version: 'default',
      platforms: 'ARM64_GENERIC',
      os: 'sylixos',
      debugLevel: 'release',
      baseComponents: 'libsylixos, bad$name',
      createBase: true,
      build: false,
    })).toThrow('baseComponents contains unsupported components: bad$name');
  });

  it('should reject baseComponents when required components are missing', () => {
    const parser = new WorkspaceOptionParser();

    expect(() => parser.parse({
      cwd: '/tmp/ws',
      basePath: '/tmp/ws/.realevo/base',
      version: 'default',
      platforms: 'ARM64_GENERIC',
      os: 'sylixos',
      debugLevel: 'release',
      baseComponents: 'openssl',
      createBase: true,
      build: false,
    })).toThrow('baseComponents must include required components: libsylixos');
  });
});
