import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
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

/** padEnd that respects CJK display width */
function padEndW(s: string, width: number): string {
  const diff = width - strWidth(s);
  return diff > 0 ? s + ' '.repeat(diff) : s;
}

import {
  TemplateManager,
  ConfigManager,
  RlWrapper,
  InitOrchestrator,
  fullConfigSchema,
  type TemplateType,
  type FullConfig,
} from '@sydev/core';
import { createCliProgressReporter } from '../utils/cli-progress.js';

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

export const templateCommand = new Command('template')
  .description('管理配置模板')
  .addHelpText('after', `
示例:
  $ sydev template save       # 保存当前配置为模板
  $ sydev template list       # 查看所有模板
  $ sydev template apply <id> # 从模板初始化环境
  $ sydev template delete <id># 删除模板
  $ sydev template export     # 导出配置为 JSON 文件
  $ sydev template import <f> # 从 JSON 文件导入配置
`);

// --- template save ---
templateCommand
  .command('save')
  .description('保存当前配置为模板')
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
      console.log(chalk.green(`\n✓ 模板已保存: ${meta.id} (${meta.type})`));
    } catch (err: any) {
      console.error(chalk.red(`\n✗ 保存失败: ${err.message}`));
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
      console.log(chalk.dim('  暂无模板，运行 sydev template save 创建'));
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
// --- template apply <id> ---
templateCommand
  .command('apply <id>')
  .description('从模板初始化环境')
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
    console.log(chalk.cyan(`\n应用模板: ${meta.name} (${meta.type})\n`));

    // 应用时收集 workspace 路径
    const { cwd } = await inquirer.prompt([
      { type: 'input', name: 'cwd', message: 'Workspace 路径:', default: process.cwd() },
    ]);
    const { basePath } = await inquirer.prompt([
      {
        type: 'input', name: 'basePath', message: 'Base 目录路径:',
        default: `${cwd.trim()}/.realevo/base`,
      },
    ]);

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

      const { selected } = await inquirer.prompt<{ selected: string[] }>([{
        type: 'checkbox', name: 'selected', message: '选择要应用的部分:',
        choices: parts.map((p) => ({ name: p, value: p, checked: true })),
      }] as any);

      config = { schemaVersion: 1 } as any;
      if (selected.includes('workspace')) {
        (config as any).workspace = { ...fullData.workspace, cwd: cwd.trim(), basePath: basePath.trim() };
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
      config = { schemaVersion: 1, workspace: { ...templateContent.data, cwd: cwd.trim(), basePath: basePath.trim() } } as any;
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
  .description('导出配置为 JSON 文件')
  .option('-o, --output <file>', '输出文件路径', 'sydev-config.json')
  .action(async (opts) => {
    const { type: templateType } = await inquirer.prompt([
      { type: 'list', name: 'type', message: '导出类型:', choices: TEMPLATE_TYPES },
    ]);

    const content = await collectContent(templateType);

    let exportData: any;
    if (templateType === 'full') {
      exportData = { schemaVersion: 1, ...content };
    } else {
      exportData = { schemaVersion: 1, type: templateType, [templateType]: content };
    }

    const json = ConfigManager.exportToJson(exportData);
    writeFileSync(opts.output, json, 'utf-8');
    console.log(chalk.green(`\n✓ 配置已导出到 ${opts.output}`));
  });

// --- template import <file> ---
templateCommand
  .command('import <file>')
  .description('从 JSON 文件导入配置')
  .action(async (file: string) => {
    let json: string;
    try {
      json = readFileSync(file, 'utf-8');
    } catch {
      console.error(chalk.red(`✗ 无法读取文件: ${file}`));
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch {
      console.error(chalk.red('✗ 文件不是有效的 JSON'));
      return;
    }

    // 自动检测类型：有 workspace 字段且无 type 字段 → full，否则按 type 字段判断
    let detectedType: TemplateType;
    let templateData: any;

    if (parsed.type && ['workspace', 'project', 'device'].includes(parsed.type)) {
      detectedType = parsed.type;
      templateData = parsed[detectedType];
      if (!templateData) {
        console.error(chalk.red(`✗ 文件中缺少 ${detectedType} 字段`));
        return;
      }
    } else if (parsed.type === 'full') {
      detectedType = 'full';
      // 支持 { type: "full", data: {...} } 或 { type: "full", full: {...} } 格式
      templateData = parsed.data || parsed.full;
      if (!templateData) {
        console.error(chalk.red('✗ 文件中缺少 data 或 full 字段'));
        return;
      }
    } else if (parsed.workspace) {
      detectedType = 'full';
      templateData = parsed;
    } else {
      console.error(chalk.red('✗ 无法识别配置类型，文件需包含 type 字段或 workspace 字段'));
      return;
    }

    console.log(chalk.green(`✓ 检测到 ${detectedType} 类型配置`));

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
  });
// --- Content collection helpers ---

async function collectWorkspace() {
  return inquirer.prompt([
    { type: 'checkbox', name: 'platform', message: '目标平台 (多选):', choices: ['ARM64_GENERIC', 'ARM64_A53', 'ARM64_A55', 'ARM64_A57', 'ARM64_A72', 'X86_64', 'RISCV_GC64', 'LOONGARCH64'], default: ['ARM64_GENERIC'], validate: (v: string[]) => v.length > 0 ? true : '至少选择一个平台' },
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
    { type: 'checkbox', name: 'platform', message: '平台 (多选):', choices: ['ARM64_GENERIC', 'ARM64_A53', 'ARM64_A55', 'ARM64_A57', 'ARM64_A72', 'X86_64', 'RISCV_GC64', 'LOONGARCH64'], default: ['ARM64_GENERIC'], validate: (v: string[]) => v.length > 0 ? true : '至少选择一个平台' },
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
