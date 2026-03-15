import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import {
  InitOrchestrator,
  RlWrapper,
} from '@sydev/core';
import { createCliProgressReporter } from '../utils/cli-progress.js';

export const initCommand = new Command('init')
  .description('从配置文件全流程初始化环境')
  .option('--config <file>', '配置文件路径 (JSON)')
  .addHelpText('after', `
示例:
  $ sydev init --config config.json   # 从配置文件初始化
`)
  .action(async (opts) => {
    if (!opts.config) {
      console.error(chalk.red('✗ 请指定配置文件: sydev init --config <file>'));
      return;
    }

    let raw: string;
    try {
      raw = readFileSync(opts.config, 'utf-8');
    } catch {
      console.error(chalk.red(`✗ 无法读取配置文件: ${opts.config}`));
      console.log(chalk.cyan('建议: 检查文件路径是否正确'));
      return;
    }

    let config: unknown;
    try {
      config = JSON.parse(raw);
    } catch {
      console.error(chalk.red('✗ 配置文件不是有效的 JSON'));
      console.log(chalk.cyan('建议: 使用 JSON 校验工具检查文件格式'));
      return;
    }

    console.log(chalk.cyan('\n开始全流程初始化...\n'));

    const progressReporter = createCliProgressReporter();
    const rlWrapper = new RlWrapper(progressReporter);
    const orchestrator = new InitOrchestrator(rlWrapper, progressReporter);

    const result = await orchestrator.execute(config);

    if (result.success) {
      console.log(chalk.bold.green('\n✓ 全流程初始化成功!\n'));
      console.log(chalk.dim('已完成步骤:'));
      result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
    } else {
      console.error(chalk.red(`\n✗ 初始化失败: ${result.error}`));
      if (result.failedStep) {
        console.error(chalk.yellow(`  失败步骤: ${result.failedStep}`));
      }
      if (result.completedSteps.length) {
        console.log(chalk.dim('\n已完成步骤:'));
        result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
      }
      console.log(chalk.cyan('\n建议: 修复问题后重新运行 sydev init --config ' + opts.config));
    }

    progressReporter.removeAllListeners();
  });
