import { Command } from 'commander';
import chalk from 'chalk';

export const deviceCommand = new Command('device')
  .description('管理目标设备')
  .addHelpText('after', `
示例:
  $ openswitch device add         # 交互式添加设备
  $ openswitch device list        # 列出所有设备
`);

deviceCommand
  .command('add')
  .description('添加目标设备（交互式向导）')
  .action(async () => {
    console.log(chalk.blue('ℹ device add 命令将在 Plan 04 实现交互式向导'));
    console.log(chalk.dim('当前为命令结构骨架'));
  });

deviceCommand
  .command('list')
  .description('列出所有已配置的设备')
  .action(async () => {
    console.log(chalk.cyan('查找设备配置...'));
    console.log(chalk.dim('  设备配置功能将在后续 Plan 实现'));
  });
