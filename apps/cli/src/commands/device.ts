import { Command } from 'commander';
import chalk from 'chalk';
import { DeviceOptionParser, generateHelpExample } from '../options/index.js';

const helpExamples = {
  '交互式添加 (推荐)': 'sydev device add',
  '完整命令行参数': 'sydev device add --name dev1 --ip 192.168.1.100 --platforms ARM64_GENERIC,X86_64 --username root --password root --ssh 22 --telnet 23 --ftp 21 --gdb 1234',
  '使用配置文件': 'sydev device add --config device.json',
};

export const deviceCommand = new Command('device')
  .description('管理目标设备')
  .addHelpText('after', generateHelpExample('device', helpExamples));

deviceCommand
  .command('add')
  .description('添加目标设备（支持交互式和非交互模式）')
  .option('--name <name>', '设备名称')
  .option('--ip <ip>', '设备 IP 地址')
  .option('--platforms <platforms>', '支持的平台，逗号分隔 (ARM64_GENERIC,X86_64 等)')
  .option('--username <username>', '登录用户名')
  .option('--password <password>', '登录密码')
  .option('--ssh <port>', 'SSH 端口')
  .option('--telnet <port>', 'Telnet 端口')
  .option('--ftp <port>', 'FTP 端口')
  .option('--gdb <port>', 'GDB 端口')
  .option('--config <file>', 'JSON 配置文件路径')
  .action(async (options) => {
    const parser = new DeviceOptionParser();

    if (parser.hasEnoughOptions(options)) {
      try {
        console.log(chalk.cyan('🚀 设备添加 (非交互模式)\n'));
        const { config } = parser.parse(options);

        const { runDeviceInit } = await import('../wizards/device-wizard.js');
        await runDeviceInit(config);
      } catch (err: any) {
        console.error(chalk.red(`\n✗ 错误: ${err.message}`));
        process.exit(1);
      }
    } else {
      const { runDeviceWizard } = await import('../wizards/device-wizard.js');
      await runDeviceWizard();
    }
  });

deviceCommand
  .command('list')
  .description('列出所有已配置的设备')
  .action(async () => {
    console.log(chalk.cyan('查找设备配置...'));
    console.log(chalk.dim('  设备配置功能将在后续 Plan 实现'));
  });
