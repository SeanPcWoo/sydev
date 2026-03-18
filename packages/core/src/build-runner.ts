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
    // 自动添加 base 工程（如果存在 Makefile）
    if (this.basePath && existsSync(join(this.basePath, 'Makefile'))) {
      const hasBase = this.projects.some(p => p.name === 'base');
      if (!hasBase) {
        this.projects.unshift({ name: 'base', path: this.basePath });
      }
    }
  }

  /** 生成单个工程的 Makefile block */
  private generateProjectBlock(project: ScannedProject): string {
    const n = project.name;
    const isBase = n === 'base';
    const lines: string[] = [];
    lines.push('#' + '*'.repeat(79));
    lines.push(`# ${n}`);
    lines.push('#' + '*'.repeat(79));
    lines.push(`${n}:`);
    lines.push(isBase
      ? `\tmake -C ${project.path} all`
      : `\tbear --append -- make -C ${project.path} all`);
    lines.push('');
    lines.push(`clean-${n}:`);
    lines.push(`\tmake -C ${project.path} clean`);
    lines.push('');
    lines.push(`rebuild-${n}: clean-${n} ${n}`);
    if (!isBase) {
      lines.push('');
      lines.push(`cp-${n}:`);
      lines.push(`\t# TODO: 配置产物复制路径`);
      lines.push(`\t# cp ${project.path}/Debug/${n}.so /path/to/destination`);
    }
    return lines.join('\n');
  }

  /** 生成头部区域（变量声明 + .PHONY） */
  private generateHeader(): string {
    const lines: string[] = [
      '# SylixOS Workspace Makefile',
      '# 由 sydev 自动生成/更新',
      '# __ 开头的 target 为用户编译模板，sydev 不会修改',
      '',
    ];

    for (const project of this.projects) {
      const varName = `WORKSPACE_${project.name.replace(/-/g, '_')}`;
      lines.push(`export ${varName} = ${project.path}`);
    }

    lines.push('');

    if (this.basePath) {
      lines.push(`export SYLIXOS_BASE_PATH = ${this.basePath}`);
      lines.push('');
    }

    lines.push('# ─── 工程 Targets ───────────────────────────────────────────────');

    const phonyTargets = this.projects.flatMap(p => {
      const targets = [p.name, `clean-${p.name}`, `rebuild-${p.name}`];
      if (p.name !== 'base') targets.push(`cp-${p.name}`);
      return targets;
    });
    lines.push('');
    lines.push(`.PHONY: ${phonyTargets.join(' ')}`);

    return lines.join('\n');
  }

  /** 生成 .sydev/Makefile 内容 */
  private generateMakefile(includeDemo = true): string {
    const parts: string[] = [this.generateHeader()];

    for (const project of this.projects) {
      parts.push('');
      parts.push(this.generateProjectBlock(project));
    }

    if (includeDemo) {
      const demoLines: string[] = [];
      demoLines.push('');
      demoLines.push('# ─── 编译模板（__ 开头，可自行修改） ─────────────────────────────');
      demoLines.push('# 使用 SELF 变量引用本 Makefile，确保子 make 能找到正确的 target');
      demoLines.push('SELF := $(firstword $(MAKEFILE_LIST))');
      demoLines.push('');
      demoLines.push('__demo:');
      const nonBase = this.projects.filter(p => p.name !== 'base');
      for (const p of nonBase) {
        demoLines.push(`\t$(MAKE) -f $(SELF) ${p.name}`);
      }
      if (nonBase.length === 0) {
        demoLines.push('\t# 在此添加编译步骤，例如: $(MAKE) -f $(SELF) <工程名>');
      }
      demoLines.push('');
      parts.push(demoLines.join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * 从现有 Makefile 解析出结构化内容
   * - headerLines: 头部（变量声明到 .PHONY 行之后）
   * - projectBlocks: Map<工程名, block 文本>（保留用户修改）
   * - tailContent: 用户模板区域及其后所有内容（原样保留）
   */
  private parseMakefileStructured(content: string): {
    headerLines: string[];
    projectBlocks: Map<string, string>;
    projectOrder: string[];
    tailContent: string;
  } {
    const lines = content.split('\n');
    const headerLines: string[] = [];
    const projectBlocks = new Map<string, string>();
    const projectOrder: string[] = [];
    let tailContent = '';

    let i = 0;

    // 1. 读取头部：直到第一个 #**** 工程 block
    while (i < lines.length) {
      if (lines[i].match(/^#\*{10,}$/)) break;
      headerLines.push(lines[i]);
      i++;
    }

    // 2. 读取工程 blocks：每个 block 从 #**** 开始，到下一个 #**** 或用户模板区/文件末尾
    while (i < lines.length) {
      if (!lines[i].match(/^#\*{10,}$/)) break;

      // 读取 block header: #****, # name, #****
      const blockLines: string[] = [lines[i]]; // #****
      i++;
      if (i >= lines.length) break;

      const nameMatch = lines[i].match(/^# (\S+)$/);
      const blockName = nameMatch ? nameMatch[1] : '';
      blockLines.push(lines[i]); // # name
      i++;

      if (i < lines.length && lines[i].match(/^#\*{10,}$/)) {
        blockLines.push(lines[i]); // #****
        i++;
      }

      // 读取 block 内容直到下一个 #**** 或用户模板区或文件末尾
      while (i < lines.length) {
        if (lines[i].match(/^#\*{10,}$/)) break;
        if (lines[i].match(/^# ─── /) || lines[i].match(/^__\S+:/) || lines[i].match(/^SELF\s*:=/)) break;
        blockLines.push(lines[i]);
        i++;
      }

      // 去掉末尾空行（保留在 block 之间的间距由拼接时控制）
      while (blockLines.length > 0 && blockLines[blockLines.length - 1] === '') {
        blockLines.pop();
      }

      if (blockName) {
        projectBlocks.set(blockName, blockLines.join('\n'));
        projectOrder.push(blockName);
      }
    }

    // 3. 剩余内容全部作为 tailContent（用户模板区等）
    if (i < lines.length) {
      tailContent = lines.slice(i).join('\n');
    }

    return { headerLines, projectBlocks, projectOrder, tailContent };
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

  /** 确保 .sydev/Makefile 存在且工程 target 是最新的 */
  ensureMakefile(forceDefault = false): void {
    const sydevDir = join(this.workspaceRoot, '.sydev');
    if (!existsSync(sydevDir)) {
      mkdirSync(sydevDir, { recursive: true });
    }

    // 不存在或 --default：全新生成
    if (!existsSync(this.makefilePath) || forceDefault) {
      writeFileSync(this.makefilePath, this.generateMakefile(), 'utf-8');
      this.patchAllConfigMk();
      return;
    }

    // 增量更新：解析现有文件结构
    const existing = readFileSync(this.makefilePath, 'utf-8');
    const { projectBlocks, projectOrder, tailContent } = this.parseMakefileStructured(existing);
    const currentNames = new Set(this.projects.map(p => p.name));
    const existingNames = new Set(projectOrder);

    const added = this.projects.filter(p => !existingNames.has(p.name));
    const removed = projectOrder.filter(n => !currentNames.has(n));

    if (added.length === 0 && removed.length === 0) {
      // 无增删：只更新头部（变量、.PHONY）
      let updated = existing;
      for (const project of this.projects) {
        const varName = `WORKSPACE_${project.name.replace(/-/g, '_')}`;
        const re = new RegExp(`^export ${varName} = .*$`, 'm');
        if (re.test(updated)) {
          updated = updated.replace(re, `export ${varName} = ${project.path}`);
        }
      }
      if (this.basePath) {
        const baseRe = /^export SYLIXOS_BASE_PATH = .*$/m;
        if (baseRe.test(updated)) {
          updated = updated.replace(baseRe, `export SYLIXOS_BASE_PATH = ${this.basePath}`);
        }
      }
      if (updated !== existing) {
        writeFileSync(this.makefilePath, updated, 'utf-8');
      }
      this.patchAllConfigMk();
      return;
    }

    // 有增删：精确修改，保留用户对已有 block 的修改
    // 1. 删除被移除的工程 block
    for (const name of removed) {
      projectBlocks.delete(name);
    }

    // 2. 构建最终工程顺序：保留已有顺序，新工程追加到末尾
    const finalOrder: string[] = projectOrder.filter(n => currentNames.has(n));
    for (const p of added) {
      finalOrder.push(p.name);
      projectBlocks.set(p.name, this.generateProjectBlock(p));
    }

    // 3. 重新生成头部（变量和 .PHONY 需要反映最新工程列表）
    const header = this.generateHeader();

    // 4. 拼接：头部 + 工程 blocks + 尾部（用户模板区）
    const parts: string[] = [header];
    for (const name of finalOrder) {
      parts.push('');
      parts.push(projectBlocks.get(name)!);
    }
    if (tailContent.trim()) {
      parts.push('\n' + tailContent);
    }

    writeFileSync(this.makefilePath, parts.join('\n') + '\n', 'utf-8');

    // 只 patch 新增工程的 config.mk
    for (const p of added) {
      if (p.name !== 'base') {
        this.patchConfigMk(p);
      }
    }
  }

  /** 遍历所有非 base 工程，更新 config.mk */
  patchAllConfigMk(): void {
    for (const project of this.projects) {
      if (project.name !== 'base') {
        this.patchConfigMk(project);
      }
    }
  }

  /** 更新指定工程 config.mk 中的 SYLIXOS_BASE_PATH 和 PLATFORM_NAME */
  patchConfigMkFor(project: ScannedProject): void {
    this.patchConfigMk(project);
  }

  /** 更新工程 config.mk 中的 SYLIXOS_BASE_PATH 和 PLATFORM_NAME */
  private patchConfigMk(project: ScannedProject): void {
    if (!this.basePath) return;
    const configMkPath = join(project.path, 'config.mk');
    let content: string;
    try {
      content = readFileSync(configMkPath, 'utf-8');
    } catch {
      return;
    }
    // 更新 SYLIXOS_BASE_PATH
    let updated = content.replace(
      /^(SYLIXOS_BASE_PATH\s*[?:]?=\s*).*$/m,
      `$1${this.basePath}`
    );

    // 检查 base 的 config.mk 是否启用了 MULTI_PLATFORM_BUILD
    const baseConfigMkPath = join(this.basePath, 'config.mk');
    try {
      const baseContent = readFileSync(baseConfigMkPath, 'utf-8');
      const multiMatch = baseContent.match(/^MULTI_PLATFORM_BUILD\s*[?:]?=\s*(.+)$/m);
      if (multiMatch && multiMatch[1].trim().toLowerCase() === 'yes') {
        const platformsMatch = baseContent.match(/^PLATFORMS\s*[?:]?=\s*(.+)$/m);
        if (platformsMatch) {
          const platformsValue = platformsMatch[1].trim();
          const platformRe = /^PLATFORM_NAME\s*[?:]?=\s*/m;
          if (!platformRe.test(updated)) {
            // PLATFORM_NAME 不存在，在 SYLIXOS_BASE_PATH 行后插入
            updated = updated.replace(
              /^(SYLIXOS_BASE_PATH\s*[?:]?=\s*.*)$/m,
              `$1\nPLATFORM_NAME = ${platformsValue}`
            );
          }
        }
      }
    } catch {
      // base config.mk 不存在，跳过
    }

    if (updated !== content) {
      writeFileSync(configMkPath, updated, 'utf-8');
    }
  }

  /** 提取 error 行 */
  private extractErrorLines(output: string): string[] {
    return output
      .split('\n')
      .filter((line) => /error[:\s]|错误|失败|没有那个文件/i.test(line))
      .slice(0, 10);
  }

  /** 执行指定 Makefile target */
  private runTarget(project: ScannedProject, target: string, options?: BuildOptions): Promise<BuildProjectResult> {
    const args = ['-f', this.makefilePath, target];
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
        reject(new Error(`Cancelled (SIGINT) for project: ${project.name}`));
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

  /** clean 单个工程 */
  async cleanOne(project: ScannedProject, options?: BuildOptions): Promise<BuildProjectResult> {
    return this.runTarget(project, `clean-${project.name}`, options);
  }

  /** 编译单个工程 */
  async buildOne(project: ScannedProject, options?: BuildOptions): Promise<BuildProjectResult> {
    this.patchConfigMk(project);
    return this.runTarget(project, project.name, options);
  }

  /** rebuild 单个工程（clean + build） */
  async rebuildOne(project: ScannedProject, options?: BuildOptions): Promise<BuildProjectResult> {
    this.patchConfigMk(project);
    return this.runTarget(project, `rebuild-${project.name}`, options);
  }
}
