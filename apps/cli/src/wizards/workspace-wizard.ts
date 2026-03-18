import inquirer from 'inquirer';
import chalk from 'chalk';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import {
  ConfigManager,
  workspaceSchema,
  RlWrapper,
  PLATFORMS,
  type WorkspaceConfig
} from '@sydev/core';
import { createCliProgressReporter } from '../utils/cli-progress.js';
import { getRemoteDefaultBranch } from '../utils/git.js';

const RESEARCH_REPO = 'ssh://git@10.7.100.21:16783/sylixos/research/libsylixos.git';

/**
 * 执行 workspace 初始化（由交互模式和非交互模式共享）
 */
export async function runWorkspaceInit(
  config: WorkspaceConfig & { cwd: string; basePath: string; version: string },
  options?: { skipConfirm?: boolean; skipCloneMode?: boolean }
): Promise<void> {
  const isResearch = config.version === 'research';
  const isCustom = config.version === 'custom';
  const isCloneMode = (isResearch || isCustom) && !options?.skipCloneMode;

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
    version: config.version === 'research' || config.version === 'custom' ? 'lts_3.6.5' : config.version,
    createbase: config.createbase,
    build: config.build,
    debugLevel: config.debugLevel,
    os: config.os
  });

  if (result.success && !isCloneMode) {
    console.log(chalk.bold.green('\n✓ Workspace 初始化成功!\n'));
  } else if (!result.success && !isCloneMode) {
    console.error(chalk.red(`\n✗ 初始化失败: ${result.error}\n`));
    if (result.fixSuggestion) {
      console.error(chalk.cyan(`建议: ${result.fixSuggestion}\n`));
    }
    process.exit(1);
  } else if (isCloneMode) {
    // clone 模式：停掉 spinner，不管 rl-workspace 成功与否都继续
    progressReporter.emit('step', { name: '初始化 Workspace', progress: 100 });
    if (!result.success) {
      console.log(chalk.yellow(`\n⚠ rl-workspace 执行有错误，继续处理...\n`));
    }
  }

  // research/custom 模式：删除 libsylixos 并 clone 仓库
  if (isCloneMode) {
    const basePath = config.basePath;
    const libsylixosPath = join(basePath, 'libsylixos');

    if (existsSync(libsylixosPath)) {
      console.log(chalk.cyan(`正在删除 libsylixos 目录...`));
      rmSync(libsylixosPath, { recursive: true, force: true });
      console.log(chalk.dim(`  已删除 ${libsylixosPath}`));
    }

    const cloneBranch = (config as any).customBranch || (config as any).researchBranch || 'master';
    const cloneRepo = isResearch ? RESEARCH_REPO : (config as any).customRepo;

    console.log(chalk.cyan(`正在 clone libsylixos 仓库 (分支: ${cloneBranch})...`));
    try {
      execSync(
        `git clone -b ${cloneBranch} ${cloneRepo} libsylixos`,
        { cwd: basePath, stdio: 'inherit' }
      );
      console.log(chalk.bold.green(`\n✓ Workspace 初始化成功!\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✗ clone libsylixos 仓库失败: ${err.message}\n`));
      process.exit(1);
    }
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
      when: (answers: any) => answers.version !== 'research' && answers.version !== 'custom'
    },
    {
      type: 'confirm',
      name: 'build',
      message: '是否编译 Base?',
      default: false,
      when: (answers: any) => answers.version !== 'research' && answers.version !== 'custom'
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
