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

  it('生成的 Makefile 中 base 使用 make，其它工程使用 rl-build，并且不再改写 config.mk', () => {
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
    expect(makefile).toContain('bear --append -- $(MAKE) -C $(WORKSPACE_base) $(BASE_BUILD_ARGS) all');
    expect(makefile).toContain('$(MAKE) -C $(WORKSPACE_base) $(BASE_CLEAN_ARGS) clean');
    expect(makefile).toContain('bear --append -- rl-build build --project=demo $(RL_BUILD_ARGS)');
    expect(makefile).toContain('rl-build clean --project=demo $(RL_CLEAN_ARGS)');
    expect(readFileSync(demoConfigMk, 'utf-8')).toBe('SYLIXOS_BASE_PATH = /tmp/keep-me\nPLATFORM_NAME = OLD\n');
  });

  it('增量更新时切换到 rl-build 并保留自定义 cp target', () => {
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
      '# ─── 编译模板（__ 开头，可自行修改） ─────────────────────────────',
      'SELF := $(firstword $(MAKEFILE_LIST))',
      '',
      '__demo:',
      '\t$(MAKE) -f $(SELF) demo',
      '',
    ].join('\n'), 'utf-8');

    runner.ensureMakefile();

    const makefile = readFileSync(join(workspaceRoot, '.sydev', 'Makefile'), 'utf-8');
    expect(makefile).toContain('bear --append -- rl-build build --project=demo $(RL_BUILD_ARGS)');
    expect(makefile).toContain('rl-build clean --project=demo $(RL_CLEAN_ARGS)');
    expect(makefile).toContain('\tcp /tmp/custom.so /tmp/destination');
    expect(makefile).toContain('__demo:');
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
      ['-f', join(workspaceRoot, '.sydev', 'Makefile'), 'demo', 'RL_BUILD_ARGS=--parallel=4', 'BASE_BUILD_ARGS=-j4'],
      { cwd: workspaceRoot, stdio: ['ignore', 'pipe', 'pipe'] }
    );
  });

  it('base 编译时保留 make 原始参数，不转换成 rl-build 的 --parallel', async () => {
    const mockProc = createMockProcess();
    vi.mocked(spawn).mockReturnValue(mockProc);

    const realevoDir = join(workspaceRoot, '.realevo');
    const basePath = join(realevoDir, 'base');
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(realevoDir, 'config.json'), JSON.stringify({ base: basePath }), 'utf-8');
    writeFileSync(join(basePath, 'Makefile'), 'all:\n\t@echo base\n', 'utf-8');

    const runner = new BuildRunner([], workspaceRoot);
    runner.ensureMakefile();

    const baseProject = runner.getProjects().find((project) => project.name === 'base');
    expect(baseProject).toBeDefined();

    const promise = runner.buildOne(baseProject!, { extraArgs: ['-j4'] });
    mockProc.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith(
      'make',
      ['-f', join(workspaceRoot, '.sydev', 'Makefile'), 'base', 'RL_BUILD_ARGS=--parallel=4', 'BASE_BUILD_ARGS=-j4'],
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
});
