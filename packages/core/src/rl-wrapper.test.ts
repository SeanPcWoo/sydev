import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeRlCommand, RlWrapper } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');

describe('executeRlCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute rl command successfully and return output', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('workspace', ['init']);

    mockProc.stdout.emit('data', 'Workspace initialized\n');
    mockProc.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Workspace initialized');
    expect(spawn).toHaveBeenCalledWith('rl', ['workspace', 'init']);
  });

  it('should handle command failure and parse error', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('workspace', ['init']);

    mockProc.stderr.emit('data', 'Error: permission denied\n');
    mockProc.emit('close', 1);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('权限不足');
    expect(result.fixSuggestion).toContain('sudo');
  });

  it('should emit progress events when progressReporter provided', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const progressReporter = new ProgressReporter();
    const outputSpy = vi.fn();
    progressReporter.on('output', outputSpy);

    const promise = executeRlCommand('workspace', ['init'], progressReporter);

    mockProc.stdout.emit('data', 'Progress output\n');
    mockProc.emit('close', 0);

    await promise;

    expect(outputSpy).toHaveBeenCalledWith('Progress output\n');
  });

  it('should handle spawn error (command not found)', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('workspace', ['init']);

    mockProc.emit('error', new Error('ENOENT'));

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('执行 rl 命令失败');
    expect(result.fixSuggestion).toContain('RealEvo-Stream');
  });

  it('should parse "not found" error correctly', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('workspace', ['init']);

    mockProc.stderr.emit('data', 'Error: path not found\n');
    mockProc.emit('close', 1);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('路径或文件不存在');
    expect(result.fixSuggestion).toContain('路径');
  });

  it('should parse version incompatibility error correctly', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('workspace', ['init']);

    mockProc.stderr.emit('data', 'Error: version mismatch\n');
    mockProc.emit('close', 1);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('版本不兼容');
    expect(result.fixSuggestion).toContain('升级');
  });
});

describe('RlWrapper', () => {
  let progressReporter: ProgressReporter;

  beforeEach(() => {
    vi.clearAllMocks();
    progressReporter = new ProgressReporter();
  });

  it('should call initWorkspace and emit progress events', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const stepSpy = vi.fn();
    progressReporter.on('step', stepSpy);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      baseVersion: '2.0.0',
      platform: 'arm',
      path: '/tmp/workspace'
    });

    mockProc.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(stepSpy).toHaveBeenCalledWith({ name: '初始化 Workspace', progress: 0 });
    expect(stepSpy).toHaveBeenCalledWith({ name: '初始化 Workspace', progress: 100 });
    expect(spawn).toHaveBeenCalledWith('rl', [
      'workspace',
      'init',
      '--base',
      '2.0.0',
      '--platform',
      'arm',
      '--path',
      '/tmp/workspace'
    ]);
  });

  it('should call createProject and emit progress events', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const stepSpy = vi.fn();
    progressReporter.on('step', stepSpy);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.createProject({
      name: 'test-project',
      type: 'app',
      path: '/tmp/project'
    });

    mockProc.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(stepSpy).toHaveBeenCalledWith({ name: '创建项目 test-project', progress: 0 });
    expect(stepSpy).toHaveBeenCalledWith({ name: '创建项目 test-project', progress: 100 });
    expect(spawn).toHaveBeenCalledWith('rl', [
      'project',
      'create',
      '--name',
      'test-project',
      '--type',
      'app',
      '--path',
      '/tmp/project'
    ]);
  });

  it('should handle errors in initWorkspace', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      baseVersion: '2.0.0',
      platform: 'arm',
      path: '/tmp/workspace'
    });

    mockProc.stderr.emit('data', 'Error: permission denied\n');
    mockProc.emit('close', 1);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('权限不足');
  });
});
