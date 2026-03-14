import inquirer from 'inquirer';
import chalk from 'chalk';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  ConfigManager,
  deviceSchema,
  type DeviceConfig
} from '@sydev/core';

export async function runDeviceWizard(): Promise<void> {
  console.log(chalk.bold.cyan('\n🔌 设备配置向导\n'));

  const answers = await inquirer.prompt([
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
      type: 'input',
      name: 'port',
      message: '端口:',
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
    port: parseInt(answers.port),
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
  console.log(chalk.dim(`  名称: ${config.name}`));
  console.log(chalk.dim(`  IP: ${config.ip}`));
  console.log(chalk.dim(`  端口: ${config.port}`));
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

  // 保存设备配置到 .sydev/devices.json
  const configDir = join(process.cwd(), '.sydev');
  const devicesFile = join(configDir, 'devices.json');

  let devices: DeviceConfig[] = [];
  if (existsSync(devicesFile)) {
    devices = JSON.parse(readFileSync(devicesFile, 'utf-8'));
  }

  devices.push(config);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(devicesFile, JSON.stringify(devices, null, 2));

  console.log(chalk.bold.green('\n✓ 设备添加成功!\n'));
  console.log(chalk.dim(`配置已保存到 ${devicesFile}\n`));
}
