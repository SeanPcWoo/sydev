import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type {
  RlVersion,
  EnvCheckResult,
  ToolchainCheckResult,
  EnvironmentStatus
} from './types.js';

/**
 * 检查 rl-workspace 命令是否可用并解析版本号
 */
export function checkRlCommand(): EnvCheckResult {
  try {
    const output = execSync('rl-workspace --version', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 确保 output 是字符串
    const outputStr = typeof output === 'string' ? output : String(output);

    // 解析版本号，匹配 x.y.z 格式
    const versionMatch = outputStr.match(/(\d+)\.(\d+)\.(\d+)/);

    if (!versionMatch) {
      return {
        available: false,
        error: '无法从 rl-workspace 命令输出中解析版本号',
        fixSuggestion: '请确保 RealEvo-Stream 工具链已正确安装。检查以下命令是否可用：rl-workspace, rl-project, rl-device, rl-build'
      };
    }

    const version: RlVersion = {
      major: parseInt(versionMatch[1], 10),
      minor: parseInt(versionMatch[2], 10),
      patch: parseInt(versionMatch[3], 10),
      raw: versionMatch[0]
    };

    return {
      available: true,
      version
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        available: false,
        error: '未找到 rl-workspace 命令',
        fixSuggestion: '请安装 RealEvo-Stream 工具链并确保以下命令在 PATH 中：rl-workspace, rl-project, rl-device, rl-build。安装后请运行 \'which rl-workspace\' 验证。'
      };
    }

    return {
      available: false,
      error: `执行 rl-workspace 命令失败: ${error.message}`,
      fixSuggestion: '请检查 RealEvo-Stream 安装。尝试手动运行 \'rl-workspace --version\' 查看详细错误信息。'
    };
  }
}

/**
 * 检查 RealEvo-Stream 工具链是否已安装
 */
export function checkToolchain(): ToolchainCheckResult {
  // 首先检查环境变量 REALEVO_HOME
  const realevoHome = process.env.REALEVO_HOME;
  if (realevoHome && existsSync(realevoHome)) {
    return {
      installed: true,
      path: realevoHome
    };
  }

  // 检查常见安装路径
  const commonPaths = [
    '/opt/realevo',
    join(homedir(), 'realevo'),
    join(homedir(), '.realevo')
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return {
        installed: true,
        path
      };
    }
  }

  return {
    installed: false,
    error: 'RealEvo-Stream toolchain not found in common installation paths'
  };
}

/**
 * 综合检查环境状态
 */
export function checkEnvironment(): EnvironmentStatus {
  const rl = checkRlCommand();
  const toolchain = checkToolchain();

  return {
    rl,
    toolchain,
    overall: rl.available && toolchain.installed
  };
}
