import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { ProgressReporter } from '@sydev/core';

export function createCliProgressReporter(): ProgressReporter {
  const reporter = new ProgressReporter();
  let spinner: Ora | null = null;

  reporter.on('step', ({ name, progress }) => {
    if (progress === 0) {
      // 开始新步骤
      spinner = ora({
        text: name,
        color: 'cyan'
      }).start();
    } else if (progress === 100) {
      // 步骤完成
      if (spinner) {
        spinner.succeed(chalk.green(name));
        spinner = null;
      }
    } else {
      // 更新进度
      if (spinner) {
        spinner.text = `${name} (${progress}%)`;
      }
    }
  });

  reporter.on('success', (message) => {
    if (spinner) {
      spinner.succeed(chalk.green(message));
      spinner = null;
    } else {
      console.log(chalk.green(`✓ ${message}`));
    }
  });

  reporter.on('error', ({ error, stack, fixSuggestion }) => {
    if (spinner) {
      spinner.fail(chalk.red(error));
      spinner = null;
    } else {
      console.error(chalk.red(`✗ ${error}`));
    }

    if (fixSuggestion) {
      console.error(chalk.cyan(`  建议: ${fixSuggestion}`));
    }

    if (stack) {
      console.error(chalk.dim(`\n${stack}`));
    }
  });

  reporter.on('output', (output) => {
    if (spinner) {
      spinner.stop();
    }
    console.log(chalk.dim(output));
    if (spinner) {
      spinner.start();
    }
  });

  return reporter;
}
