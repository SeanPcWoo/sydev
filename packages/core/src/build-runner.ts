import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import type { ScannedProject } from './workspace-scanner.js';

export interface BuildOptions {
  extraArgs?: string[];  // -- 之后的自定义 make 参数
  quiet?: boolean;       // 单工程静默模式（不透传 stdout-line 事件）
  verbose?: boolean;     // 批量模式详细输出（透传每个工程 stdout）
}

export interface BuildProjectResult {
  name: string;
  success: boolean;
  durationMs: number;
  stdout: string;          // 完整 stdout（即使静默也保留供汇总）
  stderr: string;
  errorSummary?: string;   // 失败时：首条含 "error:" 的行（不区分大小写）
  errorLines?: string[];   // 失败时：所有含 "error:" 的行（最多 10 条）
}

export interface BuildResult {
  projects: BuildProjectResult[];
  total: number;
  succeeded: number;
  failed: number;
}

export type BuildProgressEvent =
  | {
      type: 'project-start';
      name: string;
      index: number;
      total: number;
    }
  | {
      type: 'project-done';
      result: BuildProjectResult;
      index: number;
      total: number;
    }
  | {
      type: 'stdout-line';
      name: string;
      line: string;
    }
  | {
      type: 'warning';
      message: string;
    };

export class BuildRunner extends EventEmitter {
  constructor(private projects: ScannedProject[]) {
    super();
  }

  /** 检测 bear 是否可用（which bear） */
  private async checkBear(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('which', ['bear'], { stdio: 'ignore' });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  }

  /** 构建所有 WORKSPACE_<NAME> 环境变量 */
  private buildEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const project of this.projects) {
      const key = `WORKSPACE_${project.name.toUpperCase().replace(/-/g, '_')}`;
      env[key] = project.path;
    }
    return env;
  }

  /** 提取 error 行 */
  private extractErrorLines(output: string): string[] {
    return output
      .split('\n')
      .filter((line) => /error:/i.test(line))
      .slice(0, 10);
  }

  /** 编译单个工程 */
  async buildOne(project: ScannedProject, options?: BuildOptions): Promise<BuildProjectResult> {
    const bearAvailable = await this.checkBear();

    let cmd: string;
    let args: string[];

    if (bearAvailable) {
      cmd = 'bear';
      args = ['--', 'make'];
    } else {
      cmd = 'make';
      args = [];
      const warning: BuildProgressEvent = {
        type: 'warning',
        message: `bear 不可用，降级为 make（工程: ${project.name}）。如需生成 compile_commands.json，请安装 bear。`,
      };
      this.emit('progress', warning);
    }

    if (options?.extraArgs && options.extraArgs.length > 0) {
      args.push(...options.extraArgs);
    }

    const env = this.buildEnv();
    const startTime = Date.now();
    const quiet = options?.quiet ?? false;

    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        cwd: project.path,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutBuf = '';
      let stderrBuf = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdoutBuf += text;
        if (!quiet) {
          for (const line of text.split('\n')) {
            if (line) {
              const event: BuildProgressEvent = { type: 'stdout-line', name: project.name, line };
              this.emit('progress', event);
            }
          }
        }
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString();
      });

      const sigintHandler = () => {
        proc.kill('SIGTERM');
        reject(new Error(`Build cancelled (SIGINT) for project: ${project.name}`));
      };
      process.once('SIGINT', sigintHandler);

      proc.on('close', (code) => {
        process.removeListener('SIGINT', sigintHandler);
        const durationMs = Date.now() - startTime;
        const success = code === 0;

        const result: BuildProjectResult = {
          name: project.name,
          success,
          durationMs,
          stdout: stdoutBuf,
          stderr: stderrBuf,
        };

        if (!success) {
          const combined = stdoutBuf + '\n' + stderrBuf;
          const errLines = this.extractErrorLines(combined);
          result.errorLines = errLines;
          result.errorSummary = errLines[0];
        }

        resolve(result);
      });

      proc.on('error', (err) => {
        process.removeListener('SIGINT', sigintHandler);
        reject(err);
      });
    });
  }

  /** 批量编译所有工程（顺序执行） */
  async buildAll(options?: BuildOptions): Promise<BuildResult> {
    const total = this.projects.length;
    const results: BuildProjectResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < this.projects.length; i++) {
      const project = this.projects[i];
      const startEvent: BuildProgressEvent = {
        type: 'project-start',
        name: project.name,
        index: i,
        total,
      };
      this.emit('progress', startEvent);

      // 批量编译默认 quiet=true，除非 verbose=true
      const buildOptions: BuildOptions = {
        ...options,
        quiet: options?.verbose ? false : (options?.quiet ?? true),
      };

      const result = await this.buildOne(project, buildOptions);
      results.push(result);

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }

      const doneEvent: BuildProgressEvent = {
        type: 'project-done',
        result,
        index: i,
        total,
      };
      this.emit('progress', doneEvent);
    }

    return { projects: results, total, succeeded, failed };
  }
}
