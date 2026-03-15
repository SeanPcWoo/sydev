import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  ConfigManager,
  projectSchema,
  RlWrapper,
  type ProjectConfig
} from '@sydev/core';
import { createCliProgressReporter } from '../utils/cli-progress.js';

export async function runProjectWizard(): Promise<void> {
  console.log(chalk.bold.cyan('\n📦 项目创建向导\n'));

  // 第一阶段：workspace 路径和导入/新建选择
  const phase1 = await inquirer.prompt([
    {
      type: 'input',
      name: 'cwd',
      message: 'Workspace 路径:',
      default: process.cwd(),
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '工作路径不能为空';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'mode',
      message: '选择操作:',
      choices: [
        { name: '导入已有 Git 工程', value: 'import' },
        { name: '新建工程', value: 'create' }
      ]
    }
  ]);

  let config: ProjectConfig;

  // 第二阶段：根据选择分支处理
  if (phase1.mode === 'import') {
    // 导入模式
    const importAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'source',
        message: 'Git 仓库地址:',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Git 仓库地址不能为空';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'branch',
        message: 'Git 分支:',
        default: 'master'
      },
      {
        type: 'input',
        name: 'name',
        message: '项目名称:',
        default: (answers: any) => {
          // 从 git 仓库 URL 提取项目名称
          const source = answers.source?.trim() || '';
          const match = source.match(/\/([^/]+?)(\.git)?$/);
          return match ? match[1] : '';
        },
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
        name: 'makeTool',
        message: '构建工具:',
        choices: [
          { name: 'Make', value: 'make' },
          { name: 'Ninja', value: 'ninja' }
        ],
        default: 'make'
      }
    ]);

    config = {
      name: importAnswers.name.trim(),
      source: importAnswers.source.trim(),
      branch: importAnswers.branch.trim(),
      makeTool: importAnswers.makeTool
    };
  } else {
    // 新建模式
    const createAnswers = await inquirer.prompt([
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
        name: 'template',
        message: '项目模板:',
        choices: [
          { name: '应用程序 (app)', value: 'app' },
          { name: '库 (lib)', value: 'lib' },
          { name: '公共模块 (common)', value: 'common' },
          { name: '内核模块 (ko)', value: 'ko' },
          { name: 'Python 原生库 (python_native_lib)', value: 'python_native_lib' },
          { name: 'uORB 发布订阅 (uorb_pubsub)', value: 'uorb_pubsub' },
          { name: 'VSOA 发布订阅 (vsoa_pubsub)', value: 'vsoa_pubsub' },
          { name: 'Fast DDS 发布订阅 (fast_dds_pubsub)', value: 'fast_dds_pubsub' }
        ],
        default: 'app'
      },
      {
        type: 'list',
        name: 'type',
        message: '构建类型:',
        choices: [
          { name: 'CMake', value: 'cmake' },
          { name: 'Automake', value: 'automake' },
          { name: 'RealEvo', value: 'realevo' },
          { name: 'ROS2', value: 'ros2' },
          { name: 'Python', value: 'python' },
          { name: 'Cython', value: 'cython' },
          { name: 'Go', value: 'go' },
          { name: 'JavaScript', value: 'javascript' }
        ],
        default: 'cmake'
      },
      {
        type: 'list',
        name: 'debugLevel',
        message: '调试级别:',
        choices: [
          { name: 'Release', value: 'release' },
          { name: 'Debug', value: 'debug' }
        ],
        default: 'release'
      },
      {
        type: 'list',
        name: 'makeTool',
        message: '构建工具:',
        choices: [
          { name: 'Make', value: 'make' },
          { name: 'Ninja', value: 'ninja' }
        ],
        default: 'make'
      }
    ]);

    config = {
      name: createAnswers.name.trim(),
      template: createAnswers.template,
      type: createAnswers.type,
      debugLevel: createAnswers.debugLevel,
      makeTool: createAnswers.makeTool
    };
  }

  // 验证配置
  const validation = ConfigManager.validate(projectSchema, config);
  if (!validation.valid) {
    console.error(chalk.red('\n✗ 配置验证失败:'));
    validation.errors?.forEach(err => console.error(chalk.yellow(`  - ${err}`)));
    process.exit(1);
  }

  // 显示配置摘要
  console.log(chalk.bold('\n📋 配置摘要:'));
  console.log(chalk.dim(`  Workspace 路径: ${phase1.cwd}`));
  console.log(chalk.dim(`  项目名称: ${config.name}`));
  if (phase1.mode === 'import') {
    console.log(chalk.dim(`  模式: 导入已有 Git 工程`));
    console.log(chalk.dim(`  Git 仓库: ${config.source}`));
    console.log(chalk.dim(`  Git 分支: ${config.branch}`));
    console.log(chalk.dim(`  构建工具: ${config.makeTool}`));
  } else {
    console.log(chalk.dim(`  模式: 新建工程`));
    console.log(chalk.dim(`  项目模板: ${config.template}`));
    console.log(chalk.dim(`  构建类型: ${config.type}`));
    console.log(chalk.dim(`  调试级别: ${config.debugLevel}`));
    console.log(chalk.dim(`  构建工具: ${config.makeTool}`));
  }

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
    template: config.template,
    type: config.type,
    source: config.source,
    branch: config.branch,
    debugLevel: config.debugLevel,
    makeTool: config.makeTool,
    cwd: phase1.cwd
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
