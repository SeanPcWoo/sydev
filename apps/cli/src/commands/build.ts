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

function printErrorSummary(result: BuildProjectResult): void {
  const lines = result.errorLines ?? [];
  console.error(chalk.red('\u2717 \u7f16\u8bd1\u5931\u8d25') + chalk.dim(` (${lines.length} \u4e2a\u9519\u8bef)`));
  for (const line of lines) {
    console.error(chalk.red('  > ' + line));
  }
}

export const buildCommand = new Command('build')
  .description('\u7f16\u8bd1 SylixOS \u5de5\u7a0b')
  .argument('[project]', '\u5de5\u7a0b\u540d\uff08\u7cbe\u786e\u5339\u914d\u76ee\u5f55\u540d\uff09')
  .option('--quiet', '\u9759\u9ed8\u6a21\u5f0f\uff08\u4e0d\u900f\u4f20 make \u8f93\u51fa\uff09')
  .allowUnknownOption()
  .addHelpText('after', `
\u793a\u4f8b:
  $ sydev build                  # \u4ea4\u4e92\u5f0f\u9009\u62e9\u5de5\u7a0b\u6216\u6a21\u677f
  $ sydev build libcpu           # \u7f16\u8bd1\u6307\u5b9a\u5de5\u7a0b
  $ sydev build init             # \u751f\u6210/\u66f4\u65b0 .sydev/Makefile
  $ sydev build libcpu -- -j4   # \u900f\u4f20 make \u53c2\u6570
`)
  .action(async (projectArg: string | undefined, opts: { quiet?: boolean }) => {
    const extraArgs = parseExtraArgs();
    const scanner = new WorkspaceScanner(process.cwd());
    const projects = scanner.scan();

    // \u6709\u5de5\u7a0b\u540d\u53c2\u6570\uff1a\u5355\u5de5\u7a0b\u7f16\u8bd1
    if (projectArg) {
      const found = projects.find((p) => p.name === projectArg);
      if (!found) {
        console.error(chalk.red(`\u672a\u627e\u5230\u5de5\u7a0b '${projectArg}'\uff0c\u8fd0\u884c sydev build \u67e5\u770b\u53ef\u7528\u5de5\u7a0b\u5217\u8868`));
        process.exit(1);
      }
      const runner = new BuildRunner(projects, process.cwd());
      runner.ensureMakefile();
      runner.on('progress', (event: BuildProgressEvent) => {
        if (event.type === 'stdout-line') process.stdout.write(event.line + '\n');
        else if (event.type === 'warning') console.log(chalk.yellow('\u26a0 ' + event.message));
      });
      const result = await runner.buildOne(found, { quiet: opts.quiet, extraArgs });
      if (result.success) {
        console.log(chalk.green('\u2713 \u7f16\u8bd1\u6210\u529f') + chalk.dim(` (${formatDuration(result.durationMs)})`));
        process.exit(0);
      } else {
        if (opts.quiet) {
          if (result.stdout) process.stdout.write(result.stdout);
          if (result.stderr) process.stderr.write(result.stderr);
        }
        printErrorSummary(result);
        process.exit(1);
      }
    }
    // \u65e0\u53c2\u6570\uff1a\u4ea4\u4e92\u5f0f\u9009\u62e9
    if (projects.length === 0) {
      console.error(chalk.yellow('\u672a\u627e\u5230\u5de5\u7a0b\uff08\u786e\u8ba4\u5f53\u524d\u76ee\u5f55\u662f workspace \u6839\u76ee\u5f55\uff0c\u4e14\u5de5\u7a0b\u5b50\u76ee\u5f55\u540c\u65f6\u5305\u542b .project \u548c Makefile\uff09'));
      process.exit(1);
    }
    const runner = new BuildRunner(projects, process.cwd());
    runner.ensureMakefile();
    const templates = runner.parseUserTemplates();
    const { default: inquirer } = await import('inquirer');
    const choices: { name: string; value: unknown }[] = projects.map((p) => ({ name: p.name, value: p }));
    if (templates.length > 0) {
      choices.push(new inquirer.Separator('\u2500\u2500 \u7f16\u8bd1\u6a21\u677f \u2500\u2500') as unknown as { name: string; value: unknown });
      for (const t of templates) {
        choices.push({ name: chalk.cyan(t), value: { name: t, path: '', isTemplate: true } });
      }
    }
    const { selectedItems } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedItems',
      message: '\u9009\u62e9\u8981\u7f16\u8bd1\u7684\u5de5\u7a0b\u6216\u6a21\u677f\uff1a',
      choices,
      validate: (answer: readonly unknown[]) => answer.length > 0 ? true : '\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a',
    }]);
    if (!selectedItems || selectedItems.length === 0) {
      console.log(chalk.dim('\u672a\u9009\u62e9\uff0c\u9000\u51fa\u3002'));
      process.exit(0);
    }
    let failedCount = 0;
    runner.on('progress', (event: BuildProgressEvent) => {
      if (event.type === 'stdout-line') process.stdout.write(event.line + '\n');
      else if (event.type === 'warning') console.log(chalk.yellow('\u26a0 ' + event.message));
    });
    for (const item of selectedItems) {
      if (item.isTemplate) {
        console.log(chalk.cyan(`\u6267\u884c\u6a21\u677f ${item.name}...`));
        const result = await runner.buildOne({ name: item.name, path: process.cwd() }, { extraArgs });
        if (result.success) {
          console.log(chalk.green('\u2713 \u6a21\u677f\u6267\u884c\u6210\u529f') + chalk.dim(` (${formatDuration(result.durationMs)})`));
        } else {
          printErrorSummary(result);
          failedCount++;
        }
      } else {
        console.log(chalk.cyan(`\u7f16\u8bd1 ${item.name}...`));
        const result = await runner.buildOne(item, { extraArgs });
        if (result.success) {
          console.log(chalk.green('\u2713 \u7f16\u8bd1\u6210\u529f') + chalk.dim(` (${formatDuration(result.durationMs)})`));
        } else {
          printErrorSummary(result);
          failedCount++;
        }
      }
    }
    process.exit(failedCount);
  });

// build init \u5b50\u547d\u4ee4
buildCommand
  .command('init')
  .description('\u751f\u6210/\u66f4\u65b0 .sydev/Makefile\uff08\u8131\u79bb sydev \u53ef\u76f4\u63a5 make \u7f16\u8bd1\uff09')
  .action(async () => {
    const scanner = new WorkspaceScanner(process.cwd());
    const projects = scanner.scan();
    if (projects.length === 0) {
      console.error(chalk.yellow('\u672a\u627e\u5230\u5de5\u7a0b\uff08\u786e\u8ba4\u5f53\u524d\u76ee\u5f55\u662f workspace \u6839\u76ee\u5f55\uff0c\u4e14\u5de5\u7a0b\u5b50\u76ee\u5f55\u540c\u65f6\u5305\u542b .project \u548c Makefile\uff09'));
      process.exit(1);
    }
    const runner = new BuildRunner(projects, process.cwd());
    runner.ensureMakefile();
    console.log(chalk.green('\u2713 Makefile \u5df2\u751f\u6210: .sydev/Makefile'));
    console.log(chalk.dim(`  \u5305\u542b ${projects.length} \u4e2a\u5de5\u7a0b target\uff0c\u53ef\u76f4\u63a5\u8fd0\u884c make -f .sydev/Makefile <\u5de5\u7a0b\u540d> \u7f16\u8bd1`));
  });
