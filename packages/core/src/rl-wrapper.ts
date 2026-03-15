import { spawn } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { ProgressReporter } from './progress-reporter.js';

export interface RlCommandResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  fixSuggestion?: string;
}

export async function executeRlCommand(
  command: string,
  args: string[],
  progressReporter?: ProgressReporter,
  cwd?: string
): Promise<RlCommandResult> {
  return new Promise((resolve) => {
    // 确保 cwd 目录存在
    if (cwd && !existsSync(cwd)) {
      mkdirSync(cwd, { recursive: true });
    }

    const proc = spawn(command, args, { cwd, env: process.env, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      progressReporter?.emit('output', data.toString());
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, stdout });
      } else {
        const { error, fixSuggestion } = parseRlError(stderr || stdout);
        resolve({ success: false, stdout, stderr, error, fixSuggestion });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: `执行 ${command} 命令失败: ${err.message}`,
        fixSuggestion: '请确认 RealEvo-Stream 已正确安装且 rl-workspace, rl-project, rl-device, rl-build 命令在 PATH 中'
      });
    });
  });
}

function parseRlError(output: string): { error: string; fixSuggestion: string } {
  if (output.includes('permission denied') || output.includes('权限不足')) {
    return {
      error: '权限不足',
      fixSuggestion: '请使用 sudo 运行或检查文件权限'
    };
  }
  if (output.includes('not found') || output.includes('不存在')) {
    return {
      error: '路径或文件不存在',
      fixSuggestion: '请检查路径是否正确，或先创建必要的目录'
    };
  }
  if (output.includes('version') || output.includes('版本')) {
    return {
      error: '版本不兼容',
      fixSuggestion: '请升级 RealEvo-Stream 到最新版本'
    };
  }
  return {
    error: output.trim() || '未知错误',
    fixSuggestion: '请查看错误信息或联系技术支持'
  };
}

export interface WorkspaceInitOptions {
  cwd: string;
  basePath: string;
  platform: string;
  version: string;
  createbase?: boolean;
  build?: boolean;
  debugLevel?: string;
  os?: string;
}

export interface ProjectCreateOptions {
  name: string;
  template?: string;
  type?: string;
  source?: string;
  branch?: string;
  debugLevel?: string;
  makeTool?: string;
  cwd?: string;
}

export interface DeviceAddOptions {
  name: string;
  ip: string;
  platform: string;
  ssh?: number;
  telnet?: number;
  ftp?: number;
  gdb?: number;
  username?: string;
  password?: string;
  cwd?: string;
}

export class RlWrapper {
  constructor(private progressReporter: ProgressReporter) {}

  async initWorkspace(config: WorkspaceInitOptions): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: '初始化 Workspace', progress: 0 });

    const args = [
      'init',
      `--base=${config.basePath}`,
      `--platform=${config.platform}`,
      `--version=${config.version}`
    ];
    if (config.createbase !== undefined) args.push(`--createbase=${config.createbase}`);
    if (config.build !== undefined) args.push(`--build=${config.build}`);
    if (config.debugLevel) args.push(`--debug_level=${config.debugLevel}`);
    if (config.os) args.push(`--os=${config.os}`);

    const result = await executeRlCommand('rl-workspace', args, this.progressReporter, config.cwd);
    if (result.success) {
      this.progressReporter.emit('step', { name: '初始化 Workspace', progress: 100 });
    }
    return result;
  }

  async createProject(config: ProjectCreateOptions): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: `创建项目 ${config.name}`, progress: 0 });

    const args = [
      'create',
      `--name=${config.name}`
    ];
    if (config.template) args.push(`--template=${config.template}`);
    if (config.type) args.push(`--type=${config.type}`);
    if (config.source) args.push(`--source=${config.source}`);
    if (config.branch) args.push(`--branch=${config.branch}`);
    if (config.debugLevel) args.push(`--debug-level=${config.debugLevel}`);
    if (config.makeTool) args.push(`--make-tool=${config.makeTool}`);

    const result = await executeRlCommand('rl-project', args, this.progressReporter, config.cwd);
    if (result.success) {
      this.progressReporter.emit('step', { name: `创建项目 ${config.name}`, progress: 100 });
    }
    return result;
  }

  async addDevice(config: DeviceAddOptions): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: `添加设备 ${config.name}`, progress: 0 });

    const args = [
      'add',
      `--name=${config.name}`,
      `--ip=${config.ip}`,
      `--platform=${config.platform}`
    ];
    if (config.ssh !== undefined) args.push(`--ssh=${config.ssh}`);
    if (config.telnet !== undefined) args.push(`--telnet=${config.telnet}`);
    if (config.ftp !== undefined) args.push(`--ftp=${config.ftp}`);
    if (config.gdb !== undefined) args.push(`--gdb=${config.gdb}`);
    if (config.username) args.push(`--user=${config.username}`);
    if (config.password) args.push(`--password=${config.password}`);

    const result = await executeRlCommand('rl-device', args, this.progressReporter, config.cwd);
    if (result.success) {
      this.progressReporter.emit('step', { name: `添加设备 ${config.name}`, progress: 100 });
    }
    return result;
  }
}
