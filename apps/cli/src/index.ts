#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { checkEnvironment } from '@sydev/core';
import { workspaceCommand } from './commands/workspace.js';
import { projectCommand } from './commands/project.js';
import { deviceCommand } from './commands/device.js';
import { createCompletionCommand } from './commands/completion.js';
import { formatHelp } from './utils/help-formatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('sydev')
  .description('SylixOS 开发环境快速部署工具')
  .version(packageJson.version, '-v, --version', '显示版本信息')
  .helpOption('-h, --help', '显示帮助信息')
  .configureHelp({
    formatHelp: (cmd, helper) => formatHelp(cmd, helper)
  });

// 全局环境检查选项
program.hook('preAction', async (thisCommand, actionCommand) => {
  // 跳过 --version 和 --help
  if (thisCommand.args.includes('--version') || thisCommand.args.includes('--help')) {
    return;
  }

  // 跳过 completion 命令的环境检查（不需要 RealEvo-Stream 环境）
  // 检查 process.argv 中是否包含 completion
  if (process.argv.includes('completion')) {
    return;
  }

  // 执行环境检查
  const envStatus = await checkEnvironment();
  if (!envStatus.overall) {
    console.error(chalk.red('✗ 环境检查失败'));
    if (!envStatus.rl.available) {
      console.error(chalk.yellow(`  rl 命令: ${envStatus.rl.error}`));
      console.error(chalk.cyan(`  建议: ${envStatus.rl.fixSuggestion}`));
    }
    if (!envStatus.toolchain.installed) {
      console.error(chalk.yellow(`  工具链: ${envStatus.toolchain.error}`));
    }
    process.exit(1);
  }
});

// 注册子命令
program.addCommand(workspaceCommand);
program.addCommand(projectCommand);
program.addCommand(deviceCommand);
program.addCommand(createCompletionCommand(program));

// 解析命令行参数
program.parse();
