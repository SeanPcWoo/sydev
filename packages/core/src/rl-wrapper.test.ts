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

  it('should support commands without timeout', async () => {
    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    vi.mocked(spawn).mockReturnValue(mockProc);

    const promise = executeRlCommand('make', ['all'], undefined, '/tmp/base', null);

    mockProc.emit('close', 0);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
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

  it('should always bootstrap workspace with build=false and compile base afterwards when requested', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    mkdirSync(realevoDir, { recursive: true });
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');

    const bootstrapProc = new EventEmitter() as any;
    bootstrapProc.stdout = new EventEmitter();
    bootstrapProc.stderr = new EventEmitter();

    const buildProc = new EventEmitter() as any;
    buildProc.stdout = new EventEmitter();
    buildProc.stderr = new EventEmitter();

    vi.mocked(spawn)
      .mockReturnValueOnce(bootstrapProc)
      .mockReturnValueOnce(buildProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC'],
      version: 'default',
      createbase: true,
      build: true,
      debugLevel: 'release',
      os: 'sylixos',
    });

    bootstrapProc.emit('close', 0);
    setTimeout(() => buildProc.emit('close', 0), 0);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(spawn).toHaveBeenNthCalledWith(1, 'rl-workspace', [
      'init',
      `--base=${basePath}`,
      '--platform=ARM64_GENERIC',
      '--version=default',
      '--createbase=true',
      '--build=false',
      '--debug_level=release',
      '--os=sylixos'
    ], { cwd: workspaceRoot, env: process.env, shell: true });
    expect(spawn).toHaveBeenNthCalledWith(2, 'make', ['all'], {
      cwd: basePath,
      env: process.env,
      shell: true,
    });

    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should still compile base when workspace bootstrap fails and build is requested', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    mkdirSync(realevoDir, { recursive: true });
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');

    const bootstrapProc = new EventEmitter() as any;
    bootstrapProc.stdout = new EventEmitter();
    bootstrapProc.stderr = new EventEmitter();

    const buildProc = new EventEmitter() as any;
    buildProc.stdout = new EventEmitter();
    buildProc.stderr = new EventEmitter();

    vi.mocked(spawn)
      .mockReturnValueOnce(bootstrapProc)
      .mockReturnValueOnce(buildProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC'],
      version: 'default',
      createbase: true,
      build: true,
      debugLevel: 'release',
      os: 'sylixos',
    });

    bootstrapProc.stderr.emit('data', 'Error: permission denied\n');
    bootstrapProc.emit('close', 1);
    setTimeout(() => buildProc.emit('close', 0), 0);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('权限不足');
    expect(result.error).toContain('已继续执行 base 编译并成功');
    expect(spawn).toHaveBeenNthCalledWith(2, 'make', ['all'], {
      cwd: basePath,
      env: process.env,
      shell: true,
    });

    rmSync(workspaceRoot, { recursive: true, force: true });
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

  it('should sync workspace.json and update ARM64 page shift macro when provided', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const cpuConfigPath = join(basePath, 'libsylixos', 'SylixOS', 'config', 'cpu', 'cpu_cfg_arm64.h');
    const baseMakefilePath = join(basePath, 'Makefile');
    const workspaceJsonPath = join(realevoDir, 'workspace.json');

    mkdirSync(join(basePath, 'libsylixos', 'SylixOS', 'config', 'cpu'), { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({
      base: basePath,
      platforms: ['ARM64_GENERIC'],
    }), 'utf-8');
    writeFileSync(baseMakefilePath, [
      'COMPONENTS :=  \\',
      'libsylixos \\',
      'libcextern \\',
      'openssl',
      '',
    ].join('\n'), 'utf-8');
    writeFileSync(cpuConfigPath, [
      '#ifndef CPU_CFG_ARM64_H',
      '#define CPU_CFG_ARM64_H',
      '#define LW_CFG_ARM64_PAGE_SHIFT 12',
      '#endif',
      '',
    ].join('\n'), 'utf-8');

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC'],
      version: 'default',
      createbase: true,
      build: false,
      debugLevel: 'release',
      os: 'sylixos',
      arm64PageShift: 16,
      baseComponents: ['libsylixos', 'libcextern', 'openssl'],
    });

    mockProc.emit('close', 0);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(readFileSync(cpuConfigPath, 'utf-8')).toContain('#define LW_CFG_ARM64_PAGE_SHIFT 16');
    expect(readFileSync(baseMakefilePath, 'utf-8')).toContain([
      'COMPONENTS :=  \\',
      'libsylixos \\',
      'libcextern \\',
      'openssl',
    ].join('\n'));
    expect(JSON.parse(readFileSync(workspaceJsonPath, 'utf-8'))).toMatchObject({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC'],
      version: 'default',
      createbase: true,
      build: false,
      debugLevel: 'release',
      os: 'sylixos',
      arm64PageShift: 16,
      baseComponents: ['libsylixos', 'libcextern', 'openssl'],
    });

    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should patch base COMPONENTS before running make all', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const baseMakefilePath = join(basePath, 'Makefile');

    mkdirSync(realevoDir, { recursive: true });
    mkdirSync(basePath, { recursive: true });
    writeFileSync(baseMakefilePath, [
      'COMPONENTS :=  \\',
      'libsylixos \\',
      'libcextern \\',
      'openssl \\',
      'tcpdump',
      '',
      '.PHONY: all',
      'all:',
      '\t@echo base',
      '',
    ].join('\n'), 'utf-8');

    const bootstrapProc = new EventEmitter() as any;
    bootstrapProc.stdout = new EventEmitter();
    bootstrapProc.stderr = new EventEmitter();

    const buildProc = new EventEmitter() as any;
    buildProc.stdout = new EventEmitter();
    buildProc.stderr = new EventEmitter();

    vi.mocked(spawn)
      .mockReturnValueOnce(bootstrapProc)
      .mockImplementationOnce((command, args, options) => {
        expect(command).toBe('make');
        expect(args).toEqual(['all']);
        expect(options).toEqual({
          cwd: basePath,
          env: process.env,
          shell: true,
        });
        expect(readFileSync(baseMakefilePath, 'utf-8')).toContain([
          'COMPONENTS :=  \\',
          'libsylixos \\',
          'libcextern \\',
          'openssl',
          '# tcpdump',
        ].join('\n'));
        return buildProc;
      });

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC'],
      version: 'default',
      createbase: true,
      build: true,
      debugLevel: 'release',
      os: 'sylixos',
      baseComponents: ['libsylixos', 'libcextern', 'openssl'],
    });

    bootstrapProc.emit('close', 0);
    setTimeout(() => buildProc.emit('close', 0), 0);
    const result = await promise;

    expect(result.success).toBe(true);

    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should reject base COMPONENTS patch when required components are missing', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const baseMakefilePath = join(basePath, 'Makefile');

    mkdirSync(realevoDir, { recursive: true });
    mkdirSync(basePath, { recursive: true });
    writeFileSync(baseMakefilePath, [
      'COMPONENTS :=  \\',
      'libsylixos \\',
      'libcextern \\',
      'openssl',
      '',
    ].join('\n'), 'utf-8');

    const mockProc = new EventEmitter() as any;
    mockProc.stdout = new EventEmitter();
    mockProc.stderr = new EventEmitter();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC'],
      version: 'default',
      createbase: true,
      build: false,
      debugLevel: 'release',
      os: 'sylixos',
      baseComponents: ['openssl'],
    });

    mockProc.emit('close', 0);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Base 组件必须包含: libsylixos');

    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('should replace libsylixos first and then update ARM64 page shift for research workspace', async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-rl-wrapper-'));
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const libsylixosPath = join(basePath, 'libsylixos');
    const cpuConfigPath = join(libsylixosPath, 'SylixOS', 'config', 'cpu', 'cpu_cfg_arm64.h');

    mkdirSync(realevoDir, { recursive: true });
    mkdirSync(join(libsylixosPath, 'SylixOS', 'config', 'cpu'), { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({
      base: basePath,
      platforms: ['ARM64_GENERIC'],
    }), 'utf-8');
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');
    writeFileSync(cpuConfigPath, '#define LW_CFG_ARM64_PAGE_SHIFT 12\n', 'utf-8');

    const bootstrapProc = new EventEmitter() as any;
    bootstrapProc.stdout = new EventEmitter();
    bootstrapProc.stderr = new EventEmitter();

    const cloneProc = new EventEmitter() as any;
    cloneProc.stdout = new EventEmitter();
    cloneProc.stderr = new EventEmitter();

    const buildProc = new EventEmitter() as any;
    buildProc.stdout = new EventEmitter();
    buildProc.stderr = new EventEmitter();

    vi.mocked(spawn)
      .mockReturnValueOnce(bootstrapProc)
      .mockReturnValueOnce(cloneProc)
      .mockReturnValueOnce(buildProc);

    const wrapper = new RlWrapper(progressReporter);
    const promise = wrapper.initWorkspace({
      cwd: workspaceRoot,
      basePath,
      platform: ['ARM64_GENERIC'],
      version: 'research',
      createbase: false,
      build: true,
      debugLevel: 'release',
      os: 'sylixos',
      researchBranch: 'dev/rk3568',
      arm64PageShift: 14,
    });

    bootstrapProc.stderr.emit('data', 'copy failed in clone mode\n');
    bootstrapProc.emit('close', 1);
    setTimeout(() => {
      mkdirSync(join(libsylixosPath, 'SylixOS', 'config', 'cpu'), { recursive: true });
      writeFileSync(cpuConfigPath, '#define LW_CFG_ARM64_PAGE_SHIFT 12\n', 'utf-8');
      cloneProc.emit('close', 0);
      setTimeout(() => buildProc.emit('close', 0), 0);
    }, 0);

    const result = await promise;

    expect(result.success).toBe(true);
    expect(readFileSync(cpuConfigPath, 'utf-8')).toContain('#define LW_CFG_ARM64_PAGE_SHIFT 14');
    expect(spawn).toHaveBeenNthCalledWith(1, 'rl-workspace', [
      'init',
      `--base=${basePath}`,
      '--platform=ARM64_GENERIC',
      '--version=lts_3.6.5',
      '--createbase=true',
      '--build=false',
      '--debug_level=release',
      '--os=sylixos'
    ], { cwd: workspaceRoot, env: process.env, shell: true });
    expect(spawn).toHaveBeenNthCalledWith(2, 'git', [
      'clone',
      '-b',
      'dev/rk3568',
      'ssh://git@10.7.100.21:16783/sylixos/research/libsylixos.git',
      'libsylixos'
    ], { cwd: basePath, env: process.env, shell: true });
    expect(spawn).toHaveBeenNthCalledWith(3, 'make', ['all'], {
      cwd: basePath,
      env: process.env,
      shell: true,
    });

    rmSync(workspaceRoot, { recursive: true, force: true });
  });
});
