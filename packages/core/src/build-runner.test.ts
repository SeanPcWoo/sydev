import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { BuildRunner, extractBuildErrorLines } from './build-runner.js';

vi.mock('child_process');

function createMockProcess() {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();
  return proc;
}

describe('extractBuildErrorLines', () => {
  const makefilePath = '/tmp/ws/.sydev/Makefile';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('优先返回真实工程错误而不是 .sydev/Makefile 包装层错误', () => {
    const output = [
      'src/app.c:9:3: error: boom',
      'make[1]: *** [Makefile:88: app.o] Error 1',
      `make: *** [${makefilePath}:14: demo] Error 2`,
    ].join('\n');

    expect(extractBuildErrorLines(output, makefilePath)).toEqual([
      'src/app.c:9:3: error: boom',
      'make[1]: *** [Makefile:88: app.o] Error 1',
    ]);
  });

  it('只有包装层报错时回退显示包装层错误', () => {
    const output = `make: *** [${makefilePath}:14: demo] Error 2`;

    expect(extractBuildErrorLines(output, makefilePath)).toEqual([
      `make: *** [${makefilePath}:14: demo] Error 2`,
    ]);
  });
});

describe('BuildRunner', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    vi.clearAllMocks();
    workspaceRoot = mkdtempSync(join(tmpdir(), 'sydev-build-runner-'));
    mkdirSync(join(workspaceRoot, 'demo'), { recursive: true });
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('实时透传 stderr，并把真实工程错误放在失败摘要首位', async () => {
    const mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const progressSpy = vi.fn();
    runner.on('progress', progressSpy);

    const promise = runner.buildOne(project);
    const wrapperLine = `make: *** [${join(workspaceRoot, '.sydev', 'Makefile')}:14: demo] Error 2`;

    mockProc.stderr.emit('data', `src/app.c:9:3: error: boom\n${wrapperLine}\n`);
    mockProc.emit('close', 2);

    const result = await promise;

    expect(progressSpy).toHaveBeenCalledWith({
      type: 'stderr-line',
      name: 'demo',
      line: 'src/app.c:9:3: error: boom',
    });
    expect(result.success).toBe(false);
    expect(result.errorLines?.[0]).toBe('src/app.c:9:3: error: boom');
    expect(result.errorLines).not.toContain(wrapperLine);
    expect(spawn).toHaveBeenCalledWith(
      'make',
      ['-f', join(workspaceRoot, '.sydev', 'Makefile'), 'demo'],
      { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] }
    );
  });

  it('生成的 Makefile 对普通工程使用 rl-build，对 base 直接进入目录执行 make，并且不再改写 config.mk', () => {
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const demoConfigMk = join(workspaceRoot, 'demo', 'config.mk');
    mkdirSync(realevoDir, { recursive: true });
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');
    writeFileSync(demoConfigMk, 'SYLIXOS_BASE_PATH = /tmp/keep-me\nPLATFORM_NAME = OLD\n', 'utf-8');

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const makefile = readFileSync(join(workspaceRoot, '.sydev', 'Makefile'), 'utf-8');
    expect(makefile).toContain(`cd ${basePath} && bear --append -- $(MAKE) all $(BASE_BUILD_ARGS)`);
    expect(makefile).toContain(`cd ${basePath} && $(MAKE) clean $(BASE_CLEAN_ARGS)`);
    expect(makefile).toContain('bear --append -- rl-build build --project=demo $(RL_BUILD_ARGS)');
    expect(makefile).toContain('rl-build clean --project=demo $(RL_CLEAN_ARGS)');
    expect(readFileSync(demoConfigMk, 'utf-8')).toBe('SYLIXOS_BASE_PATH = /tmp/keep-me\nPLATFORM_NAME = OLD\n');
  });

  it('增量更新时会把旧版默认 base block 升级为直接执行 make 的规则', () => {
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    mkdirSync(join(workspaceRoot, '.sydev'), { recursive: true });
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');
    writeFileSync(join(workspaceRoot, '.sydev', 'Makefile'), [
      '# SylixOS Workspace Makefile',
      '# 由 sydev 自动生成/更新',
      '# __ 开头的 target 为用户编译模板，sydev 不会修改',
      '',
      `export WORKSPACE_base = ${basePath}`,
      `export WORKSPACE_demo = ${project.path}`,
      '',
      `export SYLIXOS_BASE_PATH = ${basePath}`,
      '',
      '# ─── 工程 Targets ───────────────────────────────────────────────',
      '',
      '.PHONY: base clean-base rebuild-base demo clean-demo rebuild-demo cp-demo',
      '',
      '#*******************************************************************************',
      '# base',
      '#*******************************************************************************',
      'base:',
      '\tbear --append -- rl-build build --project=base $(RL_BUILD_ARGS)',
      '',
      'clean-base:',
      '\trl-build clean --project=base $(RL_CLEAN_ARGS)',
      '',
      'rebuild-base: clean-base base',
      '',
    ].join('\n'), 'utf-8');

    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const makefile = readFileSync(join(workspaceRoot, '.sydev', 'Makefile'), 'utf-8');
    expect(makefile).toContain(`cd ${basePath} && bear --append -- $(MAKE) all $(BASE_BUILD_ARGS)`);
    expect(makefile).toContain(`cd ${basePath} && $(MAKE) clean $(BASE_CLEAN_ARGS)`);
    expect(makefile).not.toContain('rl-build build --project=base $(RL_BUILD_ARGS)');
    expect(makefile).not.toContain('rl-build clean --project=base $(RL_CLEAN_ARGS)');
  });

  it('增量更新时保留已有工程 block，并为缺失工程追加默认 target', () => {
    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const extraProject = { name: 'extra', path: join(workspaceRoot, 'extra') };
    mkdirSync(extraProject.path, { recursive: true });
    const runner = new BuildRunner([project, extraProject], workspaceRoot);
    mkdirSync(join(workspaceRoot, '.sydev'), { recursive: true });
    writeFileSync(join(workspaceRoot, '.sydev', 'Makefile'), [
      '# SylixOS Workspace Makefile',
      '# 由 sydev 自动生成/更新',
      '# __ 开头的 target 为用户编译模板，sydev 不会修改',
      '',
      `export WORKSPACE_demo = ${project.path}`,
      '',
      '# ─── 工程 Targets ───────────────────────────────────────────────',
      '',
      '.PHONY: demo clean-demo rebuild-demo cp-demo',
      '',
      '#*******************************************************************************',
      '# demo',
      '#*******************************************************************************',
      'demo:',
      `\tbear --append -- make -C ${project.path} all`,
      '',
      'clean-demo:',
      `\tmake -C ${project.path} clean`,
      '',
      'rebuild-demo: clean-demo demo',
      '',
      'cp-demo:',
      '\tcp /tmp/custom.so /tmp/destination',
      '',
      '# ─── 编译模板（__ 开头，可自行修改） ─────────────────────────────',
      'SELF := $(firstword $(MAKEFILE_LIST))',
      '',
      '__demo:',
      '\t$(MAKE) -f $(SELF) demo',
      '',
    ].join('\n'), 'utf-8');

    runner.ensureMakefile();

    const makefile = readFileSync(join(workspaceRoot, '.sydev', 'Makefile'), 'utf-8');
    expect(makefile).toContain(`\tbear --append -- make -C ${project.path} all`);
    expect(makefile).toContain(`\tmake -C ${project.path} clean`);
    expect(makefile).toContain('\tcp /tmp/custom.so /tmp/destination');
    expect(makefile).not.toContain('rl-build build --project=demo $(RL_BUILD_ARGS)');
    expect(makefile).not.toContain('rl-build clean --project=demo $(RL_CLEAN_ARGS)');
    expect(makefile).toContain('bear --append -- rl-build build --project=extra $(RL_BUILD_ARGS)');
    expect(makefile).toContain('rl-build clean --project=extra $(RL_CLEAN_ARGS)');
    expect(makefile).toContain('__demo:');
  });

  it('使用 --default 时会重建已有工程 block', () => {
    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    mkdirSync(join(workspaceRoot, '.sydev'), { recursive: true });
    writeFileSync(join(workspaceRoot, '.sydev', 'Makefile'), [
      '# SylixOS Workspace Makefile',
      '# 由 sydev 自动生成/更新',
      '# __ 开头的 target 为用户编译模板，sydev 不会修改',
      '',
      `export WORKSPACE_demo = ${project.path}`,
      '',
      '# ─── 工程 Targets ───────────────────────────────────────────────',
      '',
      '.PHONY: demo clean-demo rebuild-demo cp-demo',
      '',
      '#*******************************************************************************',
      '# demo',
      '#*******************************************************************************',
      'demo:',
      `\tbear --append -- make -C ${project.path} all`,
      '',
      'clean-demo:',
      `\tmake -C ${project.path} clean`,
      '',
      'rebuild-demo: clean-demo demo',
      '',
      'cp-demo:',
      '\tcp /tmp/custom.so /tmp/destination',
      '',
    ].join('\n'), 'utf-8');

    runner.ensureMakefile(true);

    const makefile = readFileSync(join(workspaceRoot, '.sydev', 'Makefile'), 'utf-8');
    expect(makefile).toContain('bear --append -- rl-build build --project=demo $(RL_BUILD_ARGS)');
    expect(makefile).toContain('rl-build clean --project=demo $(RL_CLEAN_ARGS)');
    expect(makefile).not.toContain(`\tbear --append -- make -C ${project.path} all`);
    expect(makefile).not.toContain('\tcp /tmp/custom.so /tmp/destination');
  });

  it('将 -j 参数转换为 rl-build 的 --parallel 参数', async () => {
    const mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const promise = runner.buildOne(project, { extraArgs: ['-j4'] });
    mockProc.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith(
      'make',
      ['-f', join(workspaceRoot, '.sydev', 'Makefile'), 'demo', 'RL_BUILD_ARGS=--parallel=4'],
      { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] }
    );
  });

  it('编译 base 时保留 make 的 -j 参数，并通过 BASE_BUILD_ARGS 传递', async () => {
    const mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const promise = runner.buildOne({ name: 'base', path: basePath }, { extraArgs: ['-j4'] });
    mockProc.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith(
      'make',
      ['-f', join(workspaceRoot, '.sydev', 'Makefile'), 'base', 'BASE_BUILD_ARGS=-j4'],
      { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] }
    );
  });

  it('build 前会把工程 config.mk 里的 SYLIXOS_BASE_PATH 同步为当前 base 路径', async () => {
    const mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const configMkPath = join(workspaceRoot, 'demo', 'config.mk');
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(configMkPath, 'SYLIXOS_BASE_PATH = /tmp/wrong\nDEBUG_LEVEL := release\n', 'utf-8');

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const promise = runner.buildOne(project);

    expect(readFileSync(configMkPath, 'utf-8')).toBe(
      `SYLIXOS_BASE_PATH = ${basePath}\nDEBUG_LEVEL := release\n`
    );

    mockProc.emit('close', 0);
    await promise;
  });

  it('clean 前会在工程 config.mk 中追加缺失的 SYLIXOS_BASE_PATH', async () => {
    const mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const configMkPath = join(workspaceRoot, 'demo', 'config.mk');
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(configMkPath, 'DEBUG_LEVEL := debug\n', 'utf-8');

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const promise = runner.cleanOne(project);

    expect(readFileSync(configMkPath, 'utf-8')).toBe(
      `DEBUG_LEVEL := debug\nSYLIXOS_BASE_PATH = ${basePath}\n`
    );

    mockProc.emit('close', 0);
    await promise;
  });

  it('用户传并行编译参数且 base 模板未修复时发出 warning，但仍继续编译', async () => {
    const mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const multiPlatformMkPath = join(basePath, 'libsylixos', 'SylixOS', 'mktemp', 'multi-platform.mk');
    mkdirSync(join(basePath, 'libsylixos', 'SylixOS', 'mktemp'), { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');
    writeFileSync(multiPlatformMkPath, [
      'all:',
      '\t@$(foreach platform,$(PLATFORMS),make all -C $(platform);)',
      '',
      'clean:',
      '\t@$(foreach platform,$(PLATFORMS),make clean -C $(platform);)',
      '',
      'subdir-all:',
      '\tmake all -j',
      '',
      'subdir-clean:',
      '\tmake clean -j',
      '',
    ].join('\n'), 'utf-8');

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);
    runner.ensureMakefile();

    const progressSpy = vi.fn();
    runner.on('progress', progressSpy);

    const promise = runner.buildOne(project, { extraArgs: ['-j4'] });
    mockProc.emit('close', 0);
    await promise;

    expect(progressSpy).toHaveBeenCalledWith({
      type: 'warning',
      message: '检测到 base 的 libsylixos/SylixOS/mktemp/multi-platform.mk 尚未应用并行编译修复；本次继续编译，但多线程可能退化为单线程。可先运行 sydev build init 自动修复。'
    });
    expect(spawn).toHaveBeenCalledWith(
      'make',
      ['-f', join(workspaceRoot, '.sydev', 'Makefile'), 'demo', 'RL_BUILD_ARGS=--parallel=4'],
      { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] }
    );
  });

  it('build init 使用的修复函数会补丁 base 的 multi-platform.mk', () => {
    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    const multiPlatformMkPath = join(basePath, 'libsylixos', 'SylixOS', 'mktemp', 'multi-platform.mk');
    mkdirSync(join(basePath, 'libsylixos', 'SylixOS', 'mktemp'), { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');
    writeFileSync(multiPlatformMkPath, [
      'all:',
      '\t@$(foreach platform,$(PLATFORMS),make all -C $(platform);)',
      '',
      'clean:',
      '\t@$(foreach platform,$(PLATFORMS),make clean -C $(platform);)',
      '',
      'subdir-all:',
      '\tmake all -j',
      '',
      'subdir-clean:',
      '\tmake clean -j',
      '',
    ].join('\n'), 'utf-8');

    const project = { name: 'demo', path: join(workspaceRoot, 'demo') };
    const runner = new BuildRunner([project], workspaceRoot);

    const result = runner.repairBaseParallelBuildSupport();

    expect(result).toEqual({ basePath, exists: true, changed: true });
    expect(readFileSync(multiPlatformMkPath, 'utf-8')).toBe([
      'all:',
      '\t+@$(foreach platform,$(PLATFORMS),$(MAKE) all -C $(platform);)',
      '',
      'clean:',
      '\t+@$(foreach platform,$(PLATFORMS),$(MAKE) clean -C $(platform);)',
      '',
      'subdir-all:',
      '\t$(MAKE) all',
      '',
      'subdir-clean:',
      '\t$(MAKE) clean',
      '',
    ].join('\n'));
  });
});
