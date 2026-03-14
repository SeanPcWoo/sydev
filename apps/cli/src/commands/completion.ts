import { Command } from 'commander';
import chalk from 'chalk';
import { generateBashCompletion, generateZshCompletion } from '../completion/generate.js';

export function createCompletionCommand(program: Command): Command {
  const completionCommand = new Command('completion')
    .description('生成 Shell 自动补全脚本')
    .addHelpText('after', `
示例:
  # Bash 补全（系统级）
  $ sudo openswitch completion bash > /etc/bash_completion.d/openswitch

  # Bash 补全（用户级）
  $ openswitch completion bash >> ~/.bashrc
  $ source ~/.bashrc

  # Zsh 补全
  $ mkdir -p ~/.zsh/completion
  $ openswitch completion zsh > ~/.zsh/completion/_openswitch
  $ echo 'fpath=(~/.zsh/completion $fpath)' >> ~/.zshrc
  $ echo 'autoload -U compinit && compinit' >> ~/.zshrc
  $ source ~/.zshrc

注意:
  - 安装后需要重新加载 Shell 配置或重启终端
  - Zsh 用户需要确保 compinit 已启用
`);

  completionCommand
    .command('bash')
    .description('生成 Bash 补全脚本')
    .action(() => {
      const script = generateBashCompletion(program);
      console.log(script);
    });

  completionCommand
    .command('zsh')
    .description('生成 Zsh 补全脚本')
    .action(() => {
      const script = generateZshCompletion(program);
      console.log(script);
    });

  completionCommand
    .command('install')
    .description('自动安装补全脚本（检测当前 Shell）')
    .action(async () => {
      const shell = process.env.SHELL || '';
      const { writeFileSync, existsSync, mkdirSync } = await import('fs');
      const { homedir } = await import('os');
      const { join } = await import('path');

      if (shell.includes('bash')) {
        console.log(chalk.cyan('检测到 Bash，安装补全脚本...'));

        const bashrcPath = join(homedir(), '.bashrc');
        const script = generateBashCompletion(program);
        const marker = '# openswitch completion';

        // 检查是否已安装
        if (existsSync(bashrcPath)) {
          const { readFileSync } = await import('fs');
          const content = readFileSync(bashrcPath, 'utf-8');
          if (content.includes(marker)) {
            console.log(chalk.yellow('⚠ 补全脚本已安装'));
            return;
          }
        }

        // 追加到 .bashrc
        const { appendFileSync } = await import('fs');
        appendFileSync(bashrcPath, `\n${script}\n`);

        console.log(chalk.green('✓ Bash 补全脚本已安装到 ~/.bashrc'));
        console.log(chalk.dim('  运行 source ~/.bashrc 或重启终端生效'));

      } else if (shell.includes('zsh')) {
        console.log(chalk.cyan('检测到 Zsh，安装补全脚本...'));

        const completionDir = join(homedir(), '.zsh', 'completion');
        const completionFile = join(completionDir, '_openswitch');
        const zshrcPath = join(homedir(), '.zshrc');

        // 创建补全目录
        if (!existsSync(completionDir)) {
          mkdirSync(completionDir, { recursive: true });
        }

        // 写入补全脚本
        const script = generateZshCompletion(program);
        writeFileSync(completionFile, script);

        console.log(chalk.green(`✓ Zsh 补全脚本已安装到 ${completionFile}`));

        // 检查 .zshrc 配置
        if (existsSync(zshrcPath)) {
          const { readFileSync } = await import('fs');
          const content = readFileSync(zshrcPath, 'utf-8');

          if (!content.includes('fpath=(~/.zsh/completion $fpath)')) {
            console.log(chalk.yellow('\n⚠ 需要手动添加以下内容到 ~/.zshrc:'));
            console.log(chalk.dim('  fpath=(~/.zsh/completion $fpath)'));
            console.log(chalk.dim('  autoload -U compinit && compinit'));
          } else {
            console.log(chalk.dim('  运行 source ~/.zshrc 或重启终端生效'));
          }
        }

      } else {
        console.error(chalk.red('✗ 无法检测 Shell 类型'));
        console.log(chalk.yellow('请手动运行:'));
        console.log(chalk.dim('  openswitch completion bash  # 或'));
        console.log(chalk.dim('  openswitch completion zsh'));
      }
    });

  return completionCommand;
}
