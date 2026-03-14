import { Command } from 'commander';
import chalk from 'chalk';

export const projectCommand = new Command('project')
  .description('管理 SylixOS 项目')
  .addHelpText('after', `
示例:
  $ openswitch project create     # 交互式创建项目
  $ openswitch project list       # 列出所有项目
`);

projectCommand
  .command('create')
  .description('创建新项目（交互式向导）')
  .action(async () => {
    console.log(chalk.blue('ℹ project create 命令将在 Plan 04 实现交互式向导'));
    console.log(chalk.dim('当前为命令结构骨架'));
  });

projectCommand
  .command('list')
  .description('列出当前 workspace 中的所有项目')
  .action(async () => {
    console.log(chalk.cyan('查找项目...'));

    const fs = await import('fs');
    const path = await import('path');
    const workspacePath = path.join(process.cwd(), '.realevo');

    if (!fs.existsSync(workspacePath)) {
      console.log(chalk.yellow('⚠ Workspace 未初始化'));
      return;
    }

    // 简单实现：列出包含 .rlproject 的目录
    const dirs = fs.readdirSync(process.cwd(), { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(process.cwd(), d.name, '.rlproject')))
      .map(d => d.name);

    if (dirs.length === 0) {
      console.log(chalk.dim('  未找到项目'));
    } else {
      console.log(chalk.green(`✓ 找到 ${dirs.length} 个项目:`));
      dirs.forEach(name => console.log(chalk.dim(`  - ${name}`)));
    }
  });
