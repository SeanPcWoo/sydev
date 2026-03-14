import inquirer from 'inquirer';
import chalk from 'chalk';
import { join } from 'path';
import {
  ConfigManager,
  projectSchema,
  RlWrapper,
  type ProjectConfig
} from '@openswitch/core';
import { createCliProgressReporter } from '../utils/cli-progress.js';

export async function runProjectWizard(): Promise<void> {
  console.log(chalk.bold.cyan('\n📦 项目创建向导\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '项目名称:',
      validate: (input: string) => {
        const trimmed = input.trim();
        if (trimmed.length < 3) {
          return '项目名称至少 3 个字符';
        }
        if (trimmed.length > 50) {
          return '项目名称最多 50 个字符';
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
          return '项目名称只能包含字母、数字、下划线和连字符';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'type',
      message: '项目类型:',
      choices: [
        { name: '应用程序 (app)', value: 'app' },
        { name: '库 (lib)', value: 'lib' },
        { name: '驱动 (driver)', value: 'driver' }
      ],
      default: 'app'
    },
    {
      type: 'input',
      name: 'template',
      message: '模板名称 (可选):',
      default: ''
    },
    {
      type: 'input',
      name: 'path',
      message: '项目路径:',
      default: (answers: any) => join(process.cwd(), answers.name),
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '路径不能为空';
        }
        return true;
      }
    }
  ]);

  const config: ProjectConfig = {
    name: answers.name.trim(),
    type: answers.type,
    template: answers.template.trim() || undefined,
    path: answers.path.trim()
  };

  const validation = ConfigManager.validate(projectSchema, config);
  if (!validation.valid) {
    console.error(chalk.red('\n✗ 配置验证失败:'));
    validation.errors?.forEach(err => console.error(chalk.yellow(`  - ${err}`)));
    process.exit(1);
  }

  console.log(chalk.bold('\n📋 配置摘要:'));
  console.log(chalk.dim(`  名称: ${config.name}`));
  console.log(chalk.dim(`  类型: ${config.type}`));
  if (config.template) {
    console.log(chalk.dim(`  模板: ${config.template}`));
  }
  console.log(chalk.dim(`  路径: ${config.path}`));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确认创建?',
      default: true
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('\n已取消'));
    return;
  }

  console.log(chalk.cyan('\n开始创建项目...\n'));

  const progressReporter = createCliProgressReporter();
  const rlWrapper = new RlWrapper(progressReporter);

  const result = await rlWrapper.createProject({
    name: config.name,
    type: config.type,
    path: config.path!
  });

  if (result.success) {
    console.log(chalk.bold.green('\n✓ 项目创建成功!\n'));
  } else {
    console.error(chalk.red(`\n✗ 创建失败: ${result.error}\n`));
    if (result.fixSuggestion) {
      console.error(chalk.cyan(`建议: ${result.fixSuggestion}\n`));
    }
    process.exit(1);
  }
}
