import { spawn } from 'child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { ProgressReporter } from './progress-reporter.js';
import { REQUIRED_BASE_COMPONENTS } from './constants.js';

const RESEARCH_REPO = 'ssh://git@10.7.100.21:16783/sylixos/research/libsylixos.git';

export interface RlCommandResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  fixSuggestion?: string;
}

export async function executeRlCommand(
  command: string,
  args: string[],
  progressReporter?: ProgressReporter,
  cwd?: string,
  timeoutMs: number | null = 120_000,
): Promise<RlCommandResult> {
  return new Promise((resolve) => {
    // 确保 cwd 目录存在
    if (cwd && !existsSync(cwd)) {
      mkdirSync(cwd, { recursive: true });
    }

    const proc = spawn(command, args, { cwd, env: process.env, shell: true });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = timeoutMs !== null && timeoutMs > 0
      ? setTimeout(() => {
          if (!settled) {
            settled = true;
            proc.kill('SIGTERM');
            resolve({
              success: false,
              stdout,
              stderr,
              error: `执行 ${command} 超时 (${timeoutMs / 1000}s)`,
              fixSuggestion: '命令执行时间过长，请检查网络或手动执行该命令排查问题',
            });
          }
        }, timeoutMs)
      : undefined;

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      progressReporter?.emit('output', data.toString());
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (code === 0) {
        resolve({ success: true, stdout });
      } else {
        const { error, fixSuggestion } = parseRlError(stderr || stdout);
        resolve({ success: false, stdout, stderr, error, fixSuggestion });
      }
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        success: false,
        error: `执行 ${command} 命令失败: ${err.message}`,
        fixSuggestion: '请确认 RealEvo-Stream 已正确安装且 rl-workspace, rl-project, rl-device, rl-build 命令在 PATH 中'
      });
    });
  });
}

function parseRlError(output: string): { error: string; fixSuggestion: string } {
  if (output.includes('permission denied') || output.includes('权限不足')) {
    return {
      error: '权限不足',
      fixSuggestion: '请使用 sudo 运行或检查文件权限'
    };
  }
  if (output.includes('not found') || output.includes('不存在')) {
    return {
      error: '路径或文件不存在',
      fixSuggestion: '请检查路径是否正确，或先创建必要的目录'
    };
  }
  if (output.includes('version') || output.includes('版本')) {
    return {
      error: '版本不兼容',
      fixSuggestion: '请升级 RealEvo-Stream 到最新版本'
    };
  }
  return {
    error: output.trim() || '未知错误',
    fixSuggestion: '请查看错误信息或联系技术支持'
  };
}

export interface WorkspaceInitOptions {
  cwd: string;
  basePath: string;
  platform: string[] | string;
  version: string;
  createbase?: boolean;
  build?: boolean;
  debugLevel?: string;
  os?: string;
  arm64PageShift?: number;
  baseComponents?: string[];
  customRepo?: string;
  customBranch?: string;
  researchBranch?: string;
}

export interface ProjectCreateOptions {
  name: string;
  template?: string;
  type?: string;
  source?: string;
  branch?: string;
  debugLevel?: string;
  makeTool?: string;
  cwd?: string;
}

export interface DeviceAddOptions {
  name: string;
  ip: string;
  platform: string[];
  ssh?: number;
  telnet?: number;
  ftp?: number;
  gdb?: number;
  username?: string;
  password?: string;
  cwd?: string;
}

export class RlWrapper {
  constructor(private progressReporter: ProgressReporter) {}

  async initWorkspace(config: WorkspaceInitOptions): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: '初始化 Workspace', progress: 0 });

    const isResearch = config.version === 'research';
    const isCustom = config.version === 'custom';
    const isCloneMode = isResearch || isCustom;

    const args = [
      'init',
      `--base=${config.basePath}`,
      `--platform=${Array.isArray(config.platform) ? config.platform.join(':') : config.platform}`,
      `--version=${isCloneMode ? 'lts_3.6.5' : config.version}`
    ];
    if (isCloneMode || config.createbase !== undefined) args.push(`--createbase=${isCloneMode ? true : config.createbase}`);
    if (config.build !== undefined || isCloneMode) args.push('--build=false');
    if (config.debugLevel) args.push(`--debug_level=${config.debugLevel}`);
    if (config.os) args.push(`--os=${config.os}`);

    const bootstrapResult = await executeRlCommand('rl-workspace', args, this.progressReporter, config.cwd);
    const expectedCloneBootstrapFailure = isCloneMode && !bootstrapResult.success && existsSync(join(config.cwd, '.realevo'));
    const bootstrapError = !bootstrapResult.success && !expectedCloneBootstrapFailure
      ? bootstrapResult.error ?? 'workspace 初始化失败'
      : undefined;

    if (bootstrapError && !canContinueWorkspacePostSteps(config)) {
      this.progressReporter.reportError(bootstrapResult.error ?? 'workspace 初始化失败');
      return bootstrapResult;
    }

    if (isCloneMode) {
      const cloneResult = await cloneLibsylixosForWorkspace(config, this.progressReporter);
      if (!cloneResult.success) {
        this.progressReporter.reportError(cloneResult.error ?? 'libsylixos 仓库替换失败');
        return cloneResult;
      }
    }

    if (config.cwd) {
      syncBaseConfigMkPlatforms(config.cwd, config.basePath);
      syncWorkspaceConfig(config.cwd, config);
    }

    patchBaseMultiPlatformMk(config.basePath);

    try {
      applyArm64PageShiftToBase(config, { strict: true });
    } catch (err: any) {
      const failure = {
        success: false,
        error: err.message,
        fixSuggestion: '请检查 base/libsylixos/SylixOS/config/cpu/cpu_cfg_arm64.h 是否存在且包含 LW_CFG_ARM64_PAGE_SHIFT 宏',
      } satisfies RlCommandResult;
      this.progressReporter.reportError(failure.error);
      return failure;
    }

    try {
      applyBaseComponentsToBase(config, { strict: true });
    } catch (err: any) {
      const failure = {
        success: false,
        error: err.message,
        fixSuggestion: '请检查 base/Makefile 的 COMPONENTS 变量，并确认所选组件名称存在于默认组件列表中',
      } satisfies RlCommandResult;
      this.progressReporter.reportError(failure.error);
      return failure;
    }

    let baseBuildResult: RlCommandResult | undefined;
    if (config.build) {
      baseBuildResult = await buildBaseAfterWorkspace(config, this.progressReporter);
      if (!baseBuildResult.success) {
        this.progressReporter.reportError(baseBuildResult.error ?? 'base 编译失败');
      }
    }

    if (bootstrapError || (baseBuildResult && !baseBuildResult.success)) {
      return combineWorkspaceInitResults(bootstrapResult, bootstrapError, baseBuildResult);
    }

    this.progressReporter.emit('step', { name: '初始化 Workspace', progress: 100 });
    if (bootstrapResult.success) {
      return baseBuildResult ?? bootstrapResult;
    }
    return {
      success: true,
      stdout: [bootstrapResult.stdout, baseBuildResult?.stdout].filter(Boolean).join('\n'),
      stderr: [bootstrapResult.stderr, baseBuildResult?.stderr].filter(Boolean).join('\n'),
    };
  }

  async createProject(config: ProjectCreateOptions): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: `创建项目 ${config.name}`, progress: 0 });

    const args = [
      'create',
      `--name=${config.name}`
    ];
    // --source 和 --template 互斥，source 优先
    if (config.source) {
      args.push(`--source=${config.source}`);
      if (config.branch) args.push(`--branch=${config.branch}`);
      args.push('--quiet');
    } else {
      if (config.template) args.push(`--template=${config.template}`);
    }
    if (config.type) args.push(`--type=${config.type}`);
    if (config.debugLevel) args.push(`--debug-level=${config.debugLevel}`);
    if (config.makeTool) args.push(`--make-tool=${config.makeTool}`);

    const result = await executeRlCommand('rl-project', args, this.progressReporter, config.cwd);
    if (result.success) {
      this.progressReporter.emit('step', { name: `创建项目 ${config.name}`, progress: 100 });
    } else {
      this.progressReporter.reportError(result.error ?? `项目 ${config.name} 创建失败`);
    }
    return result;
  }

  async addDevice(config: DeviceAddOptions): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: `添加设备 ${config.name}`, progress: 0 });

    const args = [
      'add',
      `--name=${config.name}`,
      `--ip=${config.ip}`,
      `--platform=${Array.isArray(config.platform) ? config.platform.join(':') : config.platform}`
    ];
    if (config.ssh !== undefined) args.push(`--ssh=${config.ssh}`);
    if (config.telnet !== undefined) args.push(`--telnet=${config.telnet}`);
    if (config.ftp !== undefined) args.push(`--ftp=${config.ftp}`);
    if (config.gdb !== undefined) args.push(`--gdb=${config.gdb}`);
    if (config.username) args.push(`--user=${config.username}`);
    if (config.password) args.push(`--password=${config.password}`);

    const result = await executeRlCommand('rl-device', args, this.progressReporter, config.cwd);
    if (result.success) {
      this.progressReporter.emit('step', { name: `添加设备 ${config.name}`, progress: 100 });
    } else {
      this.progressReporter.reportError(result.error ?? `设备 ${config.name} 添加失败`);
    }
    return result;
  }
}

function syncBaseConfigMkPlatforms(workspaceRoot: string, fallbackBasePath?: string): void {
  const realevoConfigPath = join(workspaceRoot, '.realevo', 'config.json');
  if (!existsSync(realevoConfigPath)) {
    return;
  }

  try {
    const raw = JSON.parse(readFileSync(realevoConfigPath, 'utf-8')) as {
      base?: unknown;
      platforms?: unknown;
    };

    const platforms = normalizePlatforms(raw.platforms);
    if (platforms.length === 0) {
      return;
    }

    const basePath = typeof raw.base === 'string' && raw.base.trim()
      ? raw.base.trim()
      : fallbackBasePath;
    if (!basePath) {
      return;
    }

    const configMkPath = join(basePath, 'config.mk');
    if (!existsSync(configMkPath)) {
      return;
    }

    const content = readFileSync(configMkPath, 'utf-8');
    const normalizedPlatforms = platforms.join(' ');
    const replacementLine = `PLATFORMS := ${normalizedPlatforms}`;
    const nextContent = /^\s*PLATFORMS\s*[:?+]?=.*$/m.test(content)
      ? content.replace(/^(\s*PLATFORMS\s*)([:?+]?=).*$/m, `$1$2 ${normalizedPlatforms}`)
      : appendPlatformsLine(content, replacementLine);

    if (nextContent !== content) {
      writeFileSync(configMkPath, nextContent, 'utf-8');
    }
  } catch {
    // 同步失败不影响 rl-workspace 原始执行结果，保持 best-effort。
  }
}

function syncWorkspaceConfig(workspaceRoot: string, config: WorkspaceInitOptions): void {
  const realevoDir = join(workspaceRoot, '.realevo');
  if (!existsSync(realevoDir)) {
    return;
  }

  const workspaceConfigPath = join(realevoDir, 'workspace.json');

  try {
    let existing: Record<string, unknown> = {};
    if (existsSync(workspaceConfigPath)) {
      existing = JSON.parse(readFileSync(workspaceConfigPath, 'utf-8')) as Record<string, unknown>;
    }

    const nextConfig: Record<string, unknown> = {
      ...existing,
      cwd: workspaceRoot,
      basePath: config.basePath,
      platform: normalizePlatforms(config.platform),
      version: config.version,
      createbase: config.createbase ?? false,
      build: config.build ?? false,
      debugLevel: config.debugLevel ?? 'release',
      os: config.os ?? 'sylixos',
    };

    if (config.customRepo?.trim()) {
      nextConfig.customRepo = config.customRepo.trim();
    } else {
      delete nextConfig.customRepo;
    }

    if (config.customBranch?.trim()) {
      nextConfig.customBranch = config.customBranch.trim();
    } else {
      delete nextConfig.customBranch;
    }

    if (config.researchBranch?.trim()) {
      nextConfig.researchBranch = config.researchBranch.trim();
    } else {
      delete nextConfig.researchBranch;
    }

    if (config.arm64PageShift !== undefined) {
      nextConfig.arm64PageShift = config.arm64PageShift;
    } else {
      delete nextConfig.arm64PageShift;
    }

    const normalizedBaseComponents = normalizeBaseComponents(config.baseComponents);
    if (normalizedBaseComponents?.length) {
      nextConfig.baseComponents = normalizedBaseComponents;
    } else {
      delete nextConfig.baseComponents;
    }

    writeFileSync(workspaceConfigPath, JSON.stringify(nextConfig, null, 2), 'utf-8');
  } catch {
    // workspace.json 同步失败不影响主流程。
  }
}

async function cloneLibsylixosForWorkspace(
  config: WorkspaceInitOptions,
  progressReporter: ProgressReporter
): Promise<RlCommandResult> {
  const cloneRepo = config.version === 'research' ? RESEARCH_REPO : config.customRepo?.trim();
  const cloneBranch = config.customBranch?.trim() || config.researchBranch?.trim() || 'master';

  if (!cloneRepo) {
    return {
      success: false,
      error: '缺少 libsylixos 仓库地址',
      fixSuggestion: 'custom 版本请提供 customRepo，research 版本请检查默认仓库配置',
    };
  }

  const libsylixosPath = join(config.basePath, 'libsylixos');
  if (existsSync(libsylixosPath)) {
    rmSync(libsylixosPath, { recursive: true, force: true });
  }

  mkdirSync(config.basePath, { recursive: true });
  const cloneResult = await executeRlCommand(
    'git',
    ['clone', '-b', cloneBranch, cloneRepo, 'libsylixos'],
    progressReporter,
    config.basePath,
    300_000,
  );

  if (!cloneResult.success) {
    return {
      ...cloneResult,
      error: `clone libsylixos 仓库失败: ${cloneResult.error ?? '未知错误'}`,
    };
  }

  return cloneResult;
}

async function buildBaseAfterWorkspace(
  config: WorkspaceInitOptions,
  progressReporter: ProgressReporter
): Promise<RlCommandResult> {
  const baseMakefilePath = join(config.basePath, 'Makefile');
  if (!existsSync(baseMakefilePath)) {
    return {
      success: false,
      error: `未找到 base Makefile: ${baseMakefilePath}`,
      fixSuggestion: '请确认 base 已构造完成，再执行 make all 编译',
    };
  }

  progressReporter.emit('step', { name: '编译 Base', progress: 0 });
  const result = await executeRlCommand('make', ['all'], progressReporter, config.basePath, null);
  if (result.success) {
    progressReporter.emit('step', { name: '编译 Base', progress: 100 });
  }
  return result;
}

function canContinueWorkspacePostSteps(config: WorkspaceInitOptions): boolean {
  return existsSync(join(config.cwd, '.realevo')) || existsSync(join(config.basePath, 'Makefile'));
}

function combineWorkspaceInitResults(
  bootstrapResult: RlCommandResult,
  bootstrapError: string | undefined,
  baseBuildResult?: RlCommandResult
): RlCommandResult {
  if (bootstrapError && baseBuildResult && !baseBuildResult.success) {
    return {
      success: false,
      error: `${bootstrapError}；base 编译失败: ${baseBuildResult.error ?? '未知错误'}`,
      stdout: [bootstrapResult.stdout, baseBuildResult.stdout].filter(Boolean).join('\n'),
      stderr: [bootstrapResult.stderr, baseBuildResult.stderr].filter(Boolean).join('\n'),
      fixSuggestion: baseBuildResult.fixSuggestion ?? bootstrapResult.fixSuggestion,
    };
  }

  if (bootstrapError) {
    if (baseBuildResult === undefined) {
      return {
        success: false,
        error: bootstrapError,
        stdout: bootstrapResult.stdout,
        stderr: bootstrapResult.stderr,
        fixSuggestion: bootstrapResult.fixSuggestion,
      };
    }
    return {
      success: false,
      error: `${bootstrapError}（已继续执行 base 编译${baseBuildResult.success ? '并成功' : ''}）`,
      stdout: [bootstrapResult.stdout, baseBuildResult.stdout].filter(Boolean).join('\n'),
      stderr: [bootstrapResult.stderr, baseBuildResult.stderr].filter(Boolean).join('\n'),
      fixSuggestion: bootstrapResult.fixSuggestion,
    };
  }

  return {
    success: false,
    error: `base 编译失败: ${baseBuildResult?.error ?? '未知错误'}`,
    stdout: baseBuildResult?.stdout,
    stderr: baseBuildResult?.stderr,
    fixSuggestion: baseBuildResult?.fixSuggestion,
  };
}

export function applyArm64PageShiftToBase(
  config: Pick<WorkspaceInitOptions, 'basePath' | 'platform' | 'arm64PageShift'>,
  options?: { strict?: boolean }
): boolean {
  if (config.arm64PageShift === undefined || !hasArm64Platform(config.platform)) {
    return false;
  }

  const headerPath = join(config.basePath, 'libsylixos', 'SylixOS', 'config', 'cpu', 'cpu_cfg_arm64.h');
  if (!existsSync(headerPath)) {
    if (options?.strict) {
      throw new Error(`未找到 ARM64 配置头文件: ${headerPath}`);
    }
    return false;
  }

  const content = readFileSync(headerPath, 'utf-8');
  const match = content.match(/^(\s*#\s*define\s+LW_CFG_ARM64_PAGE_SHIFT\s+)(\d+)(\b.*)$/m);
  if (!match) {
    if (options?.strict) {
      throw new Error(`未找到 LW_CFG_ARM64_PAGE_SHIFT 宏: ${headerPath}`);
    }
    return false;
  }

  if (match[2] === String(config.arm64PageShift)) {
    return false;
  }

  const nextContent = content.replace(
    /^(\s*#\s*define\s+LW_CFG_ARM64_PAGE_SHIFT\s+)\d+(\b.*)$/m,
    `$1${config.arm64PageShift}$2`
  );
  writeFileSync(headerPath, nextContent, 'utf-8');
  return true;
}

export function applyBaseComponentsToBase(
  config: Pick<WorkspaceInitOptions, 'basePath' | 'baseComponents'>,
  options?: { strict?: boolean }
): boolean {
  const selectedComponents = normalizeBaseComponents(config.baseComponents);
  if (!selectedComponents?.length) {
    return false;
  }

  const makefilePath = join(config.basePath, 'Makefile');
  if (!existsSync(makefilePath)) {
    if (options?.strict) {
      throw new Error(`未找到 base Makefile: ${makefilePath}`);
    }
    return false;
  }

  const content = readFileSync(makefilePath, 'utf-8');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const componentsBlockRange = findBaseComponentsBlock(lines);

  if (!componentsBlockRange) {
    if (options?.strict) {
      throw new Error(`未找到 Makefile 中的 COMPONENTS 变量: ${makefilePath}`);
    }
    return false;
  }

  const availableComponents = extractBaseComponents(lines.slice(componentsBlockRange.start, componentsBlockRange.end));
  if (availableComponents.length === 0) {
    if (options?.strict) {
      throw new Error(`未解析到 base 默认组件列表: ${makefilePath}`);
    }
    return false;
  }

  const availableSet = new Set(availableComponents);
  const missingRequired = REQUIRED_BASE_COMPONENTS.filter((component) => !selectedComponents.includes(component));
  if (missingRequired.length > 0) {
    throw new Error(`Base 组件必须包含: ${missingRequired.join(', ')}`);
  }

  const missingComponents = selectedComponents.filter((component) => !availableSet.has(component));
  if (missingComponents.length > 0) {
    const availableText = availableComponents.join(', ');
    throw new Error(`未找到 base 组件: ${missingComponents.join(', ')}；可选组件: ${availableText}`);
  }

  const enabledComponents = availableComponents.filter((component) => selectedComponents.includes(component));
  const disabledComponents = availableComponents.filter((component) => !selectedComponents.includes(component));
  const nextBlock = buildBaseComponentsBlock(enabledComponents, disabledComponents);
  const nextLines = [
    ...lines.slice(0, componentsBlockRange.start),
    ...nextBlock,
    ...lines.slice(componentsBlockRange.end),
  ];
  const nextContent = nextLines.join(eol);

  if (nextContent === content) {
    return false;
  }

  writeFileSync(makefilePath, nextContent, 'utf-8');
  return true;
}

function normalizePlatforms(platforms: unknown): string[] {
  if (typeof platforms === 'string') {
    return platforms
      .split(/[:,]/)
      .map((platform) => platform.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(platforms)) {
    return [];
  }

  const deduped = new Set<string>();
  for (const platform of platforms) {
    if (typeof platform !== 'string') continue;
    const normalized = platform.trim();
    if (!normalized) continue;
    deduped.add(normalized);
  }
  return [...deduped];
}

function hasArm64Platform(platforms: unknown): boolean {
  return normalizePlatforms(platforms).some((platform) => platform.startsWith('ARM64_'));
}

function normalizeBaseComponents(baseComponents: unknown): string[] | undefined {
  if (!Array.isArray(baseComponents)) {
    return undefined;
  }

  const deduped = new Set<string>();
  for (const component of baseComponents) {
    if (typeof component !== 'string') continue;
    const normalized = component.trim();
    if (!normalized) continue;
    deduped.add(normalized);
  }

  return deduped.size > 0 ? [...deduped] : undefined;
}

function findBaseComponentsBlock(lines: string[]): { start: number; end: number } | undefined {
  const start = lines.findIndex((line) => /^\s*COMPONENTS\s*:=/.test(line));
  if (start < 0) {
    return undefined;
  }

  let end = start + 1;
  while (end < lines.length && lines[end].trim() !== '') {
    end++;
  }

  return { start, end };
}

function extractBaseComponents(lines: string[]): string[] {
  const components: string[] = [];
  const seen = new Set<string>();

  for (const [index, rawLine] of lines.entries()) {
    const line = index === 0
      ? rawLine.replace(/^\s*COMPONENTS\s*:=\s*/, '')
      : rawLine;
    const cleaned = line
      .replace(/^\s*#\s*/, '')
      .replace(/\s*\\\s*$/, '')
      .trim();

    if (!cleaned) {
      continue;
    }

    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length === 0 || tokens.some((token) => !/^[A-Za-z0-9_./-]+$/.test(token))) {
      continue;
    }

    for (const token of tokens) {
      if (seen.has(token)) {
        continue;
      }
      seen.add(token);
      components.push(token);
    }
  }

  return components;
}

function buildBaseComponentsBlock(enabledComponents: string[], disabledComponents: string[]): string[] {
  const lines = ['COMPONENTS :=  \\'];

  enabledComponents.forEach((component, index) => {
    const suffix = index === enabledComponents.length - 1 ? '' : ' \\';
    lines.push(`${component}${suffix}`);
  });

  disabledComponents.forEach((component) => {
    lines.push(`# ${component}`);
  });

  return lines;
}

/** 对单个 mk 文件内容应用 jobserver patch，返回 patch 后内容（未变化则返回原内容） */
function applyJobserverPatch(content: string): string {
  let next = content;

  // 1. 多平台 foreach recipe：\t@$(foreach ...,make → \t+@$(foreach ...,$( MAKE)
  next = next.replace(
    /^(\t)(@\$\(foreach [^,]+,[^,]+,)make\b/gm,
    '$1+$2$(MAKE)'
  );

  // 2. 单平台 foreach recipe：\t@$(foreach ...,$(foreach ..., make → 加 + 并替换 make
  next = next.replace(
    /^(\t)(@\$\(foreach [^,]+,[^,]+,\$\(foreach [^,]+,[^,]+,\s*)make\b/gm,
    '$1+$2$(MAKE)'
  );

  // 3. 单平台 for 循环 recipe：\t@for ... do make → \t+@for ... do $(MAKE)
  next = next.replace(
    /^(\t)(@for .+do )make\b/gm,
    '$1+$2$(MAKE)'
  );

  // 4. 单平台 SDK recipe：\tmake all/clean -j → \t$(MAKE) all/clean
  next = next.replace(
    /^\tmake (all|clean)[ \t]+-j\d*[ \t]*$/gm,
    '\t$(MAKE) $1'
  );

  return next;
}

/**
 * 修补 base 的 Makefile 和 multi-platform.mk，使 make jobserver 能正常传递并行度。
 */
export function patchBaseMultiPlatformMk(basePath: string): boolean {
  const targets = [
    join(basePath, 'Makefile'),
    join(basePath, 'libsylixos', 'SylixOS', 'mktemp', 'multi-platform.mk'),
  ];

  let anyChanged = false;
  for (const mkPath of targets) {
    if (!existsSync(mkPath)) continue;
    const content = readFileSync(mkPath, 'utf-8');
    const next = applyJobserverPatch(content);
    if (next !== content) {
      writeFileSync(mkPath, next, 'utf-8');
      anyChanged = true;
    }
  }

  return anyChanged;
}

function appendPlatformsLine(content: string, platformsLine: string): string {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  if (content.length === 0) {
    return `${platformsLine}${eol}`;
  }
  return content.endsWith('\n')
    ? `${content}${platformsLine}${eol}`
    : `${content}${eol}${platformsLine}${eol}`;
}
