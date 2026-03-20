import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { ScannedProject } from './workspace-scanner.js';

export interface BuildOptions {
  extraArgs?: string[];  // -- 之后透传给 rl-build / Makefile 模板的自定义参数
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
      type: 'stderr-line';
      name: string;
      line: string;
    }
  | {
      type: 'warning';
      message: string;
    };

function normalizeOutputLine(line: string): string {
  return line.replace(/\r$/, '').trim();
}

function shellEscapeArg(arg: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(arg)) {
    return arg;
  }

  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function normalizeBuildExtraArgs(extraArgs: string[]): string[] {
  const normalized: string[] = [];

  for (let i = 0; i < extraArgs.length; i++) {
    const arg = extraArgs[i];

    if (/^-j\d+$/.test(arg)) {
      normalized.push(`--parallel=${arg.slice(2)}`);
      continue;
    }

    if (arg === '-j' || arg === '--jobs') {
      const next = extraArgs[i + 1];
      if (next && /^\d+$/.test(next)) {
        normalized.push(`--parallel=${next}`);
        i++;
        continue;
      }
    }

    if (/^--jobs=\d+$/.test(arg)) {
      normalized.push(`--parallel=${arg.slice('--jobs='.length)}`);
      continue;
    }

    normalized.push(arg);
  }

  return normalized;
}

function formatExtraArgsForMake(extraArgs: string[]): string {
  return extraArgs.map(shellEscapeArg).join(' ');
}

function appendConfigLine(content: string, line: string): string {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  if (content.length === 0) {
    return `${line}${eol}`;
  }
  return content.endsWith('\n')
    ? `${content}${line}${eol}`
    : `${content}${eol}${line}${eol}`;
}

function isWrapperErrorLine(line: string, makefilePath: string): boolean {
  const normalizedLine = line.replace(/\\/g, '/');
  const normalizedMakefilePath = makefilePath.replace(/\\/g, '/');
  return normalizedLine.includes(normalizedMakefilePath) || normalizedLine.includes('.sydev/Makefile');
}

function scoreErrorLine(line: string, makefilePath: string): number {
  if (!line) return 0;

  const wrapperLine = isWrapperErrorLine(line, makefilePath);

  if (/.+:\d+(?::\d+)?:\s*(?:fatal\s+)?error:/i.test(line)) {
    return wrapperLine ? 40 : 400;
  }

  if (/\bundefined reference to\b/i.test(line)) {
    return 360;
  }

  if (/\bmultiple definition of\b/i.test(line)) {
    return 350;
  }

  if (/\bld(?:\.[\w-]+)?:\s+.*\b(?:cannot find|error)\b/i.test(line)) {
    return 340;
  }

  if (/\bcollect2: error:/i.test(line)) {
    return 330;
  }

  if (/\bNo rule to make target\b/i.test(line)) {
    return wrapperLine ? 60 : 320;
  }

  if (/\bNo such file or directory\b/i.test(line)) {
    return wrapperLine ? 60 : 310;
  }

  if (/\berror[:\s]/i.test(line) || /错误|失败|没有那个文件/i.test(line)) {
    return wrapperLine ? 50 : 220;
  }

  if (/^make(?:\[\d+\])?: \*\*\*/i.test(line)) {
    return wrapperLine ? 40 : 180;
  }

  return 0;
}

export function extractBuildErrorLines(output: string, makefilePath: string): string[] {
  const candidates = output
    .split('\n')
    .map(normalizeOutputLine)
    .map((line, index) => ({ line, index, score: scoreErrorLine(line, makefilePath) }))
    .filter((item) => item.score > 0);

  if (candidates.length === 0) {
    return [];
  }

  const deduped: typeof candidates = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.line)) continue;
    seen.add(candidate.line);
    deduped.push(candidate);
  }

  deduped.sort((a, b) => b.score - a.score || a.index - b.index);

  const preferred = deduped.filter((item) => !isWrapperErrorLine(item.line, makefilePath));
  const lines = preferred.length > 0 ? preferred : deduped;

  return lines.slice(0, 10).map((item) => item.line);
}

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

  private defaultCpSection(project: ScannedProject): string {
    return [
      `cp-${project.name}:`,
      `\t# TODO: 配置产物复制路径`,
      `\t# cp ${project.path}/Debug/${project.name}.so /path/to/destination`,
    ].join('\n');
  }

  private extractCpSection(block: string, projectName: string): string | undefined {
    const lines = block.split('\n');
    const cpIndex = lines.findIndex((line) => line === `cp-${projectName}:`);
    if (cpIndex === -1) return undefined;

    const cpLines = lines.slice(cpIndex);
    while (cpLines.length > 0 && cpLines[cpLines.length - 1] === '') {
      cpLines.pop();
    }

    return cpLines.join('\n');
  }

  private isDefaultCpSection(cpSection: string, projectName: string): boolean {
    const lines = cpSection.split('\n');
    return (
      lines.length === 3
      && lines[0] === `cp-${projectName}:`
      && lines[1] === '\t# TODO: 配置产物复制路径'
      && /^\t# cp .+ \/path\/to\/destination$/.test(lines[2])
    );
  }

  private resolveCpSection(project: ScannedProject, existingBlock?: string): string {
    const fallback = this.defaultCpSection(project);
    if (!existingBlock) return fallback;

    const cpSection = this.extractCpSection(existingBlock, project.name);
    if (!cpSection || this.isDefaultCpSection(cpSection, project.name)) {
      return fallback;
    }

    return cpSection;
  }

  /** 生成单个工程的 Makefile block */
  private generateProjectBlock(project: ScannedProject, existingBlock?: string): string {
    const n = project.name;
    const lines: string[] = [];
    lines.push('#' + '*'.repeat(79));
    lines.push(`# ${n}`);
    lines.push('#' + '*'.repeat(79));
    lines.push(`${n}:`);
    lines.push(`\tbear --append -- rl-build build --project=${n} $(RL_BUILD_ARGS)`);
    lines.push('');
    lines.push(`clean-${n}:`);
    lines.push(`\trl-build clean --project=${n} $(RL_CLEAN_ARGS)`);
    lines.push('');
    lines.push(`rebuild-${n}: clean-${n} ${n}`);
    if (n !== 'base') {
      lines.push('');
      lines.push(this.resolveCpSection(project, existingBlock));
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
      return;
    }

    // 增量更新：保留用户模板区和自定义 cp target，其余工程 target 按当前模板重建
    const existing = readFileSync(this.makefilePath, 'utf-8');
    const { projectBlocks, projectOrder, tailContent } = this.parseMakefileStructured(existing);

    const projectsByName = new Map(this.projects.map((project) => [project.name, project]));
    const currentNames = new Set(projectsByName.keys());

    // 构建最终工程顺序：保留已有顺序，新工程追加到末尾
    const finalOrder: string[] = projectOrder.filter((name) => currentNames.has(name));
    for (const project of this.projects) {
      if (!finalOrder.includes(project.name)) {
        finalOrder.push(project.name);
      }
    }

    // 重新生成头部（变量和 .PHONY 需要反映最新工程列表）
    const header = this.generateHeader();

    // 拼接：头部 + 工程 blocks + 尾部（用户模板区）
    const parts: string[] = [header];
    for (const name of finalOrder) {
      const project = projectsByName.get(name);
      if (!project) continue;
      parts.push('');
      parts.push(this.generateProjectBlock(project, projectBlocks.get(name)));
    }
    if (tailContent.trim()) {
      parts.push('\n' + tailContent);
    }

    writeFileSync(this.makefilePath, parts.join('\n') + '\n', 'utf-8');
  }

  /** 提取 error 行 */
  private extractErrorLines(output: string): string[] {
    return extractBuildErrorLines(output, this.makefilePath);
  }

  /** 在执行前校正工程 config.mk 里的 SYLIXOS_BASE_PATH */
  private syncProjectBasePath(project: ScannedProject): void {
    if (!this.basePath) {
      return;
    }

    const configMkPath = join(project.path, 'config.mk');
    if (!existsSync(configMkPath)) {
      return;
    }

    const content = readFileSync(configMkPath, 'utf-8');
    const nextContent = /^\s*SYLIXOS_BASE_PATH\s*[:?+]?=.*$/m.test(content)
      ? content.replace(/^(\s*SYLIXOS_BASE_PATH\s*)([:?+]?=).*$/m, `$1$2 ${this.basePath}`)
      : appendConfigLine(content, `SYLIXOS_BASE_PATH = ${this.basePath}`);

    if (nextContent !== content) {
      writeFileSync(configMkPath, nextContent, 'utf-8');
    }
  }

  private syncBasePathBeforeTarget(project: ScannedProject, targetType: 'build' | 'clean' | 'rebuild' | 'template'): void {
    if (targetType === 'template') {
      for (const currentProject of this.projects) {
        this.syncProjectBasePath(currentProject);
      }
      return;
    }

    this.syncProjectBasePath(project);
  }

  /** 执行指定 Makefile target */
  private runTarget(
    project: ScannedProject,
    target: string,
    targetType: 'build' | 'clean' | 'rebuild' | 'template',
    options?: BuildOptions
  ): Promise<BuildProjectResult> {
    const args = ['-f', this.makefilePath, target];

    if (options?.extraArgs && options.extraArgs.length > 0) {
      const extraArgs = targetType === 'build' || targetType === 'rebuild' || targetType === 'template'
        ? normalizeBuildExtraArgs(options.extraArgs)
        : options.extraArgs;
      const formattedArgs = formatExtraArgsForMake(extraArgs);

      if (formattedArgs) {
        if (targetType === 'build' || targetType === 'rebuild' || targetType === 'template') {
          args.push(`RL_BUILD_ARGS=${formattedArgs}`);
        } else if (targetType === 'clean') {
          args.push(`RL_CLEAN_ARGS=${formattedArgs}`);
        }
      }
    }

    const startTime = Date.now();
    const quiet = options?.quiet ?? false;

    try {
      this.syncBasePathBeforeTarget(project, targetType);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Promise.resolve({
        name: project.name,
        success: false,
        durationMs: Date.now() - startTime,
        stdout: '',
        stderr: message,
        errorSummary: message,
        errorLines: [message],
      });
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('make', args, {
        cwd: this.workspaceRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutBuf = '';
      let stderrBuf = '';
      let stdoutPending = '';
      let stderrPending = '';

      const emitLines = (
        text: string,
        eventType: 'stdout-line' | 'stderr-line',
        pending: 'stdoutPending' | 'stderrPending'
      ) => {
        if (quiet) return;

        const combined = (pending === 'stdoutPending' ? stdoutPending : stderrPending) + text;
        const parts = combined.split('\n');
        const nextPending = parts.pop() ?? '';

        if (pending === 'stdoutPending') stdoutPending = nextPending;
        else stderrPending = nextPending;

        for (const rawLine of parts) {
          const line = rawLine.replace(/\r$/, '');
          if (!line) continue;
          const event: BuildProgressEvent = { type: eventType, name: project.name, line };
          this.emit('progress', event);
        }
      };

      const flushPendingLine = (eventType: 'stdout-line' | 'stderr-line', pending: 'stdoutPending' | 'stderrPending') => {
        if (quiet) return;

        const line = pending === 'stdoutPending' ? stdoutPending : stderrPending;
        if (!line) return;

        const event: BuildProgressEvent = {
          type: eventType,
          name: project.name,
          line: line.replace(/\r$/, ''),
        };
        this.emit('progress', event);

        if (pending === 'stdoutPending') stdoutPending = '';
        else stderrPending = '';
      };

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdoutBuf += text;
        emitLines(text, 'stdout-line', 'stdoutPending');
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderrBuf += text;
        emitLines(text, 'stderr-line', 'stderrPending');
      });

      const sigintHandler = () => {
        proc.kill('SIGTERM');
        reject(new Error(`Cancelled (SIGINT) for project: ${project.name}`));
      };
      process.once('SIGINT', sigintHandler);

      proc.on('close', (code) => {
        process.removeListener('SIGINT', sigintHandler);
        flushPendingLine('stdout-line', 'stdoutPending');
        flushPendingLine('stderr-line', 'stderrPending');
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
    return this.runTarget(project, `clean-${project.name}`, 'clean', options);
  }

  /** 编译单个工程 */
  async buildOne(project: ScannedProject, options?: BuildOptions): Promise<BuildProjectResult> {
    const targetType = project.name.startsWith('__') ? 'template' : 'build';
    return this.runTarget(project, project.name, targetType, options);
  }

  /** rebuild 单个工程（clean + build） */
  async rebuildOne(project: ScannedProject, options?: BuildOptions): Promise<BuildProjectResult> {
    return this.runTarget(project, `rebuild-${project.name}`, 'rebuild', options);
  }
}
