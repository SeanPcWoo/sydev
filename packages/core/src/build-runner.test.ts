import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
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
});
