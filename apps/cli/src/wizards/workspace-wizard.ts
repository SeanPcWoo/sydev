import inquirer from '../utils/inquirer.js';
import chalk from 'chalk';
import { ConfigManager } from '@sydev/core/config-manager.js';
import { RlWrapper } from '@sydev/core/rl-wrapper.js';
import { BASE_COMPONENT_VALUES, PLATFORMS, REQUIRED_BASE_COMPONENTS } from '@sydev/core/constants.js';
import { workspaceSchema, type WorkspaceConfig } from '@sydev/core/schemas/workspace-schema.js';
import { createCliProgressReporter } from '../utils/cli-progress.js';
import { getRemoteDefaultBranch } from '../utils/git.js';

const RESEARCH_REPO = 'ssh://git@10.7.100.21:16783/sylixos/research/libsylixos.git';
const ARM64_PAGE_SHIFT_CHOICES = [
  { name: '4K 页 (页偏移 12)', value: 12 },
  { name: '16K 页 (页偏移 14)', value: 14 },
  { name: '64K 页 (页偏移 16)', value: 16 },
] as const;
const REQUIRED_BASE_COMPONENT_SET = new Set<string>(REQUIRED_BASE_COMPONENTS);

function hasArm64Platform(platforms: string[]): boolean {
  return platforms.some((platform) => platform.startsWith('ARM64_'));
}

function normalizeBaseComponents(components: readonly unknown[] | undefined): string[] | undefined {
  if (components === undefined) {
    return undefined;
  }

  const normalized = [...REQUIRED_BASE_COMPONENTS, ...components]
    .map((component) => {
      if (typeof component === 'string') {
        return component.trim();
      }
      if (component && typeof component === 'object' && 'value' in component && typeof (component as { value?: unknown }).value === 'string') {
        return (component as { value: string }).value.trim();
      }
      return '';
    })
    .filter(Boolean);

  if (normalized.length === 0) {
    return undefined;
  }

  const deduped = [...new Set(normalized)];
  return deduped.length === BASE_COMPONENT_VALUES.length ? undefined : deduped;
}

function buildBaseComponentChoices(selected?: readonly string[]) {
  const selectedSet = new Set(selected?.length ? selected : BASE_COMPONENT_VALUES);
  return BASE_COMPONENT_VALUES.map((component) => ({
    name: REQUIRED_BASE_COMPONENT_SET.has(component) ? `${component} (必选)` : component,
    value: component,
    checked: REQUIRED_BASE_COMPONENT_SET.has(component) || selectedSet.has(component),
    disabled: REQUIRED_BASE_COMPONENT_SET.has(component) ? '必选' : false,
  }));
}

function formatArm64PageShift(shift: number): string {
  if (shift === 14) return '16K 页 (页偏移 14)';
  if (shift === 16) return '64K 页 (页偏移 16)';
  return '4K 页 (页偏移 12)';
}

function formatBaseComponents(components?: string[]): string {
  return !components?.length || components.length === BASE_COMPONENT_VALUES.length
    ? '全部'
    : components.join(', ');
}

/**
 * 执行 workspace 初始化（由交互模式和非交互模式共享）
 */
export async function runWorkspaceInit(
  config: WorkspaceConfig & { cwd: string; basePath: string; version: string },
  options?: { skipConfirm?: boolean }
): Promise<void> {
  // 验证配置
  const validation = ConfigManager.validate(workspaceSchema, config);
  if (!validation.valid) {
    console.error(chalk.red('\n✗ 配置验证失败:'));
    validation.errors?.forEach(err => console.error(chalk.yellow(`  - ${err}`)));
    process.exit(1);
  }

  // 显示配置摘要
  console.log(chalk.bold('\n📋 配置摘要:'));
  console.log(chalk.dim(`  工作路径: ${config.cwd}`));
  console.log(chalk.dim(`  Base 路径: ${config.basePath}`));
  console.log(chalk.dim(`  平台: ${config.platform.join(':')}`));
  console.log(chalk.dim(`  版本: ${config.version}`));
  console.log(chalk.dim(`  操作系统: ${config.os}`));
  console.log(chalk.dim(`  调试级别: ${config.debugLevel}`));
  if (hasArm64Platform(config.platform)) {
    console.log(chalk.dim(`  ARM64 页大小: ${formatArm64PageShift(config.arm64PageShift ?? 12)}`));
  }
  console.log(chalk.dim(`  Base 编译组件: ${formatBaseComponents(config.baseComponents)}`));
  console.log(chalk.dim(`  创建 Base: ${config.createbase ? '是' : '否'}`));
  console.log(chalk.dim(`  编译 Base: ${config.build ? '是' : '否'}`));

  // 需要确认时
  if (!options?.skipConfirm) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '确认初始化?',
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\n已取消'));
      return;
    }
  }

  console.log(chalk.cyan('\n开始初始化...\n'));

  const progressReporter = createCliProgressReporter();
  const rlWrapper = new RlWrapper(progressReporter);
  const result = await rlWrapper.initWorkspace({
    cwd: config.cwd,
    basePath: config.basePath,
    platform: config.platform,
    version: config.version,
    createbase: config.createbase,
    build: config.build,
    debugLevel: config.debugLevel,
    os: config.os,
    arm64PageShift: config.arm64PageShift,
    baseComponents: config.baseComponents,
    ...(config.version === 'custom' && {
      customRepo: (config as any).customRepo,
      customBranch: (config as any).customBranch,
    }),
    ...(config.version === 'research' && {
      researchBranch: (config as any).researchBranch,
    }),
  });

  if (result.success) {
    console.log(chalk.bold.green('\n✓ Workspace 初始化成功!\n'));
  } else {
    console.error(chalk.red(`\n✗ 初始化失败: ${result.error}\n`));
    if (result.fixSuggestion) {
      console.error(chalk.cyan(`建议: ${result.fixSuggestion}\n`));
    }
    process.exit(1);
  }

  progressReporter.removeAllListeners();
}

export async function runWorkspaceWizard(): Promise<void> {
  console.log(chalk.bold.cyan('\n🚀 Workspace 初始化向导\n'));

  // 使用普通 input 输入 workspace 路径
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'cwd',
      message: 'Workspace 创建路径:',
      default: process.cwd(),
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '工作路径不能为空';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'version',
      message: 'Base 版本:',
      choices: [
        { name: 'default (默认，支持所有平台)', value: 'default' },
        { name: 'ecs_3.6.5 (容器化开发专用)', value: 'ecs_3.6.5' },
        { name: 'lts_3.6.5 (发行版，支持所有平台)', value: 'lts_3.6.5' },
        { name: 'lts_3.6.5_compiled (预编译发行版)', value: 'lts_3.6.5_compiled' },
        { name: 'research', value: 'research' },
        { name: 'custom (自定义 libsylixos 仓库)', value: 'custom' }
      ],
      default: 'default'
    },
    {
      type: 'input',
      name: 'researchBranch',
      message: 'research 仓库分支:',
      default: () => getRemoteDefaultBranch(RESEARCH_REPO),
      when: (answers: any) => answers.version === 'research'
    },
    {
      type: 'input',
      name: 'customRepo',
      message: 'libsylixos Git 仓库地址:',
      when: (answers: any) => answers.version === 'custom',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '仓库地址不能为空';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'customBranch',
      message: '仓库分支:',
      default: (answers: any) => getRemoteDefaultBranch(answers.customRepo?.trim() || ''),
      when: (answers: any) => answers.version === 'custom'
    },
    {
      type: 'input',
      name: 'basePath',
      message: 'Base 目录路径:',
      default: (answers: any) => `${answers.cwd.trim()}/.realevo/base`,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Base 路径不能为空';
        }
        return true;
      }
    },
    {
      type: 'checkbox',
      name: 'platform',
      message: '目标平台 (多选):',
      choices: PLATFORMS,
      default: ['ARM64_GENERIC'],
      validate: (input: string[]) => input.length > 0 ? true : '至少选择一个平台'
    },
    {
      type: 'list',
      name: 'arm64PageShift',
      message: '修改 ARM64 架构页大小:',
      choices: ARM64_PAGE_SHIFT_CHOICES,
      default: 12,
      when: (answers: any) => answers.version !== 'lts_3.6.5_compiled' && hasArm64Platform(answers.platform ?? [])
    },
    {
      type: 'list',
      name: 'os',
      message: '操作系统:',
      choices: [
        { name: 'SylixOS', value: 'sylixos' },
        { name: 'Linux', value: 'linux' }
      ],
      default: 'sylixos'
    },
    {
      type: 'list',
      name: 'debugLevel',
      message: '调试级别:',
      choices: [
        { name: 'Release', value: 'release' },
        { name: 'Debug', value: 'debug' }
      ],
      default: 'release'
    },
    {
      type: 'confirm',
      name: 'createbase',
      message: '是否创建新 Base?',
      default: true,
      when: (answers: any) => answers.version !== 'research' && answers.version !== 'custom' && answers.version !== 'lts_3.6.5_compiled'
    },
    {
      type: 'confirm',
      name: 'build',
      message: '是否编译 Base?',
      default: false,
      when: (answers: any) => answers.version !== 'research' && answers.version !== 'custom' && answers.version !== 'lts_3.6.5_compiled'
    },
    {
      type: 'checkbox',
      name: 'baseComponents',
      message: 'Base 编译组件 (多选):',
      choices: buildBaseComponentChoices(),
      when: (answers: any) => answers.version !== 'lts_3.6.5_compiled'
    }
  ] as any);

  const config: WorkspaceConfig & { cwd: string; basePath: string; version: string } = {
    cwd: answers.cwd.trim(),
    basePath: answers.basePath.trim(),
    platform: answers.platform,
    version: answers.version,
    createbase: answers.createbase ?? false,
    build: answers.build ?? false,
    debugLevel: answers.debugLevel,
    os: answers.os,
    arm64PageShift: answers.arm64PageShift,
    baseComponents: normalizeBaseComponents(answers.baseComponents),
    ...(answers.version === 'custom' && {
      customRepo: answers.customRepo?.trim(),
      customBranch: answers.customBranch,
    }),
    ...(answers.version === 'research' && {
      researchBranch: answers.researchBranch,
    }),
  } as any;

  await runWorkspaceInit(config);
}
