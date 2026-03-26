import { Command } from 'commander';
import chalk from 'chalk';
import { checkEnvironment } from '@sydev/core/env-checker.js';
import { WorkspaceOptionParser, generateHelpExample } from '../options/index.js';

const helpExamples = {
  '交互式初始化 (推荐)': 'sydev workspace init',
  '完整命令行参数': 'sydev workspace init --cwd /path/to/ws --base-path /path/to/base --version default --platforms ARM64_GENERIC,X86_64 --os sylixos --debug-level release --arm64-page-shift 14 --base-components libsylixos,openssl --create-base --build',
  '使用配置文件': 'sydev workspace init --config workspace.json',
  '配置文件 + 命令行覆盖': 'sydev workspace init --config workspace.json --platforms X86_64',
};

export const workspaceCommand = new Command('workspace')
  .description('管理 SylixOS workspace')
  .addHelpText('after', generateHelpExample('workspace', helpExamples));

workspaceCommand
  .command('init')
  .description('初始化 workspace（支持交互式和非交互模式）')
  .option('--cwd <path>', 'Workspace 路径')
  .option('--base-path <path>', 'Base 目录路径')
  .option('--version <version>', 'Base 版本 (default|ecs_3.6.5|lts_3.6.5|lts_3.6.5_compiled|research|custom)')
  .option('--platforms <platforms>', '目标平台，逗号分隔 (ARM64_GENERIC,X86_64 等)')
  .option('--os <os>', '操作系统 (sylixos|linux)')
  .option('--debug-level <level>', '调试级别 (release|debug)')
  .option('--arm64-page-shift <shift>', 'ARM64 页偏移 (12=4K, 14=16K, 16=64K)')
  .option('--base-components <components>', 'Base 编译组件，逗号分隔 (如 libsylixos,openssl；其中 libsylixos 必选)')
  .option('--custom-repo <repo>', '自定义仓库地址 (version=custom 时需要)')
  .option('--custom-branch <branch>', '自定义仓库分支 (version=custom 时需要)')
  .option('--research-branch <branch>', 'Research 分支 (version=research 时需要)')
  .option('--create-base', '创建新 Base (默认: true)')
  .option('--no-create-base', '不创建 Base')
  .option('--build', '编译 Base (默认: false)')
  .option('--config <file>', 'JSON 配置文件路径')
  .action(async (options) => {
    const parser = new WorkspaceOptionParser();

    // 判断是否有足够的参数进入非交互模式
    if (parser.hasEnoughOptions(options)) {
      try {
        // 非交互模式
        console.log(chalk.cyan('🚀 Workspace 初始化 (非交互模式)\n'));
        const { config } = parser.parse(options);

        // 转换为初始化格式并执行
        const { runWorkspaceInit } = await import('../wizards/workspace-wizard.js');
        const initConfig: any = {
          version: config.version,
          cwd: config.cwd,
          basePath: config.basePath,
          platform: config.platforms,
          os: config.os,
          debugLevel: config.debugLevel,
          arm64PageShift: config.arm64PageShift,
          baseComponents: config.baseComponents,
          createbase: config.createBase,
          build: config.build,
          ...(config.version === 'custom' && {
            customRepo: config.customRepo,
            customBranch: config.customBranch,
          }),
          ...(config.version === 'research' && {
            researchBranch: config.researchBranch,
          }),
        };

        await runWorkspaceInit(initConfig);
      } catch (err: any) {
        console.error(chalk.red(`\n✗ 错误: ${err.message}`));
        process.exit(1);
      }
    } else {
      // 交互式模式
      const { runWorkspaceWizard } = await import('../wizards/workspace-wizard.js');
      await runWorkspaceWizard();
    }
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
      console.log(chalk.dim('  运行 sydev workspace init 开始初始化'));
    }
  });
