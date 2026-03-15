import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  ConfigManager,
  deviceSchema,
  RlWrapper,
  PLATFORMS,
  type DeviceConfig
} from '@sydev/core';
import { createCliProgressReporter } from '../utils/cli-progress.js';

export async function runDeviceWizard(): Promise<void> {
  console.log(chalk.bold.cyan('\n🔌 设备配置向导\n'));

  const answers = await inquirer.prompt([
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
      type: 'input',
      name: 'name',
      message: '设备名称:',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '设备名称不能为空';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'ip',
      message: 'IP 地址:',
      validate: (input: string) => {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(input.trim())) {
          return '必须是有效的 IPv4 地址（如 192.168.1.100）';
        }
        const parts = input.trim().split('.');
        if (parts.some(p => parseInt(p) > 255)) {
          return 'IP 地址每段必须在 0-255 之间';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'platform',
      message: '设备平台:',
      choices: PLATFORMS,
      default: 'ARM64_GENERIC'
    },
    {
      type: 'input',
      name: 'ssh',
      message: 'SSH 端口:',
      default: '22',
      validate: (input: string) => {
        const port = parseInt(input);
        if (isNaN(port) || port < 1 || port > 65535) {
          return '端口必须在 1-65535 之间';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'telnet',
      message: 'Telnet 端口:',
      default: '23',
      validate: (input: string) => {
        const port = parseInt(input);
        if (isNaN(port) || port < 1 || port > 65535) {
          return '端口必须在 1-65535 之间';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'ftp',
      message: 'FTP 端口:',
      default: '21',
      validate: (input: string) => {
        const port = parseInt(input);
        if (isNaN(port) || port < 1 || port > 65535) {
          return '端口必须在 1-65535 之间';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'gdb',
      message: 'GDB 端口:',
      default: '1234',
      validate: (input: string) => {
        const port = parseInt(input);
        if (isNaN(port) || port < 1 || port > 65535) {
          return '端口必须在 1-65535 之间';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'username',
      message: '用户名:',
      default: 'root',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '用户名不能为空';
        }
        return true;
      }
    },
    {
      type: 'password',
      name: 'password',
      message: '密码 (可选):',
      mask: '*'
    }
  ]);

  const config: DeviceConfig = {
    name: answers.name.trim(),
    ip: answers.ip.trim(),
    platform: answers.platform.trim(),
    ssh: parseInt(answers.ssh),
    telnet: parseInt(answers.telnet),
    ftp: parseInt(answers.ftp),
    gdb: parseInt(answers.gdb),
    username: answers.username.trim(),
    password: answers.password || undefined
  };

  const validation = ConfigManager.validate(deviceSchema, config);
  if (!validation.valid) {
    console.error(chalk.red('\n✗ 配置验证失败:'));
    validation.errors?.forEach(err => console.error(chalk.yellow(`  - ${err}`)));
    process.exit(1);
  }

  console.log(chalk.bold('\n📋 配置摘要:'));
  console.log(chalk.dim(`  Workspace: ${answers.cwd}`));
  console.log(chalk.dim(`  名称: ${config.name}`));
  console.log(chalk.dim(`  IP: ${config.ip}`));
  console.log(chalk.dim(`  平台: ${config.platform}`));
  console.log(chalk.dim(`  SSH: ${config.ssh}`));
  console.log(chalk.dim(`  Telnet: ${config.telnet}`));
  console.log(chalk.dim(`  FTP: ${config.ftp}`));
  console.log(chalk.dim(`  GDB: ${config.gdb}`));
  console.log(chalk.dim(`  用户名: ${config.username}`));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确认添加设备?',
      default: true
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('\n已取消'));
    return;
  }

  console.log(chalk.cyan('\n正在添加设备...\n'));

  const progressReporter = createCliProgressReporter();
  const rlWrapper = new RlWrapper(progressReporter);

  const result = await rlWrapper.addDevice({
    name: config.name,
    ip: config.ip,
    platform: config.platform,
    ssh: config.ssh,
    telnet: config.telnet,
    ftp: config.ftp,
    gdb: config.gdb,
    username: config.username,
    password: config.password
  });

  if (result.success) {
    console.log(chalk.bold.green('\n✓ 设备添加成功!\n'));
  } else {
    console.error(chalk.red(`\n✗ 添加失败: ${result.error}\n`));
    if (result.fixSuggestion) {
      console.error(chalk.cyan(`建议: ${result.fixSuggestion}\n`));
    }
    process.exit(1);
  }
}
