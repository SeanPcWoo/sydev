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
 * 检查 rl 命令是否可用并解析版本号
 */
export function checkRlCommand(): EnvCheckResult {
  try {
    const output = execSync('rl --version', {
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
        error: 'Failed to parse version from rl command output',
        fixSuggestion: 'Please ensure RealEvo-Stream toolchain is properly installed'
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
        error: 'rl command not found in PATH',
        fixSuggestion: 'Please install RealEvo-Stream toolchain and ensure rl command is in your PATH. Visit https://realevo.com for installation instructions.'
      };
    }

    return {
      available: false,
      error: `Failed to execute rl command: ${error.message}`,
      fixSuggestion: 'Please check your RealEvo-Stream installation'
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
