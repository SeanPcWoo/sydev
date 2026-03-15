import { Command } from 'commander';
import chalk from 'chalk';
import { createWebServer } from '@sydev/core';

export const webCommand = new Command('web')
  .description('启动 Web 可视化界面')
  .option('-p, --port <port>', '端口号', '3456')
  .option('--no-open', '不自动打开浏览器')
  .action(async (opts) => {
    const port = parseInt(opts.port, 10);

    console.log(chalk.cyan('正在启动 Web 服务...'));

    const instance = await createWebServer({
      port,
      open: opts.open,
    });

    console.log(
      chalk.green(`✓ Web 服务已启动: `) +
        chalk.bold(`http://localhost:${port}`)
    );
    console.log(chalk.gray('  按 Ctrl+C 停止服务'));

    // Graceful shutdown
    const shutdown = async () => {
      console.log(chalk.yellow('\n正在关闭 Web 服务...'));
      await instance.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
