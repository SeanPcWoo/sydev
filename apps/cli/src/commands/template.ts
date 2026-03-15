import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
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
    const tm = new TemplateManager(process.cwd());

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
    const tm = new TemplateManager(process.cwd());
    const templates = tm.list(opts.type);

    if (templates.length === 0) {
      console.log(chalk.dim('  暂无模板，运行 sydev template save 创建'));
      return;
    }

    console.log(chalk.bold(`\n共 ${templates.length} 个模板:\n`));
    console.log(
      chalk.dim('  ' + 'ID'.padEnd(24) + '名称'.padEnd(16) + '类型'.padEnd(12) + '更新时间')
    );
    console.log(chalk.dim('  ' + '-'.repeat(70)));
    for (const t of templates) {
      const date = new Date(t.updatedAt).toLocaleString('zh-CN');
      console.log(`  ${chalk.green(t.id.padEnd(24))}${t.name.padEnd(16)}${t.type.padEnd(12)}${chalk.dim(date)}`);
    }
    console.log();
  });
// --- template apply <id> ---
templateCommand
  .command('apply <id>')
  .description('从模板初始化环境')
  .action(async (id: string) => {
    const tm = new TemplateManager(process.cwd());

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
        (config as any).workspace = fullData.workspace;
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
      config = { schemaVersion: 1, workspace: templateContent.data } as any;
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
    // 注册 error listener 避免 unhandled throw
    progressReporter.on('error', () => {});
    const rlWrapper = new RlWrapper(progressReporter);
    const orchestrator = new InitOrchestrator(rlWrapper, progressReporter);

    console.log(chalk.cyan('开始应用模板...\n'));
    const result = await orchestrator.execute(config);

    if (result.success) {
      console.log(chalk.bold.green('\n✓ 模板应用成功!'));
      result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
    } else {
      console.error(chalk.red(`\n✗ 应用失败: ${result.error}`));
      if (result.completedSteps.length) {
        console.log(chalk.yellow('已完成的步骤:'));
        result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
      }
      console.log(chalk.cyan('建议: 修复问题后重新运行 sydev template apply ' + id));
    }
  });

// --- template delete <id> ---
templateCommand
  .command('delete <id>')
  .description('删除模板')
  .action(async (id: string) => {
    const tm = new TemplateManager(process.cwd());

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
      exportData = { schemaVersion: 1, [templateType]: content };
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

    const result = ConfigManager.importFromJson(fullConfigSchema, json);
    if (!result.valid) {
      console.error(chalk.red('✗ 配置验证失败:'));
      result.errors?.forEach((e) => console.error(chalk.yellow(`  - ${e}`)));
      console.log(chalk.cyan('建议: 检查 JSON 文件格式是否符合 sydev 配置 schema'));
      return;
    }

    console.log(chalk.green('✓ 配置验证通过'));

    const { saveAsTemplate } = await inquirer.prompt([
      { type: 'confirm', name: 'saveAsTemplate', message: '是否保存为模板?', default: false },
    ]);

    if (saveAsTemplate) {
      const { name, description } = await inquirer.prompt([
        { type: 'input', name: 'name', message: '模板名称:', validate: (v: string) => v.trim() ? true : '名称不能为空' },
        { type: 'input', name: 'description', message: '模板描述:', default: '' },
      ]);

      const tm = new TemplateManager(process.cwd());
      try {
        const meta = tm.save(name, description, 'full', result.data);
        console.log(chalk.green(`✓ 已保存为模板: ${meta.id}`));
      } catch (err: any) {
        console.error(chalk.red(`✗ 保存失败: ${err.message}`));
      }
    }
  });
// --- Content collection helpers ---

async function collectWorkspace() {
  return inquirer.prompt([
    { type: 'input', name: 'cwd', message: 'Workspace 路径:', default: process.cwd() },
    { type: 'input', name: 'basePath', message: 'Base 目录路径:', default: `${process.cwd()}/.realevo/base` },
    { type: 'input', name: 'platform', message: '目标平台:', default: 'ARM64_GENERIC' },
    { type: 'list', name: 'version', message: 'Base 版本:', choices: ['default', 'ecs_3.6.5', 'lts_3.6.5', 'lts_3.6.5_compiled', 'research', 'custom'], default: 'default' },
    { type: 'list', name: 'debugLevel', message: '调试级别:', choices: ['release', 'debug'], default: 'release' },
    { type: 'list', name: 'os', message: '操作系统:', choices: ['sylixos', 'linux'], default: 'sylixos' },
    { type: 'confirm', name: 'createbase', message: '创建新 Base?', default: true },
    { type: 'confirm', name: 'build', message: '编译 Base?', default: false },
  ]);
}

async function collectProject() {
  return inquirer.prompt([
    { type: 'input', name: 'name', message: '项目名称:', validate: (v: string) => v.trim().length >= 3 ? true : '至少 3 个字符' },
    { type: 'list', name: 'template', message: '项目模板:', choices: ['app', 'lib', 'common', 'ko', 'python_native_lib', 'uorb_pubsub', 'vsoa_pubsub', 'fast_dds_pubsub', '(无)'], default: 'app', filter: (v: string) => v === '(无)' ? undefined : v },
    { type: 'list', name: 'makeTool', message: '构建工具:', choices: ['make', 'ninja'], default: 'make' },
  ]);
}

async function collectDevice() {
  return inquirer.prompt([
    { type: 'input', name: 'name', message: '设备名称:', validate: (v: string) => v.trim() ? true : '名称不能为空' },
    { type: 'input', name: 'ip', message: 'IP 地址:', validate: (v: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(v) ? true : '请输入有效的 IPv4 地址' },
    { type: 'input', name: 'platform', message: '平台:', default: 'ARM64_GENERIC' },
    { type: 'input', name: 'username', message: '用户名:', default: 'root' },
    { type: 'input', name: 'password', message: '密码:', default: '' },
    { type: 'number', name: 'ssh', message: 'SSH 端口:', default: 22 },
    { type: 'number', name: 'telnet', message: 'Telnet 端口:', default: 23 },
    { type: 'number', name: 'ftp', message: 'FTP 端口:', default: 21 },
    { type: 'number', name: 'gdb', message: 'GDB 端口:', default: 1234 },
  ]);
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
    { type: 'confirm', name: 'addProjects', message: '添加项目?', default: false },
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
    { type: 'confirm', name: 'addDevices', message: '添加设备?', default: false },
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
