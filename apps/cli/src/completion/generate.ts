import { Command } from 'commander';

export function generateBashCompletion(program: Command): string {
  const commands = extractCommands(program);
  const subcommands = extractSubcommands(program);

  return `# openswitch bash completion script
# 安装方法: openswitch completion bash > /etc/bash_completion.d/openswitch
# 或: openswitch completion bash >> ~/.bashrc

_openswitch_completion() {
    local cur prev opts base
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    # 主命令补全
    if [ \${COMP_CWORD} -eq 1 ]; then
        opts="${commands.join(' ')}"
        COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
        return 0
    fi

    # 子命令补全
    case "\${COMP_WORDS[1]}" in
${generateBashSubcommandCases(subcommands)}
    esac
}

complete -F _openswitch_completion openswitch
`;
}

export function generateZshCompletion(program: Command): string {
  const commands = extractCommands(program);
  const subcommands = extractSubcommands(program);

  return `#compdef openswitch
# openswitch zsh completion script
# 安装方法: openswitch completion zsh > ~/.zsh/completion/_openswitch
# 并确保 ~/.zshrc 中有: fpath=(~/.zsh/completion $fpath) 和 autoload -U compinit && compinit

_openswitch() {
    local -a commands
    commands=(
${commands.map(cmd => `        '${cmd}:${getCommandDescription(program, cmd)}'`).join('\n')}
    )

    local -a subcommands_workspace
    subcommands_workspace=(
${(subcommands.workspace || []).map(sub => `        '${sub.name}:${sub.description}'`).join('\n')}
    )

    local -a subcommands_project
    subcommands_project=(
${(subcommands.project || []).map(sub => `        '${sub.name}:${sub.description}'`).join('\n')}
    )

    local -a subcommands_device
    subcommands_device=(
${(subcommands.device || []).map(sub => `        '${sub.name}:${sub.description}'`).join('\n')}
    )

    if (( CURRENT == 2 )); then
        _describe 'command' commands
    elif (( CURRENT == 3 )); then
        case "\${words[2]}" in
            workspace)
                _describe 'subcommand' subcommands_workspace
                ;;
            project)
                _describe 'subcommand' subcommands_project
                ;;
            device)
                _describe 'subcommand' subcommands_device
                ;;
        esac
    fi
}

_openswitch
`;
}

function extractCommands(program: Command): string[] {
  const commands: string[] = ['--help', '--version'];
  program.commands.forEach(cmd => {
    commands.push(cmd.name());
  });
  return commands;
}

interface Subcommand {
  name: string;
  description: string;
}

function extractSubcommands(program: Command): Record<string, Subcommand[]> {
  const result: Record<string, Subcommand[]> = {};

  program.commands.forEach(cmd => {
    const cmdName = cmd.name();
    result[cmdName] = [];

    cmd.commands.forEach(subcmd => {
      result[cmdName].push({
        name: subcmd.name(),
        description: subcmd.description()
      });
    });
  });

  return result;
}

function getCommandDescription(program: Command, cmdName: string): string {
  const cmd = program.commands.find(c => c.name() === cmdName);
  return cmd?.description() || '';
}

function generateBashSubcommandCases(subcommands: Record<string, Subcommand[]>): string {
  return Object.entries(subcommands)
    .map(([cmd, subs]) => {
      const subNames = subs.map(s => s.name).join(' ');
      return `        ${cmd})
            if [ \${COMP_CWORD} -eq 2 ]; then
                opts="${subNames}"
                COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
            fi
            ;;`;
    })
    .join('\n');
}
