import { Command } from 'commander';
import chalk from 'chalk';
import { BuildRunner } from '@sydev/core/build-runner.js';
import { WorkspaceScanner } from '@sydev/core/workspace-scanner.js';
import type { BuildProgressEvent, BuildProjectResult } from '@sydev/core/build-runner.js';

function parseExtraArgs(): string[] {
  const dashDashIdx = process.argv.indexOf('--');
  if (dashDashIdx === -1) return [];
  return process.argv.slice(dashDashIdx + 1);
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export const cleanCommand = new Command('clean')
  .description('清理 SylixOS 工程')
  .argument('[project]', '工程名（精确匹配目录名）')
  .option('--quiet', '静默模式（不透传 make 输出）')
  .allowUnknownOption()
  .addHelpText('after', `
示例:
  $ sydev clean                  # 交互式选择工程
  $ sydev clean libcpu           # 清理指定工程
  $ sydev clean libcpu -- -j4   # 透传 make 参数
`)
  .action(async (projectArg: string | undefined, opts: { quiet?: boolean }) => {
    const extraArgs = parseExtraArgs();
    const scanner = new WorkspaceScanner(process.cwd());
    const projects = scanner.scan();

    if (projectArg) {
      const found = projects.find((p) => p.name === projectArg);
      if (!found) {
        console.error(chalk.red(`未找到工程 '${projectArg}'，运行 sydev clean 查看可用工程列表`));
        process.exit(1);
      }
      const runner = new BuildRunner(projects, process.cwd());
      runner.ensureMakefile();
      runner.on('progress', (event: BuildProgressEvent) => {
        if (event.type === 'stdout-line') process.stdout.write(event.line + '\n');
        else if (event.type === 'stderr-line') process.stderr.write(event.line + '\n');
      });
      const result = await runner.cleanOne(found, { quiet: opts.quiet, extraArgs });
      if (result.success) {
        console.log(chalk.green('✓ 清理成功') + chalk.dim(` (${formatDuration(result.durationMs)})`));
        process.exit(0);
      } else {
        if (opts.quiet) {
          if (result.stdout) process.stdout.write(result.stdout);
          if (result.stderr) process.stderr.write(result.stderr);
        }
        console.error(chalk.red('✗ 清理失败'));
        process.exit(1);
      }
    }

    if (projects.length === 0) {
      console.error(chalk.yellow('未找到工程（确认当前目录是 workspace 根目录，且工程子目录同时包含 .project 和 Makefile）'));
      process.exit(1);
    }

    const runner = new BuildRunner(projects, process.cwd());
    runner.ensureMakefile();
    const { default: inquirer } = await import('inquirer');
    const { selected } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selected',
      message: '选择要清理的工程：',
      choices: projects.map((p) => ({ name: p.name, value: p })),
      validate: (answer: readonly unknown[]) => answer.length > 0 ? true : '请至少选择一个',
    }]);

    if (!selected || selected.length === 0) {
      console.log(chalk.dim('未选择，退出。'));
      process.exit(0);
    }

    let failedCount = 0;
    runner.on('progress', (event: BuildProgressEvent) => {
      if (event.type === 'stdout-line') process.stdout.write(event.line + '\n');
      else if (event.type === 'stderr-line') process.stderr.write(event.line + '\n');
    });

    for (const item of selected) {
      console.log(chalk.cyan(`清理 ${item.name}...`));
      const result = await runner.cleanOne(item, { extraArgs });
      if (result.success) {
        console.log(chalk.green('✓ 清理成功') + chalk.dim(` (${formatDuration(result.durationMs)})`));
      } else {
        console.error(chalk.red(`✗ ${item.name} 清理失败`));
        failedCount++;
      }
    }
    process.exit(failedCount);
  });
