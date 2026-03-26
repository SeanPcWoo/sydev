import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildScopedTemplateApplyRequest, isSydevWorkspace } from './template.js';

describe('template apply scoped templates', () => {
  let workspaceRoot: string;
  let plainDir: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-template-ws-'));
    mkdirSync(join(workspaceRoot, '.realevo'), { recursive: true });
    plainDir = mkdtempSync(join(tmpdir(), 'sydev-template-dir-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
    rmSync(plainDir, { recursive: true, force: true });
  });

  it('项目模板在已有 workspace 中生成 project apply 请求', () => {
    const result = buildScopedTemplateApplyRequest({
      type: 'project',
      data: {
        name: 'demo-app',
        template: 'app',
        type: 'cmake',
        makeTool: 'make',
      },
    }, workspaceRoot);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      return;
    }

    expect(result.request.kind).toBe('project');
    expect(result.request.cwd).toBe(workspaceRoot);
    expect(result.request.stepName).toBe('project:demo-app');
    expect(result.request.config).toMatchObject({
      name: 'demo-app',
      template: 'app',
      type: 'cmake',
      makeTool: 'make',
    });
  });

  it('设备模板在已有 workspace 中生成 device apply 请求并补齐默认端口', () => {
    const result = buildScopedTemplateApplyRequest({
      type: 'device',
      data: {
        name: 'board1',
        ip: '192.168.1.10',
        platform: ['ARM64_GENERIC'],
        username: 'root',
      },
    }, workspaceRoot);

    expect(result.valid).toBe(true);
    if (!result.valid) {
      return;
    }

    expect(result.request.kind).toBe('device');
    expect(result.request.cwd).toBe(workspaceRoot);
    expect(result.request.stepName).toBe('device:board1');
    expect(result.request.config).toMatchObject({
      name: 'board1',
      ip: '192.168.1.10',
      platform: ['ARM64_GENERIC'],
      username: 'root',
      ssh: 22,
      telnet: 23,
      ftp: 21,
      gdb: 1234,
    });
  });

  it('没有 .realevo 时拒绝应用项目模板', () => {
    const result = buildScopedTemplateApplyRequest({
      type: 'project',
      data: {
        name: 'demo-app',
        template: 'app',
        type: 'cmake',
        makeTool: 'make',
      },
    }, plainDir);

    expect(result.valid).toBe(false);
    if (result.valid) {
      return;
    }

    expect(result.error).toContain('已有 workspace');
    expect(result.errors).toContain(`未检测到 workspace 标记目录: ${join(plainDir, '.realevo')}`);
    expect(isSydevWorkspace(plainDir)).toBe(false);
  });
});
