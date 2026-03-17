import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import { checkEnvironment } from '@sydev/core';
import { workspaceCommand } from './commands/workspace.js';
import { projectCommand } from './commands/project.js';
import { buildCommand } from './commands/build.js';
import { cleanCommand } from './commands/clean.js';
import { rebuildCommand } from './commands/rebuild.js';
import { deviceCommand } from './commands/device.js';
import { templateCommand } from './commands/template.js';
import { initCommand } from './commands/init.js';
import { formatHelp } from './utils/help-formatter.js';

function getVersion(): string {
  if (process.env.SYDEV_VERSION) return process.env.SYDEV_VERSION;
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    return JSON.parse(readFileSync(join(dir, '../package.json'), 'utf-8')).version;
  } catch {
    return '0.0.0-dev';
  }
}

const program = new Command();

program
  .name('sydev')
  .description('SylixOS 开发环境快速部署工具')
  .version(getVersion(), '-v, --version', '显示版本信息')
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

  // 跳过 template（除 apply 外）和 init 命令的环境检查
  const argv = process.argv;
  if (argv.includes('template') && !argv.includes('apply')) {
    return;
  }
  if (argv.includes('init')) {
    return;
  }
  if (argv.includes('build') || argv.includes('clean') || argv.includes('rebuild')) {
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
program.addCommand(buildCommand);
program.addCommand(cleanCommand);
program.addCommand(rebuildCommand);
program.addCommand(deviceCommand);
program.addCommand(templateCommand);
program.addCommand(initCommand);

// 解析命令行参数
program.parse();
