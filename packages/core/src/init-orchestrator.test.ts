import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitOrchestrator, type InitResult } from './init-orchestrator.js';
import { RlWrapper, type RlCommandResult } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';
import { ConfigManager } from './config-manager.js';

// Mock RlWrapper — don't actually spawn processes
vi.mock('./rl-wrapper.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./rl-wrapper.js')>();
  return {
    ...orig,
    RlWrapper: vi.fn(),
  };
});

function createMockRlWrapper(overrides: Partial<Record<'initWorkspace' | 'createProject' | 'addDevice', (...args: any[]) => Promise<RlCommandResult>>> = {}) {
  return {
    initWorkspace: overrides.initWorkspace ?? vi.fn().mockResolvedValue({ success: true, stdout: 'ok' }),
    createProject: overrides.createProject ?? vi.fn().mockResolvedValue({ success: true, stdout: 'ok' }),
    addDevice: overrides.addDevice ?? vi.fn().mockResolvedValue({ success: true, stdout: 'ok' }),
  } as unknown as RlWrapper;
}

const validWorkspace = {
  cwd: '/tmp/ws',
  basePath: '/tmp/base',
  platform: ['ARM64_GENERIC'] as const,
};

const validProject1 = { name: 'proj1', template: 'app' as const, makeTool: 'make' as const };
const validProject2 = { name: 'proj2', template: 'lib' as const, makeTool: 'make' as const };
const validDevice = { name: 'board', ip: '192.168.1.100', platform: ['ARM64_GENERIC'], username: 'root' };

describe('InitOrchestrator', () => {
  let reporter: ProgressReporter;

  beforeEach(() => {
    vi.clearAllMocks();
    reporter = new ProgressReporter();
    // EventEmitter throws on unhandled 'error' events — register a no-op listener
    reporter.on('error', () => {});
  });

  it('workspace-only 配置成功执行，返回 completedSteps: ["workspace"]', async () => {
    const rl = createMockRlWrapper();
    const orchestrator = new InitOrchestrator(rl, reporter);

    const result = await orchestrator.execute({ workspace: validWorkspace });

    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual(['workspace']);
    expect(rl.initWorkspace).toHaveBeenCalledOnce();
    expect(rl.createProject).not.toHaveBeenCalled();
    expect(rl.addDevice).not.toHaveBeenCalled();
  });

  it('完整配置（workspace + 2 projects + 1 device）按顺序执行并返回所有 completedSteps', async () => {
    const rl = createMockRlWrapper();
    const orchestrator = new InitOrchestrator(rl, reporter);

    const result = await orchestrator.execute({
      workspace: validWorkspace,
      projects: [validProject1, validProject2],
      devices: [validDevice],
    });

    expect(result.success).toBe(true);
    expect(result.completedSteps).toEqual([
      'workspace',
      'project:proj1',
      'project:proj2',
      'device:board',
    ]);
    expect(rl.initWorkspace).toHaveBeenCalledOnce();
    expect(rl.createProject).toHaveBeenCalledTimes(2);
    expect(rl.addDevice).toHaveBeenCalledOnce();
  });

  it('workspace 初始化失败时立即返回 fail-fast', async () => {
    const rl = createMockRlWrapper({
      initWorkspace: vi.fn().mockResolvedValue({ success: false, error: 'workspace 创建失败' }),
    });
    const orchestrator = new InitOrchestrator(rl, reporter);

    const result = await orchestrator.execute({
      workspace: validWorkspace,
      projects: [validProject1],
    });

    expect(result.success).toBe(false);
    expect(result.completedSteps).toEqual([]);
    expect(result.failedStep).toBe('workspace');
    expect(result.error).toContain('workspace');
    expect(rl.createProject).not.toHaveBeenCalled();
  });

  it('第 2 个 project 失败时返回已完成步骤和失败信息', async () => {
    const createProject = vi.fn()
      .mockResolvedValueOnce({ success: true, stdout: 'ok' })
      .mockResolvedValueOnce({ success: false, error: 'proj2 创建失败' });
    const rl = createMockRlWrapper({ createProject });
    const orchestrator = new InitOrchestrator(rl, reporter);

    const result = await orchestrator.execute({
      workspace: validWorkspace,
      projects: [validProject1, validProject2],
      devices: [validDevice],
    });

    expect(result.success).toBe(false);
    expect(result.completedSteps).toEqual(['workspace', 'project:proj1']);
    expect(result.failedStep).toBe('project:proj2');
    expect(result.error).toContain('proj2');
    expect(rl.addDevice).not.toHaveBeenCalled();
  });

  it('device 失败时 completedSteps 包含 workspace 和所有已完成的 projects', async () => {
    const rl = createMockRlWrapper({
      addDevice: vi.fn().mockResolvedValue({ success: false, error: '设备添加失败' }),
    });
    const orchestrator = new InitOrchestrator(rl, reporter);

    const result = await orchestrator.execute({
      workspace: validWorkspace,
      projects: [validProject1],
      devices: [validDevice],
    });

    expect(result.success).toBe(false);
    expect(result.completedSteps).toEqual(['workspace', 'project:proj1']);
    expect(result.failedStep).toBe('device:board');
    expect(result.error).toContain('设备');
  });

  it('无效配置（schema 验证失败）直接返回错误，不调用 RlWrapper', async () => {
    const rl = createMockRlWrapper();
    const orchestrator = new InitOrchestrator(rl, reporter);

    // Missing required workspace field
    const result = await orchestrator.execute({ workspace: { cwd: '' } });

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('validation');
    expect(result.completedSteps).toEqual([]);
    expect(rl.initWorkspace).not.toHaveBeenCalled();
  });

  it('execute() 过程中通过 ProgressReporter 发出 step 事件', async () => {
    const rl = createMockRlWrapper();
    const orchestrator = new InitOrchestrator(rl, reporter);
    const stepSpy = vi.fn();
    reporter.on('step', stepSpy);

    await orchestrator.execute({
      workspace: validWorkspace,
      projects: [validProject1],
    });

    // At minimum: workspace step + project step
    expect(stepSpy).toHaveBeenCalled();
    const stepNames = stepSpy.mock.calls.map((c: any[]) => c[0].name);
    expect(stepNames).toContain('workspace');
    expect(stepNames).toContain('project:proj1');
  });

  it('projects 和 devices 为空数组或 undefined 时正常执行（只执行 workspace）', async () => {
    const rl = createMockRlWrapper();
    const orchestrator = new InitOrchestrator(rl, reporter);

    // undefined case
    const r1 = await orchestrator.execute({ workspace: validWorkspace });
    expect(r1.success).toBe(true);
    expect(r1.completedSteps).toEqual(['workspace']);

    // empty arrays case
    const r2 = await orchestrator.execute({
      workspace: validWorkspace,
      projects: [],
      devices: [],
    });
    expect(r2.success).toBe(true);
    expect(r2.completedSteps).toEqual(['workspace']);
  });
});
