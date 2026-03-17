import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
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
  private basePath: string | undefined;
  private makefilePath: string;

  constructor(private projects: ScannedProject[], private workspaceRoot: string) {
    super();
    this.makefilePath = join(workspaceRoot, '.sydev', 'Makefile');
    // Read basePath from .realevo/config.json
    try {
      const raw = readFileSync(join(workspaceRoot, '.realevo', 'config.json'), 'utf-8');
      const config = JSON.parse(raw);
      this.basePath = config.base;
    } catch {
      // config.json not found or invalid
    }
  }

  /** 生成 .sydev/Makefile 内容 */
  private generateMakefile(): string {
    const lines: string[] = [
      '# SylixOS Workspace Makefile',
      '# 由 sydev 自动生成/更新',
      '# __ 开头的 target 为用户编译模板，sydev 不会修改',
      '',
    ];

    // WORKSPACE_ 变量
    for (const project of this.projects) {
      const varName = `WORKSPACE_${project.name.replace(/-/g, '_')}`;
      lines.push(`export ${varName} = ${project.path}`);
    }

    lines.push('');

    // SYLIXOS_BASE_PATH
    if (this.basePath) {
      lines.push(`export SYLIXOS_BASE_PATH = ${this.basePath}`);
      lines.push('');
    }

    lines.push('# ─── 工程 Targets ───────────────────────────────────────────────');

    for (const project of this.projects) {
      const n = project.name;
      lines.push('');
      lines.push(`# ${n}`);
      lines.push(`${n}:`);
      lines.push(`\tbear -- make -C ${project.path}`);
      lines.push('');
      lines.push(`clean-${n}:`);
      lines.push(`\t$(MAKE) -C ${project.path} clean`);
      lines.push('');
      lines.push(`rebuild-${n}: clean-${n} ${n}`);
      lines.push('');
      lines.push(`cp-${n}:`);
      lines.push(`\t# TODO: 配置产物复制路径`);
      lines.push(`\t# cp ${project.path}/Debug/${n}.so /path/to/destination`);
    }

    // demo 编译模板
    lines.push('');
    lines.push('# ─── 编译模板（__ 开头，可自行修改） ─────────────────────────────');
    lines.push('');
    lines.push('__demo:');
    const demoTargets = this.projects.slice(0, 3).map(p => p.name);
    for (const t of demoTargets) {
      lines.push(`\t$(MAKE) -f $(lastword $(MAKEFILE_LIST)) ${t}`);
    }
    if (demoTargets.length === 0) {
      lines.push('\t# 在此添加编译步骤，例如: $(MAKE) -f $(lastword $(MAKEFILE_LIST)) <工程名>');
    }
    lines.push('');

    return lines.join('\n');
  }

  /** 从现有 Makefile 解析出已管理的工程名集合和用户自定义内容 */
  private parseMakefile(content: string): { managedProjects: Set<string>; userBlocks: string[] } {
    const managedProjects = new Set<string>();
    const userBlocks: string[] = [];
    let inUserBlock = false;
    let currentUserBlock: string[] = [];

    for (const line of content.split('\n')) {
      // 检测 sydev 管理的工程 target（格式: "# <name>" 后跟 "<name>:" target）
      const projectComment = line.match(/^# (\S+)$/);
      if (projectComment && !projectComment[1].startsWith('__') && !line.startsWith('# ───') && !line.startsWith('# SylixOS') && !line.startsWith('# 由 sydev')) {
        managedProjects.add(projectComment[1]);
      }

      // 检测用户自定义 __ target 块
      if (line.match(/^__\S+:/)) {
        inUserBlock = true;
        currentUserBlock = [line];
      } else if (inUserBlock) {
        if (line.startsWith('\t') || line === '') {
          currentUserBlock.push(line);
        } else {
          // 用户块结束
          userBlocks.push(currentUserBlock.join('\n'));
          currentUserBlock = [];
          inUserBlock = false;
        }
      }
    }
    // 收尾
    if (inUserBlock && currentUserBlock.length > 0) {
      userBlocks.push(currentUserBlock.join('\n'));
    }

    return { managedProjects, userBlocks };
  }

  /** 从 Makefile 中提取 __ 开头的用户编译模板名 */
  parseUserTemplates(): string[] {
    if (!existsSync(this.makefilePath)) return [];
    const content = readFileSync(this.makefilePath, 'utf-8');
    const templates: string[] = [];
    for (const line of content.split('\n')) {
      const match = line.match(/^(__\S+):/);
      if (match) templates.push(match[1]);
    }
    return templates;
  }

  /** 确保 .sydev/Makefile 存在且工程 target 是最新的（增量更新） */
  ensureMakefile(): void {
    const sydevDir = join(this.workspaceRoot, '.sydev');
    if (!existsSync(sydevDir)) {
      mkdirSync(sydevDir, { recursive: true });
    }

    // 如果不存在，全新生成
    if (!existsSync(this.makefilePath)) {
      writeFileSync(this.makefilePath, this.generateMakefile(), 'utf-8');
      return;
    }

    // 增量更新：解析现有文件
    const existing = readFileSync(this.makefilePath, 'utf-8');
    const { managedProjects, userBlocks } = this.parseMakefile(existing);
    const currentNames = new Set(this.projects.map(p => p.name));

    // 检查是否需要更新
    const added = this.projects.filter(p => !managedProjects.has(p.name));
    const removed = [...managedProjects].filter(n => !currentNames.has(n));

    if (added.length === 0 && removed.length === 0) {
      // 只更新 WORKSPACE_ 变量和 SYLIXOS_BASE_PATH（路径可能变）
      let updated = existing;
      // 更新 WORKSPACE_ 变量区域
      for (const project of this.projects) {
        const varName = `WORKSPACE_${project.name.replace(/-/g, '_')}`;
        const re = new RegExp(`^export ${varName} = .*$`, 'm');
        if (re.test(updated)) {
          updated = updated.replace(re, `export ${varName} = ${project.path}`);
        }
      }
      // 更新 SYLIXOS_BASE_PATH
      if (this.basePath) {
        const baseRe = /^export SYLIXOS_BASE_PATH = .*$/m;
        if (baseRe.test(updated)) {
          updated = updated.replace(baseRe, `export SYLIXOS_BASE_PATH = ${this.basePath}`);
        }
      }
      if (updated !== existing) {
        writeFileSync(this.makefilePath, updated, 'utf-8');
      }
      return;
    }

    // 有增删：重新生成管理区域，保留用户块
    const generated = this.generateMakefile();
    if (userBlocks.length > 0) {
      const userSection = '\n# ─── 用户编译模板（__ 开头，sydev 不会修改） ──────────────────\n\n' + userBlocks.join('\n\n') + '\n';
      writeFileSync(this.makefilePath, generated + userSection, 'utf-8');
    } else {
      writeFileSync(this.makefilePath, generated, 'utf-8');
    }
  }

  /** 更新工程 config.mk 中的 SYLIXOS_BASE_PATH */
  private patchConfigMk(project: ScannedProject): void {
    if (!this.basePath) return;
    const configMkPath = join(project.path, 'config.mk');
    let content: string;
    try {
      content = readFileSync(configMkPath, 'utf-8');
    } catch {
      return;
    }
    const updated = content.replace(
      /^(SYLIXOS_BASE_PATH\s*[?:]?=\s*).*$/m,
      `$1${this.basePath}`
    );
    if (updated !== content) {
      writeFileSync(configMkPath, updated, 'utf-8');
    }
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
    this.patchConfigMk(project);

    const args = ['-f', this.makefilePath, project.name];
    if (options?.extraArgs && options.extraArgs.length > 0) {
      args.push(...options.extraArgs);
    }

    const startTime = Date.now();
    const quiet = options?.quiet ?? false;

    return new Promise((resolve, reject) => {
      const proc = spawn('make', args, {
        cwd: this.workspaceRoot,
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
}
