#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { checkEnvironment } from '@openswitch/core';
import { workspaceCommand } from './commands/workspace.js';
import { projectCommand } from './commands/project.js';
import { deviceCommand } from './commands/device.js';
import { formatHelp } from './utils/help-formatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('openswitch')
  .description('SylixOS 开发环境快速部署工具')
  .version(packageJson.version, '-v, --version', '显示版本信息')
  .helpOption('-h, --help', '显示帮助信息')
  .configureHelp({
    formatHelp: (cmd, helper) => formatHelp(cmd, helper)
  });

// 全局环境检查选项
program.hook('preAction', async (thisCommand) => {
  // 跳过 --version 和 --help
  if (thisCommand.args.includes('--version') || thisCommand.args.includes('--help')) {
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

// 解析命令行参数
program.parse();
