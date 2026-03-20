import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeRlCommand, RlWrapper } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.mock('child_process');

describe('executeRlCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute command directly and return output', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('rl-workspace', ['init']);

    mockProc.stdout.emit('data', 'Workspace initialized\n');
    mockProc.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Workspace initialized');
    expect(spawn).toHaveBeenCalledWith('rl-workspace', ['init'], { cwd: undefined, env: process.env, shell: true });
  });

  it('should handle command failure and parse error', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('rl-workspace', ['init']);

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

    const promise = executeRlCommand('rl-workspace', ['init'], progressReporter);

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

    const promise = executeRlCommand('rl-workspace', ['init']);

    mockProc.emit('error', new Error('ENOENT'));

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('执行 rl-workspace 命令失败');
    expect(result.fixSuggestion).toContain('RealEvo-Stream');
  });

  it('should parse "not found" error correctly', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('rl-project', ['create']);

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

    const promise = executeRlCommand('rl-build', ['--all']);

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
    progressReporter.on('error', () => {});
  });

  it('should call initWorkspace with correct rl-workspace command and = args', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const stepSpy = vi.fn();
    progressReporter.on('step', stepSpy);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: '/tmp/workspace',
      basePath: './base',
      platform: 'ARM64_GENERIC',
      version: 'default'
    });

    mockProc.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(stepSpy).toHaveBeenCalledWith({ name: '初始化 Workspace', progress: 0 });
    expect(stepSpy).toHaveBeenCalledWith({ name: '初始化 Workspace', progress: 100 });
    expect(spawn).toHaveBeenCalledWith('rl-workspace', [
      'init',
      '--base=./base',
      '--platform=ARM64_GENERIC',
      '--version=default'
    ], { cwd: '/tmp/workspace', env: process.env, shell: true });
  });

  it('should pass optional workspace params when provided', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: '/tmp/workspace',
      basePath: './base',
      platform: 'X86_64',
      version: 'lts_3.6.5',
      createbase: true,
      build: false,
      debugLevel: 'debug',
      os: 'sylixos'
    });

    mockProc.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith('rl-workspace', [
      'init',
      '--base=./base',
      '--platform=X86_64',
      '--version=lts_3.6.5',
      '--createbase=true',
      '--build=false',
      '--debug_level=debug',
      '--os=sylixos'
    ], { cwd: '/tmp/workspace', env: process.env, shell: true });
  });

  it('should call createProject with correct rl-project command', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const stepSpy = vi.fn();
    progressReporter.on('step', stepSpy);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.createProject({
      name: 'test-project',
      template: 'app',
      type: 'cmake'
    });

    mockProc.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(stepSpy).toHaveBeenCalledWith({ name: '创建项目 test-project', progress: 0 });
    expect(stepSpy).toHaveBeenCalledWith({ name: '创建项目 test-project', progress: 100 });
    expect(spawn).toHaveBeenCalledWith('rl-project', [
      'create',
      '--name=test-project',
      '--template=app',
      '--type=cmake'
    ], { cwd: undefined, env: process.env, shell: true });
  });

  it('should call addDevice with correct rl-device command', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const stepSpy = vi.fn();
    progressReporter.on('step', stepSpy);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.addDevice({
      name: 'my-device',
      ip: '192.168.1.100',
      platform: 'ARM64_GENERIC',
      ssh: 22,
      username: 'root',
      password: 'root'
    });

    mockProc.emit('close', 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(stepSpy).toHaveBeenCalledWith({ name: '添加设备 my-device', progress: 0 });
    expect(stepSpy).toHaveBeenCalledWith({ name: '添加设备 my-device', progress: 100 });
    expect(spawn).toHaveBeenCalledWith('rl-device', [
      'add',
      '--name=my-device',
      '--ip=192.168.1.100',
      '--platform=ARM64_GENERIC',
      '--ssh=22',
      '--user=root',
      '--password=root'
    ], { cwd: undefined, env: process.env, shell: true });
  });

  it('should handle errors in initWorkspace', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    vi.mocked(spawn).mockReturnValue(mockProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: '/tmp/workspace',
      basePath: './base',
      platform: 'ARM64_GENERIC',
      version: 'default'
    });

    mockProc.stderr.emit('data', 'Error: permission denied\n');
    mockProc.emit('close', 1);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('权限不足');
  });

  it('should sync base config.mk PLATFORMS from .realevo/config.json after initWorkspace', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const configMkPath = join(basePath, 'config.mk');

    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({
      base: basePath,
      platforms: ['ARM64_GENERIC', 'X86_64'],
    }), 'utf-8');
    writeFileSync(configMkPath, 'PLATFORMS := ARM64_A53\nDEBUG_LEVEL := release\n', 'utf-8');

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC', 'X86_64'],
      version: 'default',
    });

    mockProc.emit('close', 0);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(readFileSync(configMkPath, 'utf-8')).toBe(
      'PLATFORMS := ARM64_GENERIC X86_64\nDEBUG_LEVEL := release\n'
    );

    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should append PLATFORMS to base config.mk when it is missing', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const configMkPath = join(basePath, 'config.mk');

    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({
      base: basePath,
      platforms: ['ARM64_GENERIC', 'X86_64'],
    }), 'utf-8');
    writeFileSync(configMkPath, 'DEBUG_LEVEL := release\n', 'utf-8');

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC', 'X86_64'],
      version: 'default',
    });

    mockProc.emit('close', 0);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(readFileSync(configMkPath, 'utf-8')).toBe(
      'DEBUG_LEVEL := release\nPLATFORMS := ARM64_GENERIC X86_64\n'
    );

    rmSync(workspaceRoot, { recursive: true, force: true });
  });
});
