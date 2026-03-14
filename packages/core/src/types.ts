/**
 * RealEvo-Stream rl 命令版本信息
 */
export interface RlVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/**
 * rl 命令检查结果
 */
export interface EnvCheckResult {
  available: boolean;
  version?: RlVersion;
  error?: string;
  fixSuggestion?: string;
}

/**
 * RealEvo-Stream 工具链检查结果
 */
export interface ToolchainCheckResult {
  installed: boolean;
  path?: string;
  error?: string;
  fixSuggestion?: string;
}

/**
 * 完整环境状态
 */
export interface EnvironmentStatus {
  rl: EnvCheckResult;
  toolchain: ToolchainCheckResult;
  overall: boolean;
}
