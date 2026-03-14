import { spawn } from 'child_process';
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
  progressReporter?: ProgressReporter
): Promise<RlCommandResult> {
  return new Promise((resolve) => {
    const proc = spawn('rl', [command, ...args]);
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
        resolve({ success: false, stderr, error, fixSuggestion });
      }
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: `执行 rl 命令失败: ${err.message}`,
        fixSuggestion: '请确认 RealEvo-Stream 已正确安装且 rl 命令在 PATH 中'
      });
    });
  });
}

function parseRlError(output: string): { error: string; fixSuggestion: string } {
  // 识别常见错误模式
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

export class RlWrapper {
  constructor(private progressReporter: ProgressReporter) {}

  async initWorkspace(config: { baseVersion: string; platform: string; path: string }): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: '初始化 Workspace', progress: 0 });
    const result = await executeRlCommand(
      'workspace',
      ['init', '--base', config.baseVersion, '--platform', config.platform, '--path', config.path],
      this.progressReporter
    );
    if (result.success) {
      this.progressReporter.emit('step', { name: '初始化 Workspace', progress: 100 });
    }
    return result;
  }

  async createProject(config: { name: string; type: string; path: string }): Promise<RlCommandResult> {
    this.progressReporter.emit('step', { name: `创建项目 ${config.name}`, progress: 0 });
    const result = await executeRlCommand(
      'project',
      ['create', '--name', config.name, '--type', config.type, '--path', config.path],
      this.progressReporter
    );
    if (result.success) {
      this.progressReporter.emit('step', { name: `创建项目 ${config.name}`, progress: 100 });
    }
    return result;
  }
}
