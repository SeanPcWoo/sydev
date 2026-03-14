import inquirer from 'inquirer';
import chalk from 'chalk';
import { join } from 'path';
import {
  ConfigManager,
  workspaceSchema,
  RlWrapper,
  type WorkspaceConfig
} from '@openswitch/core';
import { createCliProgressReporter } from '../utils/cli-progress.js';

export async function runWorkspaceWizard(): Promise<void> {
  console.log(chalk.bold.cyan('\n🚀 Workspace 初始化向导\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'baseVersion',
      message: 'Base 版本:',
      default: '2.0.0',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Base 版本不能为空';
        }
        // 简单的版本号格式验证
        if (!/^\d+\.\d+\.\d+$/.test(input.trim())) {
          return '版本号格式应为 x.y.z（如 2.0.0）';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'platform',
      message: '目标平台:',
      choices: [
        { name: 'ARM', value: 'arm' },
        { name: 'x86', value: 'x86' },
        { name: 'MIPS', value: 'mips' },
        { name: 'RISC-V', value: 'riscv' }
      ],
      default: 'arm'
    },
    {
      type: 'confirm',
      name: 'enableDebug',
      message: '启用调试模式?',
      default: false
    },
    {
      type: 'list',
      name: 'optimize',
      message: '优化级别:',
      choices: [
        { name: '无优化', value: 'none' },
        { name: '优化大小', value: 'size' },
        { name: '优化速度', value: 'speed' }
      ],
      default: 'none'
    },
    {
      type: 'input',
      name: 'path',
      message: 'Workspace 路径:',
      default: process.cwd(),
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '路径不能为空';
        }
        return true;
      }
    }
  ]);

  // 构建配置对象
  const config: WorkspaceConfig = {
    baseVersion: answers.baseVersion.trim(),
    platform: answers.platform,
    buildOptions: {
      debug: answers.enableDebug,
      optimize: answers.optimize
    },
    path: answers.path.trim()
  };

  // 使用 zod schema 验证配置
  const validation = ConfigManager.validate(workspaceSchema, config);
  if (!validation.valid) {
    console.error(chalk.red('\n✗ 配置验证失败:'));
    validation.errors?.forEach(err => console.error(chalk.yellow(`  - ${err}`)));
    process.exit(1);
  }

  // 显示配置摘要
  console.log(chalk.bold('\n📋 配置摘要:'));
  console.log(chalk.dim(`  Base 版本: ${config.baseVersion}`));
  console.log(chalk.dim(`  平台: ${config.platform}`));
  console.log(chalk.dim(`  调试模式: ${config.buildOptions?.debug ? '是' : '否'}`));
  console.log(chalk.dim(`  优化级别: ${config.buildOptions?.optimize}`));
  console.log(chalk.dim(`  路径: ${config.path}`));

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

  // 执行初始化
  console.log(chalk.cyan('\n开始初始化...\n'));

  const progressReporter = createCliProgressReporter();
  const rlWrapper = new RlWrapper(progressReporter);

  const result = await rlWrapper.initWorkspace({
    baseVersion: config.baseVersion,
    platform: config.platform,
    path: config.path!
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
}
