import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { getRemoteDefaultBranch, remoteBranchExists } from '../utils/git.js';

/** Calculate terminal display width (CJK chars = 2 columns) */
function strWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    // CJK Unified Ideographs + common fullwidth ranges
    w += (code >= 0x2E80 && code <= 0x9FFF) || (code >= 0xF900 && code <= 0xFAFF) || (code >= 0xFE30 && code <= 0xFE4F) || (code >= 0xFF00 && code <= 0xFF60) || (code >= 0x20000 && code <= 0x2FA1F) ? 2 : 1;
  }
  return w;
}

/** padEnd that respects CJK display width, truncates with ellipsis if too long */
function padEndW(s: string, width: number): string {
  const w = strWidth(s);
  if (w >= width) {
    let truncated = '';
    let tw = 0;
    for (const ch of s) {
      const cw = (ch.codePointAt(0)! >= 0x2E80 && ch.codePointAt(0)! <= 0x9FFF) || (ch.codePointAt(0)! >= 0xF900 && ch.codePointAt(0)! <= 0xFAFF) || (ch.codePointAt(0)! >= 0xFE30 && ch.codePointAt(0)! <= 0xFE4F) || (ch.codePointAt(0)! >= 0xFF00 && ch.codePointAt(0)! <= 0xFF60) || (ch.codePointAt(0)! >= 0x20000 && ch.codePointAt(0)! <= 0x2FA1F) ? 2 : 1;
      if (tw + cw > width - 2) break;
      truncated += ch;
      tw += cw;
    }
    return truncated + '…' + ' '.repeat(Math.max(0, width - tw - 1));
  }
  return s + ' '.repeat(width - w);
}

import { TemplateManager } from '@sydev/core/template-manager.js';
import { ConfigManager } from '@sydev/core/config-manager.js';
import { ConfigReader } from '@sydev/core/config-reader.js';
import { WorkspaceScanner } from '@sydev/core/workspace-scanner.js';
import { RlWrapper } from '@sydev/core/rl-wrapper.js';
import { InitOrchestrator } from '@sydev/core/init-orchestrator.js';
import { DEFAULT_PLATFORM, PLATFORMS } from '@sydev/core/constants.js';
import { fullConfigSchema } from '@sydev/core/schemas/index.js';
import type { TemplateType } from '@sydev/core/template-manager.js';
import type { FullConfig } from '@sydev/core/schemas/index.js';
import { createCliProgressReporter } from '../utils/cli-progress.js';
import { loadDevices } from '../helpers/device-loader.js';

const TEMPLATE_TYPES: { name: string; value: TemplateType }[] = [
  { name: 'workspace - 环境模板', value: 'workspace' },
  { name: 'project - 项目模板', value: 'project' },
  { name: 'device - 设备模板', value: 'device' },
  { name: 'full - 全流程模板', value: 'full' },
];

/** Get global template directory */
function getGlobalTemplateDir(): string {
  return join(homedir(), '.sydev');
}

type TemplateContent = { type: TemplateType; data: any };
type ApplyCommandOptions = { cwd?: string; basePath?: string; yes?: boolean };

function detectTemplateContent(parsed: any): TemplateContent {
  if (parsed.type && ['workspace', 'project', 'device'].includes(parsed.type)) {
    const detectedType = parsed.type as TemplateType;
    const templateData = parsed[detectedType];
    if (!templateData) {
      throw new Error(`文件中缺少 ${detectedType} 字段`);
    }
    return { type: detectedType, data: templateData };
  }

  if (parsed.type === 'full') {
    const templateData = parsed.data || parsed.full;
    if (!templateData) {
      throw new Error('文件中缺少 data 或 full 字段');
    }
    return { type: 'full', data: templateData };
  }

  if (parsed.workspace) {
    return { type: 'full', data: parsed };
  }

  throw new Error('无法识别配置类型，文件需包含 type 字段或 workspace 字段');
}

function loadTemplateContentFromFile(file: string): TemplateContent {
  let json: string;
  try {
    json = readFileSync(file, 'utf-8');
  } catch {
    throw new Error(`无法读取文件: ${file}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('文件不是有效的 JSON');
  }

  return detectTemplateContent(parsed);
}

async function resolveApplyPaths(opts: ApplyCommandOptions): Promise<{ cwd: string; basePath: string }> {
  let cwd = opts.cwd?.trim();
  if (!cwd) {
    if (opts.yes) {
      cwd = process.cwd();
    } else {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'cwd', message: 'Workspace 路径:', default: process.cwd() },
      ]);
      cwd = answers.cwd.trim();
    }
  }

  let basePath = opts.basePath?.trim();
  if (!basePath) {
    const defaultBasePath = `${cwd}/.realevo/base`;
    if (opts.yes) {
      basePath = defaultBasePath;
    } else {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'basePath', message: 'Base 目录路径:', default: defaultBasePath },
      ]);
      basePath = answers.basePath.trim();
    }
  }

  return { cwd: cwd!, basePath: basePath! };
}

export const templateCommand = new Command('template')
  .description('管理配置模板')
  .addHelpText('after', `
示例:
  $ sydev template create              # 创建配置模板
  $ sydev template list                # 查看所有模板
  $ sydev template show <id>           # 查看模板详细配置
  $ sydev template apply <id>          # 从模板初始化环境（交互模式）
  $ sydev template apply config.json   # 从 JSON 文件应用（交互模式）
  $ sydev template apply config.json -y                    # 从 JSON 文件应用（非交互）
  $ sydev template apply <id> --cwd /path/to/ws -y         # 指定路径，跳过提示
  $ sydev template apply config.json --cwd /ws --base-path /base -y
  $ sydev template delete <id>         # 删除模板
  $ sydev template export              # 从当前 workspace 导出配置
  $ sydev template import <f>          # 从 JSON 文件导入配置
`);

// --- template create ---
templateCommand
  .command('create')
  .description('创建配置模板并保存到全局模板库')
  .action(async () => {
    const tm = new TemplateManager(getGlobalTemplateDir());

    const base = await inquirer.prompt([
      { type: 'input', name: 'name', message: '模板名称:', validate: (v: string) => v.trim() ? true : '名称不能为空' },
      { type: 'input', name: 'description', message: '模板描述:', default: '' },
      { type: 'list', name: 'type', message: '模板类型:', choices: TEMPLATE_TYPES },
    ]);
    const content = await collectContent(base.type);
    const id = TemplateManager.slugify(base.name);

    if (tm.exists(id)) {
      const { action } = await inquirer.prompt([{
        type: 'list', name: 'action', message: `模板 "${id}" 已存在:`,
        choices: [
          { name: '覆盖', value: 'overwrite' },
          { name: '重命名', value: 'rename' },
          { name: '取消', value: 'cancel' },
        ],
      }]);
      if (action === 'cancel') { console.log(chalk.yellow('已取消')); return; }
      if (action === 'rename') {
        const { newName } = await inquirer.prompt([
          { type: 'input', name: 'newName', message: '新名称:', validate: (v: string) => v.trim() ? true : '名称不能为空' },
        ]);
        base.name = newName;
      }
    }

    try {
      const meta = tm.save(base.name, base.description, base.type, content);
      console.log(chalk.green(`\n✓ 模板已创建: ${meta.id} (${meta.type})`));
    } catch (err: any) {
      console.error(chalk.red(`\n✗ 创建失败: ${err.message}`));
    }
  });

// --- template list ---
templateCommand
  .command('list')
  .description('查看所有模板')
  .option('-t, --type <type>', '按类型过滤 (workspace/project/device/full)')
  .action(async (opts) => {
    const tm = new TemplateManager(getGlobalTemplateDir());
    const templates = tm.list(opts.type);

    if (templates.length === 0) {
      console.log(chalk.dim('  暂无模板，运行 sydev template create 创建'));
      return;
    }

    console.log(chalk.bold(`\n共 ${templates.length} 个模板:\n`));
    console.log(
      chalk.dim('  ' + padEndW('ID', 24) + padEndW('名称', 20) + padEndW('类型', 12) + '更新时间')
    );
    console.log(chalk.dim('  ' + '-'.repeat(70)));
    for (const t of templates) {
      const date = new Date(t.updatedAt).toLocaleString('zh-CN');
      console.log(`  ${chalk.green(padEndW(t.id, 24))}${padEndW(t.name, 20)}${padEndW(t.type, 12)}${chalk.dim(date)}`);
    }
    console.log();
  });
// --- template show <id> ---
templateCommand
  .command('show <id>')
  .description('查看模板详细配置')
  .action(async (id: string) => {
    const tm = new TemplateManager(getGlobalTemplateDir());

    let loaded;
    try {
      loaded = tm.load(id);
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      return;
    }

    const { meta, content } = loaded;
    const templateContent = content as { type: string; data: any };

    console.log(chalk.bold(`\n模板: ${meta.name}`));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(`  ID:       ${chalk.green(meta.id)}`);
    console.log(`  类型:     ${meta.type}`);
    if (meta.description) console.log(`  描述:     ${meta.description}`);
    console.log(`  创建时间: ${chalk.dim(new Date(meta.createdAt).toLocaleString('zh-CN'))}`);
    console.log(`  更新时间: ${chalk.dim(new Date(meta.updatedAt).toLocaleString('zh-CN'))}`);

    const data = templateContent.data;

    if (data.workspace || templateContent.type === 'workspace') {
      const ws = data.workspace || data;
      console.log(chalk.cyan('\n  ◆ Workspace'));
      if (ws.platform) console.log(`    平台:     ${Array.isArray(ws.platform) ? ws.platform.join(', ') : ws.platform}`);
      if (ws.version) console.log(`    版本:     ${ws.version}`);
      if (ws.debugLevel) console.log(`    调试级别: ${ws.debugLevel}`);
      if (ws.os) console.log(`    操作系统: ${ws.os}`);
      if (ws.createbase !== undefined) console.log(`    创建 Base: ${ws.createbase ? '是' : '否'}`);
      if (ws.build !== undefined) console.log(`    编译 Base: ${ws.build ? '是' : '否'}`);
    }

    const projects = data.projects || (templateContent.type === 'project' ? [data] : []);
    if (projects.length) {
      console.log(chalk.cyan(`\n  ◆ 项目 (${projects.length})`));
      for (const p of projects) {
        console.log(`    ${chalk.green(p.name || '(未命名)')}`);
        if (p.source) console.log(`      来源:     ${p.source}${p.branch ? ` (${p.branch})` : ''}`);
        if (p.template) console.log(`      模板:     ${p.template}`);
        if (p.type) console.log(`      构建类型: ${p.type}`);
        if (p.debugLevel) console.log(`      调试级别: ${p.debugLevel}`);
        if (p.makeTool) console.log(`      构建工具: ${p.makeTool}`);
      }
    }

    const devices = data.devices || (templateContent.type === 'device' ? [data] : []);
    if (devices.length) {
      console.log(chalk.cyan(`\n  ◆ 设备 (${devices.length})`));
      for (const d of devices) {
        console.log(`    ${chalk.green(d.name || '(未命名)')}`);
        if (d.ip) console.log(`      IP:     ${d.ip}`);
        if (d.platform) console.log(`      平台:   ${Array.isArray(d.platform) ? d.platform.join(', ') : d.platform}`);
        if (d.username) console.log(`      用户:   ${d.username}`);
        const ports = [d.ssh && `SSH:${d.ssh}`, d.telnet && `Telnet:${d.telnet}`, d.ftp && `FTP:${d.ftp}`, d.gdb && `GDB:${d.gdb}`].filter(Boolean);
        if (ports.length) console.log(`      端口:   ${ports.join('  ')}`);
      }
    }

    console.log();
  });

// --- template apply <source> ---
templateCommand
  .command('apply <source>')
  .description('从模板或 JSON 配置初始化环境')
  .option('--cwd <path>', 'Workspace 路径')
  .option('--base-path <path>', 'Base 目录路径')
  .option('-y, --yes', '跳过所有交互提示（全选 + 错误时继续）')
  .addHelpText('after', `
示例:
  $ sydev template apply my-template
  $ sydev template apply config.json
  $ sydev template apply config.json --cwd /path/to/ws --base-path /path/to/base -y
  $ sydev template apply my-template --cwd /path/to/ws
`)
  .action(async (source: string, opts: ApplyCommandOptions) => {
    const tm = new TemplateManager(getGlobalTemplateDir());

    let templateContent: TemplateContent;
    let sourceLabel: string;
    try {
      if (source.endsWith('.json') || existsSync(source)) {
        templateContent = loadTemplateContentFromFile(source);
        sourceLabel = `${source} (${templateContent.type})`;
      } else {
        const loaded = tm.load(source);
        templateContent = loaded.content as TemplateContent;
        sourceLabel = `${loaded.meta.name} (${loaded.meta.type})`;
      }
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      return;
    }

    console.log(chalk.cyan(`\n应用模板: ${sourceLabel}\n`));

    const { cwd, basePath } = await resolveApplyPaths(opts);

    let config: Partial<FullConfig>;

    if (templateContent.type === 'full') {
      // full 模板支持部分应用
      const fullData = templateContent.data as FullConfig;
      const parts: string[] = ['workspace'];
      if (fullData.projects?.length) {
        fullData.projects.forEach((p) => parts.push(`project:${p.name}`));
      }
      if (fullData.devices?.length) {
        fullData.devices.forEach((d) => parts.push(`device:${d.name}`));
      }

      const selected = opts.yes
        ? parts
        : (await inquirer.prompt<{ selected: string[] }>([{
            type: 'checkbox', name: 'selected', message: '选择要应用的部分:',
            choices: parts.map((p) => ({ name: p, value: p, checked: true })),
          }] as any)).selected;

      config = { schemaVersion: 1 } as any;
      if (selected.includes('workspace')) {
        (config as any).workspace = { ...fullData.workspace, cwd, basePath };
      }
      const selProjects = (fullData.projects ?? []).filter(
        (p) => selected.includes(`project:${p.name}`)
      );
      if (selProjects.length) config.projects = selProjects;
      const selDevices = (fullData.devices ?? []).filter(
        (d) => selected.includes(`device:${d.name}`)
      );
      if (selDevices.length) config.devices = selDevices;

      if (!(config as any).workspace) {
        console.error(chalk.red('✗ 必须包含 workspace 配置'));
        return;
      }
    } else if (templateContent.type === 'workspace') {
      config = { schemaVersion: 1, workspace: { ...templateContent.data, cwd, basePath } } as any;
    } else if (templateContent.type === 'project') {
      console.error(chalk.yellow('⚠ project 模板需要在已有 workspace 中使用，请提供 workspace 配置'));
      return;
    } else {
      console.error(chalk.yellow('⚠ device 模板需要在已有 workspace 中使用，请提供 workspace 配置'));
      return;
    }
    // 验证配置
    const validation = ConfigManager.validate(fullConfigSchema, config);
    if (!validation.valid) {
      console.error(chalk.red('✗ 模板配置验证失败:'));
      validation.errors?.forEach((e) => console.error(chalk.yellow(`  - ${e}`)));
      return;
    }

    const progressReporter = createCliProgressReporter();
    const rlWrapper = new RlWrapper(progressReporter);
    const orchestrator = new InitOrchestrator(rlWrapper, progressReporter);

    console.log(chalk.cyan('开始应用模板...\n'));
    const result = await orchestrator.execute(config, {
      onStepError: async (step, error) => {
        console.error(chalk.red(`\n✗ ${step} 失败: ${error}`));
        if (opts.yes) {
          return true;
        }
        const { shouldContinue } = await inquirer.prompt([
          { type: 'confirm', name: 'shouldContinue', message: '是否继续执行后续步骤?', default: true },
        ]);
        return shouldContinue;
      },
    });

    if (result.success) {
      console.log(chalk.bold.green('\n✓ 模板应用成功!'));
      result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
    } else {
      if (result.failedSteps.length) {
        console.log(chalk.yellow('\n失败的步骤:'));
        result.failedSteps.forEach((f) => console.log(chalk.red(`  ✗ ${f.step}: ${f.error}`)));
      }
      if (result.completedSteps.length) {
        console.log(chalk.green('已完成的步骤:'));
        result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
      }
    }

    progressReporter.removeAllListeners();
  });

// --- template delete <id> ---
templateCommand
  .command('delete <id>')
  .description('删除模板')
  .action(async (id: string) => {
    const tm = new TemplateManager(getGlobalTemplateDir());

    if (!tm.exists(id)) {
      console.error(chalk.red(`✗ 模板 "${id}" 不存在`));
      return;
    }

    const { confirm } = await inquirer.prompt([
      { type: 'confirm', name: 'confirm', message: `确认删除模板 "${id}"?`, default: false },
    ]);

    if (!confirm) { console.log(chalk.yellow('已取消')); return; }

    try {
      tm.delete(id);
      console.log(chalk.green(`✓ 模板 "${id}" 已删除`));
    } catch (err: any) {
      console.error(chalk.red(`✗ 删除失败: ${err.message}`));
    }
  });
// --- template export ---
templateCommand
  .command('export')
  .description('从当前 workspace 导出完整配置为 JSON 文件')
  .option('-o, --output <file>', '输出文件路径', 'sydev-config.json')
  .option('-d, --dir <path>', 'Workspace 路径', process.cwd())
  .action(async (opts) => {
    const wsRoot = opts.dir;

    // 1. 读取 workspace 配置（优先 workspace.json，回退到 config.json）
    const reader = new ConfigReader(wsRoot);
    const wsStatus = reader.getWorkspaceStatus();

    let wsConfig: { platform: string[]; version: string; debugLevel: string; os: string; createbase?: boolean; build?: boolean };

    if (wsStatus.configured && wsStatus.config) {
      wsConfig = wsStatus.config;
    } else {
      // 尝试从 RealEvo-Stream 的 config.json 读取
      const configPath = join(wsRoot, '.realevo', 'config.json');
      if (!existsSync(configPath)) {
        console.error(chalk.red('✗ 当前目录不是有效的 sydev workspace'));
        console.error(chalk.dim('  请在 workspace 根目录下运行，或使用 -d 指定路径'));
        return;
      }

      try {
        const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
        // 转换 base_type → version: "SylixOS_LTS_3.6.5" → "lts_3.6.5", "SylixOS_ECS_3.6.5" → "ecs_3.6.5"
        let version = 'default';
        if (raw.base_type) {
          const bt = raw.base_type.toLowerCase();
          if (bt.includes('lts') && bt.includes('compiled')) version = 'lts_3.6.5_compiled';
          else if (bt.includes('lts')) version = 'lts_3.6.5';
          else if (bt.includes('ecs')) version = 'ecs_3.6.5';
          else if (bt.includes('research')) version = 'research';
        }

        wsConfig = {
          platform: raw.platforms || ['ARM64_GENERIC'],
          version,
          debugLevel: raw.debug_level || 'release',
          os: raw.linux_source && raw.linux_source !== 'custom' ? 'linux' : 'sylixos',
        };
      } catch {
        console.error(chalk.red('✗ 无法解析 .realevo/config.json'));
        return;
      }
    }

    console.log(chalk.cyan('\n◆ 检测到 Workspace 配置'));
    console.log(`  平台:     ${wsConfig.platform.join(', ')}`);
    console.log(`  版本:     ${wsConfig.version}`);
    console.log(`  调试级别: ${wsConfig.debugLevel}`);
    console.log(`  操作系统: ${wsConfig.os}`);

    // 2. 扫描项目
    const scanner = new WorkspaceScanner(wsRoot);
    const scannedProjects = scanner.scan();
    const savedProjects = reader.getProjects();

    // 合并：以 savedProjects 的详细信息为主，scannedProjects 补充未记录的项目
    const savedMap = new Map(savedProjects.map(p => [p.name, p]));
    const projects: any[] = [];

    for (const sp of scannedProjects) {
      const saved = savedMap.get(sp.name);
      if (saved) {
        projects.push(saved);
        savedMap.delete(sp.name);
      } else {
        // 尝试从 git 获取 source 和 branch
        const proj: any = { name: sp.name, makeTool: 'make' as const };
        try {
          const remote = execSync('git remote get-url origin', { cwd: sp.path, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          if (remote) proj.source = remote;
        } catch {}
        try {
          const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: sp.path, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          if (branch && branch !== 'HEAD') proj.branch = branch;
        } catch {}
        projects.push(proj);
      }
    }

    if (projects.length > 0) {
      console.log(chalk.cyan(`\n◆ 检测到 ${projects.length} 个项目`));
      for (const p of projects) {
        const info = [
          p.source && `来源: ${p.source}`,
          p.template && `模板: ${p.template}`,
          p.type && `类型: ${p.type}`,
        ].filter(Boolean).join(', ');
        console.log(`  ${chalk.green(p.name)}${info ? chalk.dim(` (${info})`) : ''}`);
      }
    } else {
      console.log(chalk.dim('\n  未检测到项目'));
    }

    // 3. 加载设备
    const devices = loadDevices(wsRoot);

    if (devices.length > 0) {
      console.log(chalk.cyan(`\n◆ 检测到 ${devices.length} 个设备`));
      for (const d of devices) {
        console.log(`  ${chalk.green(d.name)} - ${d.ip} (${d.platform.join(', ')})`);
      }
    } else {
      console.log(chalk.dim('\n  未检测到设备'));
    }

    // 4. 用户确认
    console.log();
    const { confirmExport } = await inquirer.prompt([
      { type: 'confirm', name: 'confirmExport', message: '确认导出以上配置?', default: true },
    ]);

    if (!confirmExport) {
      console.log(chalk.yellow('已取消'));
      return;
    }

    // 5. 询问是否调整 workspace 参数（createbase/build 在导出时通常不需要）
    const { adjustWs } = await inquirer.prompt([
      { type: 'confirm', name: 'adjustWs', message: '是否调整 workspace 导出参数?', default: false },
    ]);

    let exportWs: any = {
      platform: wsConfig.platform,
      version: wsConfig.version,
      debugLevel: wsConfig.debugLevel,
      os: wsConfig.os,
      createbase: wsConfig.createbase ?? true,
      build: wsConfig.build ?? false,
    };

    if (adjustWs) {
      const adjusted = await inquirer.prompt([
        { type: 'confirm', name: 'createbase', message: '创建新 Base?', default: exportWs.createbase },
        { type: 'confirm', name: 'build', message: '编译 Base?', default: exportWs.build },
        { type: 'list', name: 'debugLevel', message: '调试级别:', choices: ['release', 'debug'], default: exportWs.debugLevel },
      ]);
      exportWs = { ...exportWs, ...adjusted };
    }

    // 6. 组装并导出
    const exportData: any = {
      schemaVersion: 1,
      workspace: exportWs,
      ...(projects.length ? { projects } : {}),
      ...(devices.length ? { devices: devices.map(d => ({ name: d.name, ip: d.ip, platform: d.platform, username: d.username, ...(d.password ? { password: d.password } : {}), ssh: d.ssh, telnet: d.telnet, ftp: d.ftp, gdb: d.gdb })) } : {}),
    };

    const json = ConfigManager.exportToJson(exportData);
    writeFileSync(opts.output, json, 'utf-8');
    console.log(chalk.green(`\n✓ 配置已导出到 ${opts.output}`));

    // 7. 询问是否同时保存为模板
    const { saveAsTemplate } = await inquirer.prompt([
      { type: 'confirm', name: 'saveAsTemplate', message: '是否同时保存为全局模板?', default: false },
    ]);

    if (saveAsTemplate) {
      const { name, description } = await inquirer.prompt([
        { type: 'input', name: 'name', message: '模板名称:', validate: (v: string) => v.trim() ? true : '名称不能为空' },
        { type: 'input', name: 'description', message: '模板描述:', default: '' },
      ]);

      const tm = new TemplateManager(getGlobalTemplateDir());
      try {
        const templateData = { workspace: exportWs, ...(projects.length ? { projects } : {}), ...(devices.length ? { devices } : {}) };
        const meta = tm.save(name, description, 'full', templateData);
        console.log(chalk.green(`✓ 已保存为模板: ${meta.id}`));
      } catch (err: any) {
        console.error(chalk.red(`✗ 保存模板失败: ${err.message}`));
      }
    }
  });

// --- template import <file> ---
templateCommand
  .command('import <file>')
  .description('从 JSON 文件导入配置')
  .option('-y, --yes', '跳过交互提示，直接导入不保存为模板')
  .action(async (file: string, opts: { yes?: boolean }) => {
    let detectedType: TemplateType;
    let templateData: any;
    try {
      const detected = loadTemplateContentFromFile(file);
      detectedType = detected.type;
      templateData = detected.data;
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`));
      return;
    }

    console.log(chalk.green(`✓ 检测到 ${detectedType} 类型配置`));

    if (!opts.yes) {
      const { saveAsTemplate } = await inquirer.prompt([
        { type: 'confirm', name: 'saveAsTemplate', message: '是否保存为模板?', default: true },
      ]);

      if (saveAsTemplate) {
        const { name, description } = await inquirer.prompt([
          { type: 'input', name: 'name', message: '模板名称:', validate: (v: string) => v.trim() ? true : '名称不能为空' },
          { type: 'input', name: 'description', message: '模板描述:', default: '' },
        ]);

        const tm = new TemplateManager(getGlobalTemplateDir());
        try {
          const meta = tm.save(name, description, detectedType, templateData);
          console.log(chalk.green(`✓ 已保存为模板: ${meta.id} (${meta.type})`));
        } catch (err: any) {
          console.error(chalk.red(`✗ 保存失败: ${err.message}`));
        }
      }
    }
  });
// --- Content collection helpers ---

async function collectWorkspace() {
  return inquirer.prompt([
    { type: 'checkbox', name: 'platform', message: '目标平台 (多选):', choices: PLATFORMS, default: [DEFAULT_PLATFORM], validate: (v: string[]) => v.length > 0 ? true : '至少选择一个平台' },
    { type: 'list', name: 'version', message: 'Base 版本:', choices: ['default', 'ecs_3.6.5', 'lts_3.6.5', 'lts_3.6.5_compiled', 'research', 'custom'], default: 'default' },
    { type: 'list', name: 'debugLevel', message: '调试级别:', choices: ['release', 'debug'], default: 'release' },
    { type: 'list', name: 'os', message: '操作系统:', choices: ['sylixos', 'linux'], default: 'sylixos' },
    { type: 'confirm', name: 'createbase', message: '创建新 Base?', default: true },
    { type: 'confirm', name: 'build', message: '编译 Base?', default: false },
  ] as any);
}

async function collectProject() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list', name: 'mode', message: '选择操作:',
      choices: [
        { name: '导入已有 Git 工程', value: 'import' },
        { name: '新建工程', value: 'create' },
      ],
    },
  ]);

  if (mode === 'import') {
    const { source } = await inquirer.prompt([
      { type: 'input', name: 'source', message: 'Git 仓库地址:', validate: (v: string) => v.trim() ? true : 'Git 仓库地址不能为空' },
    ]);
    const repoUrl = source.trim();

    const defaultBranch = getRemoteDefaultBranch(repoUrl);
    let branch = '';
    while (true) {
      const ans = await inquirer.prompt([
        { type: 'input', name: 'branch', message: 'Git 分支:', default: defaultBranch },
      ]);
      branch = ans.branch.trim();
      if (!branch) { console.log(chalk.yellow('分支名不能为空')); continue; }
      console.log(chalk.dim(`  正在验证分支 "${branch}" ...`));
      if (remoteBranchExists(repoUrl, branch)) break;
      console.log(chalk.yellow(`  分支 "${branch}" 在远端仓库中不存在，请重新输入`));
    }

    const rest = await inquirer.prompt([
      {
        type: 'input', name: 'name', message: '项目名称:',
        default: () => {
          const match = repoUrl.match(/\/([^/]+?)(\.git)?$/);
          return match ? match[1] : '';
        },
        validate: (v: string) => v.trim().length >= 3 ? true : '至少 3 个字符',
      },
      { type: 'list', name: 'makeTool', message: '构建工具:', choices: ['make', 'ninja'], default: 'make' },
    ]);

    return { source: repoUrl, branch, ...rest };
  }

  return inquirer.prompt([
    { type: 'input', name: 'name', message: '项目名称:', validate: (v: string) => v.trim().length >= 3 ? true : '至少 3 个字符' },
    {
      type: 'list', name: 'template', message: '项目模板:',
      choices: [
        { name: '应用程序 (app)', value: 'app' },
        { name: '库 (lib)', value: 'lib' },
        { name: '公共模块 (common)', value: 'common' },
        { name: '内核模块 (ko)', value: 'ko' },
        { name: 'Python 原生库 (python_native_lib)', value: 'python_native_lib' },
        { name: 'uORB 发布订阅 (uorb_pubsub)', value: 'uorb_pubsub' },
        { name: 'VSOA 发布订阅 (vsoa_pubsub)', value: 'vsoa_pubsub' },
        { name: 'Fast DDS 发布订阅 (fast_dds_pubsub)', value: 'fast_dds_pubsub' },
      ],
      default: 'app',
    },
    {
      type: 'list', name: 'type', message: '构建类型:',
      choices: ['cmake', 'automake', 'realevo', 'ros2', 'python', 'cython', 'go', 'javascript'],
      default: 'cmake',
    },
    { type: 'list', name: 'debugLevel', message: '调试级别:', choices: ['release', 'debug'], default: 'release' },
    { type: 'list', name: 'makeTool', message: '构建工具:', choices: ['make', 'ninja'], default: 'make' },
  ]);
}

async function collectDevice() {
  return inquirer.prompt([
    { type: 'input', name: 'name', message: '设备名称:', validate: (v: string) => v.trim() ? true : '名称不能为空' },
    { type: 'input', name: 'ip', message: 'IP 地址:', validate: (v: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(v) ? true : '请输入有效的 IPv4 地址' },
    { type: 'checkbox', name: 'platform', message: '平台 (多选):', choices: PLATFORMS, default: [DEFAULT_PLATFORM], validate: (v: string[]) => v.length > 0 ? true : '至少选择一个平台' },
    { type: 'input', name: 'username', message: '用户名:', default: 'root' },
    { type: 'input', name: 'password', message: '密码:', default: 'root' },
    { type: 'number', name: 'ssh', message: 'SSH 端口:', default: 22 },
    { type: 'number', name: 'telnet', message: 'Telnet 端口:', default: 23 },
    { type: 'number', name: 'ftp', message: 'FTP 端口:', default: 21 },
    { type: 'number', name: 'gdb', message: 'GDB 端口:', default: 1234 },
  ] as any);
}

async function collectContent(type: TemplateType): Promise<any> {
  if (type === 'workspace') return collectWorkspace();
  if (type === 'project') return collectProject();
  if (type === 'device') return collectDevice();

  // full: workspace + multiple projects + multiple devices
  console.log(chalk.cyan('\n--- Workspace 配置 ---'));
  const workspace = await collectWorkspace();

  const projects = [];
  let addMore = true;
  const { addProjects } = await inquirer.prompt([
    { type: 'confirm', name: 'addProjects', message: '添加项目?', default: true },
  ]);
  if (addProjects) {
    while (addMore) {
      console.log(chalk.cyan(`\n--- 项目 ${projects.length + 1} ---`));
      projects.push(await collectProject());
      const ans = await inquirer.prompt([
        { type: 'confirm', name: 'more', message: '继续添加项目?', default: false },
      ]);
      addMore = ans.more;
    }
  }

  const devices = [];
  const { addDevices } = await inquirer.prompt([
    { type: 'confirm', name: 'addDevices', message: '添加设备?', default: true },
  ]);
  if (addDevices) {
    addMore = true;
    while (addMore) {
      console.log(chalk.cyan(`\n--- 设备 ${devices.length + 1} ---`));
      devices.push(await collectDevice());
      const ans = await inquirer.prompt([
        { type: 'confirm', name: 'more', message: '继续添加设备?', default: false },
      ]);
      addMore = ans.more;
    }
  }

  return {
    workspace,
    ...(projects.length ? { projects } : {}),
    ...(devices.length ? { devices } : {}),
  };
}
