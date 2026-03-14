import { Command } from 'commander';
import chalk from 'chalk';
import { checkEnvironment } from '@openswitch/core';

export const workspaceCommand = new Command('workspace')
  .description('管理 SylixOS workspace')
  .addHelpText('after', `
示例:
  $ openswitch workspace init     # 交互式初始化 workspace
  $ openswitch workspace status   # 查看 workspace 状态
`);

workspaceCommand
  .command('init')
  .description('初始化 workspace（交互式向导）')
  .action(async () => {
    const { runWorkspaceWizard } = await import('../wizards/workspace-wizard.js');
    await runWorkspaceWizard();
  });

workspaceCommand
  .command('status')
  .description('查看当前 workspace 状态')
  .action(async () => {
    console.log(chalk.cyan('检查 workspace 状态...'));

    // 简单实现：检查 .realevo 目录是否存在
    const fs = await import('fs');
    const path = await import('path');
    const workspacePath = path.join(process.cwd(), '.realevo');

    if (fs.existsSync(workspacePath)) {
      console.log(chalk.green('✓ Workspace 已初始化'));
      console.log(chalk.dim(`  路径: ${workspacePath}`));
    } else {
      console.log(chalk.yellow('⚠ Workspace 未初始化'));
      console.log(chalk.dim('  运行 openswitch workspace init 开始初始化'));
    }
  });
