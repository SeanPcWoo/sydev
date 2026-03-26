import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from '../utils/inquirer.js';
import { readFileSync } from 'fs';
import { ConfigManager } from '@sydev/core/config-manager.js';
import { InitOrchestrator } from '@sydev/core/init-orchestrator.js';
import { RlWrapper } from '@sydev/core/rl-wrapper.js';
import { fullConfigSchema } from '@sydev/core/schemas/index.js';
import { createCliProgressReporter } from '../utils/cli-progress.js';

export const initCommand = new Command('init')
  .description('从配置文件全流程初始化环境')
  .option('--config <file>', '配置文件路径 (JSON)')
  .addHelpText('after', `
示例:
  $ sydev init --config config.json   # 从配置文件初始化
`)
  .action(async (opts) => {
    if (!opts.config) {
      console.error(chalk.red('✗ 请指定配置文件: sydev init --config <file>'));
      return;
    }

    let raw: string;
    try {
      raw = readFileSync(opts.config, 'utf-8');
    } catch {
      console.error(chalk.red(`✗ 无法读取配置文件: ${opts.config}`));
      console.log(chalk.cyan('建议: 检查文件路径是否正确'));
      return;
    }

    let config: any;
    try {
      config = JSON.parse(raw);
    } catch {
      console.error(chalk.red('✗ 配置文件不是有效的 JSON'));
      console.log(chalk.cyan('建议: 使用 JSON 校验工具检查文件格式'));
      return;
    }

    // 支持模板文件格式: { type: "full", data: {...} }
    if (config.type === 'full' && config.data) {
      config = config.data;
    }

    if (!config.workspace) {
      console.error(chalk.red('✗ 配置文件缺少 workspace 配置'));
      console.log(chalk.cyan('建议: 配置文件至少需要包含 workspace 的平台和版本信息'));
      return;
    }

    // 先用占位值验证配置（cwd/basePath 在执行时收集，不要求配置文件包含）
    const preCheck = ConfigManager.validate(fullConfigSchema, {
      ...config,
      workspace: {
        ...config.workspace,
        cwd: config.workspace.cwd || '/tmp',
        basePath: config.workspace.basePath || '/tmp/base',
      },
    });
    if (!preCheck.valid) {
      console.error(chalk.red('✗ 配置验证失败:'));
      preCheck.errors?.forEach((e) => console.error(chalk.yellow(`  - ${e}`)));
      return;
    }

    // 验证通过后，交互收集 cwd 和 basePath
    if (!config.workspace.cwd) {
      const { cwd } = await inquirer.prompt([
        { type: 'input', name: 'cwd', message: 'Workspace 路径:', default: process.cwd() },
      ]);
      config.workspace.cwd = cwd.trim();
    }
    if (!config.workspace.basePath) {
      const { basePath } = await inquirer.prompt([
        {
          type: 'input', name: 'basePath', message: 'Base 目录路径:',
          default: `${config.workspace.cwd}/.realevo/base`,
        },
      ]);
      config.workspace.basePath = basePath.trim();
    }

    console.log(chalk.cyan('\n开始全流程初始化...\n'));

    const progressReporter = createCliProgressReporter();
    const rlWrapper = new RlWrapper(progressReporter);
    const orchestrator = new InitOrchestrator(rlWrapper, progressReporter);

    const result = await orchestrator.execute(config);

    if (result.success) {
      console.log(chalk.bold.green('\n✓ 全流程初始化成功!\n'));
      console.log(chalk.dim('已完成步骤:'));
      result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
    } else {
      console.error(chalk.red(`\n✗ 初始化失败: ${result.error}`));
      if (result.failedStep) {
        console.error(chalk.yellow(`  失败步骤: ${result.failedStep}`));
      }
      if (result.completedSteps.length) {
        console.log(chalk.dim('\n已完成步骤:'));
        result.completedSteps.forEach((s) => console.log(chalk.dim(`  - ${s}`)));
      }
      console.log(chalk.cyan('\n建议: 修复问题后重新运行 sydev init --config ' + opts.config));
    }

    progressReporter.removeAllListeners();
  });
