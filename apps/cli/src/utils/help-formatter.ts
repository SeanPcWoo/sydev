import chalk from 'chalk';
import { Command, Help } from 'commander';

export function formatHelp(cmd: Command, helper: Help): string {
  const termWidth = process.stdout.columns || 80;
  const indent = '  ';

  let output = '';

  // 标题
  output += chalk.bold.cyan(`\n${cmd.name()}\n`);

  // 描述
  if (cmd.description()) {
    output += `\n${indent}${cmd.description()}\n`;
  }

  // 用法
  output += chalk.bold('\n用法:\n');
  output += `${indent}$ ${cmd.name()} ${helper.commandUsage(cmd)}\n`;

  // 命令列表
  const commands = cmd.commands.filter(c => !(c as any).hidden);
  if (commands.length > 0) {
    output += chalk.bold('\n命令:\n');
    commands.forEach(c => {
      const name = c.name().padEnd(20);
      output += `${indent}${chalk.green(name)} ${c.description()}\n`;
    });
  }

  // 选项
  const options = helper.visibleOptions(cmd);
  if (options.length > 0) {
    output += chalk.bold('\n选项:\n');
    options.forEach(opt => {
      const flags = opt.flags.padEnd(25);
      output += `${indent}${chalk.yellow(flags)} ${opt.description}\n`;
    });
  }

  // 示例
  output += chalk.bold('\n示例:\n');
  output += `${indent}$ openswitch workspace init    ${chalk.dim('# 初始化 workspace')}\n`;
  output += `${indent}$ openswitch project create    ${chalk.dim('# 创建项目')}\n`;
  output += `${indent}$ openswitch device add        ${chalk.dim('# 添加设备')}\n`;
  output += `${indent}$ openswitch --help            ${chalk.dim('# 查看帮助')}\n`;

  output += '\n';
  return output;
}
