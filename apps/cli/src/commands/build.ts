import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceScanner, BuildRunner } from '@sydev/core';
import type { BuildProgressEvent, BuildProjectResult } from '@sydev/core';

// 解析 -- 之后的额外 make 参数
function parseExtraArgs(): string[] {
  const dashDashIdx = process.argv.indexOf('--');
  if (dashDashIdx === -1) return [];
  return process.argv.slice(dashDashIdx + 1);
}

// 格式化耗时
function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// 打印单工程失败摘要
function printErrorSummary(result: BuildProjectResult): void {
  const lines = result.errorLines ?? [];
  console.error(
    chalk.red('✗ 编译失败') + chalk.dim(` (${lines.length} 个错误)`)
  );
  for (const line of lines) {
    console.error(chalk.red('  > ' + line));
  }
}

// 打印批量汇总表格
function printBatchSummary(results: BuildProjectResult[]): void {
  const nameWidth = 20;
  const statusWidth = 6;
  const timeWidth = 8;
  const sep = chalk.dim('─'.repeat(nameWidth + statusWidth + timeWidth + 20));

  console.log('');
  console.log(sep);
  console.log(
    '  ' +
    chalk.bold('工程名'.padEnd(nameWidth)) +
    chalk.bold('状态'.padEnd(statusWidth)) +
    chalk.bold('耗时'.padEnd(timeWidth)) +
    chalk.bold('备注')
  );
  console.log(sep);

  for (const r of results) {
    const name = r.name.padEnd(nameWidth);
    const time = formatDuration(r.durationMs).padEnd(timeWidth);

    if (r.success) {
      console.log(
        chalk.green('  ' + name + '✓'.padEnd(statusWidth) + time)
      );
    } else {
      const note = r.errorSummary ?? '编译失败';
      console.log(
        chalk.red('  ' + name + '✗'.padEnd(statusWidth) + time + note)
      );
    }
  }

  console.log(sep);
  const total = results.length;
  const succeeded = results.filter((r) => r.success).length;
  const failed = total - succeeded;
  console.log(
    `  总计: ${total} 个工程，${chalk.green(String(succeeded) + ' 成功')}，${failed > 0 ? chalk.red(String(failed) + ' 失败') : chalk.dim('0 失败')}`
  );
  console.log('');
}

// 生成 Makefile 内容
function generateMakefile(projects: { name: string; path: string }[]): string {
  const lines: string[] = [
    '# SylixOS Workspace Makefile',
    '# 由 sydev build init 自动生成 — 可直接使用 make 编译，无需 sydev',
    '# 如需更新（新增/删除工程），重新运行 sydev build init',
    '',
  ];

  // WORKSPACE_ 变量
  for (const project of projects) {
    const varName = `WORKSPACE_${project.name.toUpperCase().replace(/-/g, '_')}`;
    lines.push(`export ${varName} = ${project.path}`);
  }

  lines.push('');
  lines.push('# ─── 工程 Targets ───────────────────────────────────────────────');

  // 每个工程的四个 target
  for (const project of projects) {
    const n = project.name;
    const varName = `WORKSPACE_${n.toUpperCase().replace(/-/g, '_')}`;

    lines.push('');
    lines.push(`# ${n}`);
    lines.push(`${n}:`);
    lines.push(`\tbear -- make -C $(${varName})`);
    lines.push('');
    lines.push(`clean-${n}:`);
    lines.push(`\t$(MAKE) -C $(${varName}) clean`);
    lines.push('');
    lines.push(`rebuild-${n}: clean-${n} ${n}`);
    lines.push('');
    lines.push(`cp-${n}:`);
    lines.push(`\t# TODO: 配置产物复制路径`);
    lines.push(`\t# cp $(${varName})/Debug/${n}.so /path/to/destination`);
  }

  // .PHONY
  lines.push('');
  const phonyTargets = projects.flatMap((p) => [
    p.name,
    `clean-${p.name}`,
    `rebuild-${p.name}`,
    `cp-${p.name}`,
  ]);

  // 分行，每行不超过若干项
  const phonyLine = `.PHONY: ${phonyTargets.join(' \\\n        ')}`;
  lines.push(phonyLine);
  lines.push('');

  return lines.join('\n');
}

export const buildCommand = new Command('build')
  .description('编译 SylixOS 工程')
  .argument('[project]', '工程名（精确匹配目录名）')
  .option('--all', '批量编译所有工程')
  .option('--quiet', '静默模式（不透传 make 输出）')
  .option('--verbose', '详细模式（批量时透传每个工程输出）')
  .allowUnknownOption()
  .addHelpText(
    'after',
    `
示例:
  $ sydev build                  # 交互式选择工程
  $ sydev build libcpu           # 编译指定工程
  $ sydev build --all            # 批量编译所有工程
  $ sydev build --all --verbose  # 批量编译并显示详细输出
  $ sydev build init             # 生成独立 Makefile
  $ sydev build libcpu -- -j4   # 透传 make 参数
`
  )
  .action(async (projectArg: string | undefined, opts: { all?: boolean; quiet?: boolean; verbose?: boolean }) => {
    const extraArgs = parseExtraArgs();
    const scanner = new WorkspaceScanner(process.cwd());
    const projects = scanner.scan();

    // --all 批量编译
    if (opts.all) {
      if (projects.length === 0) {
        console.error(
          chalk.yellow(
            '未找到工程（确认当前目录是 workspace 根目录，且工程子目录同时包含 .project 和 Makefile）'
          )
        );
        process.exit(1);
      }

      const runner = new BuildRunner(projects);
      let interrupted = false;

      // SIGINT 处理：询问是否继续
      const sigintHandler = async () => {
        interrupted = true;
        console.log('');
        const { default: inquirer } = await import('inquirer');
        const { continueBuilding } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueBuilding',
            message: '是否继续编译剩余工程？',
            default: false,
          },
        ]);
        if (!continueBuilding) {
          process.exit(1);
        }
        interrupted = false;
      };
      process.on('SIGINT', sigintHandler);

      runner.on('progress', (event: BuildProgressEvent) => {
        if (event.type === 'project-start') {
          const { name, index, total } = event;
          const progress = chalk.dim(`[${index + 1}/${total}]`);
          process.stdout.write(`\r${progress} ${name} ${chalk.dim('编译中...')}`);
        } else if (event.type === 'project-done') {
          const { result, index, total } = event;
          const progress = chalk.dim(`[${index + 1}/${total}]`);
          const time = chalk.dim(` ${formatDuration(result.durationMs)}`);
          if (result.success) {
            process.stdout.write(
              `\r${progress} ${result.name} ${chalk.green('✓')}${time}` +
              ' '.repeat(20) + '\n'
            );
          } else {
            process.stdout.write(
              `\r${progress} ${result.name} ${chalk.red('✗')}${time}` +
              (result.errorSummary ? chalk.red(' ' + result.errorSummary) : '') +
              '\n'
            );
          }
        } else if (event.type === 'stdout-line' && opts.verbose) {
          console.log(chalk.dim(event.line));
        } else if (event.type === 'warning') {
          console.log(chalk.yellow('⚠ ' + event.message));
        }
      });

      const result = await runner.buildAll({
        quiet: !opts.verbose,
        verbose: opts.verbose,
        extraArgs,
      });

      process.removeListener('SIGINT', sigintHandler);

      printBatchSummary(result.projects);
      process.exit(result.failed);
    }

    // 有工程名参数：单工程编译
    if (projectArg) {
      const found = projects.find((p) => p.name === projectArg);
      if (!found) {
        console.error(
          chalk.red(`未找到工程 '${projectArg}'，运行 sydev build 查看可用工程列表`)
        );
        process.exit(1);
      }

      const runner = new BuildRunner([found]);

      runner.on('progress', (event: BuildProgressEvent) => {
        if (event.type === 'stdout-line') {
          process.stdout.write(event.line + '\n');
        } else if (event.type === 'warning') {
          console.log(chalk.yellow('⚠ ' + event.message));
        }
      });

      const result = await runner.buildOne(found, {
        quiet: opts.quiet,
        extraArgs,
      });

      if (result.success) {
        console.log(
          chalk.green('✓ 编译成功') + chalk.dim(` (${formatDuration(result.durationMs)})`)
        );
        process.exit(0);
      } else {
        if (opts.quiet) {
          // quiet 模式下未实时输出，现在打印完整 stdout
          if (result.stdout) {
            process.stdout.write(result.stdout);
          }
          if (result.stderr) {
            process.stderr.write(result.stderr);
          }
        }
        printErrorSummary(result);
        process.exit(1);
      }
    }

    // 无参数：交互式选择
    if (projects.length === 0) {
      console.error(
        chalk.yellow(
          '未找到工程（确认当前目录是 workspace 根目录，且工程子目录同时包含 .project 和 Makefile）'
        )
      );
      process.exit(1);
    }

    const { default: inquirer } = await import('inquirer');
    const { selectedProjects } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedProjects',
        message: '选择要编译的工程：',
        choices: projects.map((p) => ({ name: p.name, value: p })),
        validate: (answer: readonly unknown[]) =>
          answer.length > 0 ? true : '请至少选择一个工程',
      },
    ]);

    if (!selectedProjects || selectedProjects.length === 0) {
      console.log(chalk.dim('未选择工程，退出。'));
      process.exit(0);
    }

    const runner = new BuildRunner(selectedProjects);
    let failedCount = 0;

    runner.on('progress', (event: BuildProgressEvent) => {
      if (event.type === 'stdout-line') {
        process.stdout.write(event.line + '\n');
      } else if (event.type === 'warning') {
        console.log(chalk.yellow('⚠ ' + event.message));
      }
    });

    for (const project of selectedProjects) {
      console.log(chalk.cyan(`编译 ${project.name}...`));
      const result = await runner.buildOne(project, { extraArgs });
      if (result.success) {
        console.log(
          chalk.green('✓ 编译成功') + chalk.dim(` (${formatDuration(result.durationMs)})`)
        );
      } else {
        printErrorSummary(result);
        failedCount++;
      }
    }

    process.exit(failedCount);
  });

// Task 2: build init 子命令
buildCommand
  .command('init')
  .description('生成 workspace 独立 Makefile（脱离 sydev 可直接 make 编译）')
  .action(async () => {
    const scanner = new WorkspaceScanner(process.cwd());
    const projects = scanner.scan();

    if (projects.length === 0) {
      console.error(
        chalk.yellow(
          '未找到工程（确认当前目录是 workspace 根目录，且工程子目录同时包含 .project 和 Makefile）'
        )
      );
      process.exit(1);
    }

    const makefilePath = path.join(process.cwd(), 'Makefile');
    const exists = fs.existsSync(makefilePath);

    if (exists) {
      console.log(chalk.dim('更新已有 Makefile'));
    }

    const content = generateMakefile(projects);
    fs.writeFileSync(makefilePath, content, 'utf-8');

    console.log(chalk.green('✓ Makefile 已生成: ./Makefile'));
    console.log(
      chalk.dim(
        `  包含 ${projects.length} 个工程 target，可直接运行 make <工程名> 编译`
      )
    );
  });
