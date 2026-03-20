import { Command } from 'commander';
import chalk from 'chalk';
import { ProjectOptionParser, generateHelpExample } from '../options/index.js';
import { WorkspaceScanner } from '@sydev/core/workspace-scanner.js';

const helpExamples = {
  '交互式创建 (推荐)': 'sydev project create',
  '导入 Git 仓库': 'sydev project create --mode import --name my-proj --source https://github.com/xxx/repo.git --branch main --make-tool make',
  '新建工程': 'sydev project create --mode create --name my-proj --template app --type cmake --debug-level release --make-tool make',
  '使用配置文件': 'sydev project create --config project.json',
};

export const projectCommand = new Command('project')
  .description('管理 SylixOS 项目')
  .addHelpText('after', generateHelpExample('project', helpExamples));

projectCommand
  .command('create')
  .description('创建新项目（支持交互式和非交互模式）')
  .option('--mode <mode>', '操作模式 (import|create)')
  .option('--name <name>', '项目名称')
  .option('--source <url>', 'Git 仓库地址 (mode=import 时需要)')
  .option('--branch <branch>', 'Git 分支 (mode=import 时需要)')
  .option('--template <template>', '项目模板 (app|lib|common|ko|python_native_lib|uorb_pubsub|vsoa_pubsub|fast_dds_pubsub)')
  .option('--type <type>', '构建类型 (cmake|automake|realevo|ros2|python|cython|go|javascript)')
  .option('--debug-level <level>', '调试级别 (release|debug)')
  .option('--make-tool <tool>', '构建工具 (make|ninja)')
  .option('--config <file>', 'JSON 配置文件路径')
  .action(async (options) => {
    const parser = new ProjectOptionParser();

    if (parser.hasEnoughOptions(options)) {
      try {
        console.log(chalk.cyan('🚀 项目创建 (非交互模式)\n'));
        const { config } = parser.parse(options);

        const { runProjectInit } = await import('../wizards/project-wizard.js');
        await runProjectInit(config);
      } catch (err: any) {
        console.error(chalk.red(`\n✗ 错误: ${err.message}`));
        process.exit(1);
      }
    } else {
      const { runProjectWizard } = await import('../wizards/project-wizard.js');
      await runProjectWizard();
    }
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

    const scanner = new WorkspaceScanner(process.cwd());
    const dirs = scanner.scan().map((project) => project.name);

    if (dirs.length === 0) {
      console.log(chalk.dim('  未找到项目'));
    } else {
      console.log(chalk.green(`✓ 找到 ${dirs.length} 个项目:`));
      dirs.forEach(name => console.log(chalk.dim(`  - ${name}`)));
    }
  });
