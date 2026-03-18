import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { UploadRunner } from '@sydev/core/upload-runner.js';
import { WorkspaceScanner } from '@sydev/core/workspace-scanner.js';
import { deviceSchema, type DeviceConfig } from '@sydev/core/schemas/device-schema.js';
import type { UploadProgressEvent, UploadProjectResult } from '@sydev/core/upload-runner.js';
import type { ScannedProject } from '@sydev/core/workspace-scanner.js';

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** 从 workspace 配置加载已配置的设备 */
function loadDevices(workspaceRoot: string): Map<string, DeviceConfig> {
  const devices = new Map<string, DeviceConfig>();

  // 读取 .realevo/config.json 中的设备信息
  try {
    const configPath = join(workspaceRoot, '.realevo', 'config.json');
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      if (config.devices && Array.isArray(config.devices)) {
        for (const device of config.devices) {
          const parsed = deviceSchema.safeParse(device);
          if (parsed.success) {
            devices.set(device.name, parsed.data);
          }
        }
      }
    }
  } catch (err) {
    // 静默失败，返回空设备列表
  }

  return devices;
}

/** 获取所有工程（包含 base，如果存在） */
function getProjectsWithBase(projects: ScannedProject[], workspaceRoot: string): ScannedProject[] {
  const allProjects = [...projects];

  // 检查 base 工程
  try {
    const configPath = join(workspaceRoot, '.realevo', 'config.json');
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      if (config.base && existsSync(join(config.base, '.reproject'))) {
        const hasBase = allProjects.some(p => p.name === 'base');
        if (!hasBase) {
          allProjects.unshift({ name: 'base', path: config.base });
        }
      }
    }
  } catch {
    // 静默失败
  }

  return allProjects;
}

export const uploadCommand = new Command('upload')
  .description('上传 SylixOS 工程产物到设备')
  .argument('[projects]', '工程名列表（多个工程用逗号或冒号分隔，或单工程名）')
  .option('--device <name>', '指定目标设备（默认从 .reproject 读取）')
  .option('--all', '上传全部工程')
  .option('--quiet', '静默模式')
  .addHelpText('after', `
示例:
  $ sydev upload                      # 交互式选择工程（支持多选）和设备
  $ sydev upload libcpu               # 上传指定工程
  $ sydev upload libcpu,libnet        # 上传多个工程（逗号分隔）
  $ sydev upload libcpu:libnet        # 上传多个工程（冒号分隔）
  $ sydev upload libcpu --device board1   # 上传到指定设备
  $ sydev upload --all                # 上传全部工程
`)
  .action(async (projectsArg: string | undefined, opts: { device?: string; all?: boolean; quiet?: boolean }) => {
    const scanner = new WorkspaceScanner(process.cwd());
    let projects = scanner.scan();
    // 添加 base 工程（如果存在）
    projects = getProjectsWithBase(projects, process.cwd());
    const devices = loadDevices(process.cwd());

    if (projects.length === 0) {
      console.error(chalk.yellow('未找到工程（确认当前目录是 workspace 根目录，且工程子目录同时包含 .project 和 Makefile）'));
      process.exit(1);
    }

    if (devices.size === 0) {
      console.error(chalk.yellow('未配置设备（运行 sydev device add 添加设备）'));
      process.exit(1);
    }

    // 解析多工程参数（逗号或冒号分隔）
    const parseProjectNames = (arg: string): string[] => {
      return arg.split(/[,:]+/).map(n => n.trim()).filter(n => n.length > 0);
    };

    // 从工程名列表查找对应的工程对象
    const findProjects = (names: string[]): { projects: typeof projects; notFound: string[] } => {
      const found = [];
      const notFound = [];
      for (const name of names) {
        const project = projects.find(p => p.name === name);
        if (project) {
          found.push(project);
        } else {
          notFound.push(name);
        }
      }
      return { projects: found, notFound };
    };

    // 多工程上传处理
    if (projectsArg) {
      const projectNames = parseProjectNames(projectsArg);
      const { projects: selectedProjects, notFound } = findProjects(projectNames);

      if (notFound.length > 0) {
        console.error(chalk.red(`未找到工程: ${notFound.join(', ')}`));
        process.exit(1);
      }

      if (selectedProjects.length === 0) {
        console.error(chalk.red('没有有效的工程'));
        process.exit(1);
      }

      // 多工程上传（需要指定设备）
      if (selectedProjects.length > 1) {
        if (!opts.device) {
          console.error(chalk.yellow('上传多个工程时必须指定设备 (--device)'));
          process.exit(1);
        }

        const runner = new UploadRunner(projects, process.cwd(), devices);
        let failedCount = 0;

        for (const project of selectedProjects) {
          console.log(chalk.cyan(`上传 ${project.name}...`));
          runner.on('progress', (event: UploadProgressEvent) => {
            if (event.type === 'file-upload' && !opts.quiet) {
              console.log(chalk.dim(`  上传: ${event.file} → ${event.remotePath}`));
            }
          });

          const result = await runner.uploadOne(project, { device: opts.device, quiet: opts.quiet });
          if (result.success) {
            console.log(chalk.green('✓ 上传成功') + chalk.dim(` (${formatDuration(result.durationMs)})`));
          } else {
            console.error(chalk.red(`✗ 上传失败: ${result.message}`));
            failedCount++;
          }
        }

        process.exit(failedCount);
      }

      // 单工程上传（与原逻辑相同）
      const project = selectedProjects[0];
      const runner = new UploadRunner(projects, process.cwd(), devices);
      runner.on('progress', (event: UploadProgressEvent) => {
        if (event.type === 'file-upload' && !opts.quiet) {
          console.log(chalk.dim(`  上传: ${event.file} → ${event.remotePath}`));
        }
      });

      const result = await runner.uploadOne(project, { device: opts.device, quiet: opts.quiet });
      if (result.success) {
        console.log(chalk.green('✓ 上传成功') + chalk.dim(` (${formatDuration(result.durationMs)})`));
        process.exit(0);
      } else {
        console.error(chalk.red(`✗ 上传失败: ${result.message}`));
        process.exit(1);
      }
    }

    // --all 批量上传
    if (opts.all) {
      if (!opts.device) {
        console.error(chalk.yellow('上传所有工程时必须指定设备 (--device)'));
        process.exit(1);
      }

      const runner = new UploadRunner(projects, process.cwd(), devices);
      let failedCount = 0;

      runner.on('progress', (event: UploadProgressEvent) => {
        if (event.type === 'file-upload' && !opts.quiet) {
          console.log(chalk.dim(`  上传: ${event.file} → ${event.remotePath}`));
        }
      });

      for (const project of projects) {
        console.log(chalk.cyan(`上传 ${project.name}...`));
        const result = await runner.uploadOne(project, { device: opts.device, quiet: opts.quiet });
        if (result.success) {
          console.log(chalk.green('��� 上传成功') + chalk.dim(` (${formatDuration(result.durationMs)})`));
        } else {
          console.error(chalk.red(`✗ 上传失败: ${result.message}`));
          failedCount++;
        }
      }

      process.exit(failedCount);
    }

    // 交互式选择
    const { default: inquirer } = await import('inquirer');

    const { selectedProjects } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedProjects',
      message: '选择要上传的工程（可多选）：',
      choices: projects.map((p) => ({ name: p.name, value: p })),
      validate: (answer: readonly unknown[]) => answer.length > 0 ? true : '请至少选择一个工程',
    }]);

    if (!selectedProjects || selectedProjects.length === 0) {
      console.log(chalk.dim('未选择，退出。'));
      process.exit(0);
    }

    const { selectedDevice } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedDevice',
      message: '选择目标设备：',
      choices: Array.from(devices.keys()),
    }]);

    if (!selectedDevice) {
      console.log(chalk.dim('未选择，退出。'));
      process.exit(0);
    }

    const runner = new UploadRunner(projects, process.cwd(), devices);
    let failedCount = 0;

    for (const project of selectedProjects) {
      console.log(chalk.cyan(`上传 ${project.name}...`));
      runner.on('progress', (event: UploadProgressEvent) => {
        if (event.type === 'file-upload' && !opts.quiet) {
          console.log(chalk.dim(`  上传: ${event.file} → ${event.remotePath}`));
        }
      });

      const result = await runner.uploadOne(project, { device: selectedDevice, quiet: opts.quiet });
      if (result.success) {
        console.log(chalk.green('✓ 上传成功') + chalk.dim(` (${formatDuration(result.durationMs)})`));
      } else {
        console.error(chalk.red(`✗ 上传失败: ${result.message}`));
        failedCount++;
      }
    }

    process.exit(failedCount);
  });
