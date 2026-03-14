// 环境检查
export {
  checkRlCommand,
  checkToolchain,
  checkEnvironment
} from './env-checker.js';

// 配置管理
export { ConfigManager } from './config-manager.js';
export {
  workspaceSchema,
  projectSchema,
  deviceSchema,
  type WorkspaceConfig,
  type ProjectConfig,
  type DeviceConfig
} from './schemas/index.js';

// rl 命令包装
export {
  RlWrapper,
  executeRlCommand,
  type RlCommandResult
} from './rl-wrapper.js';

// 进度报告
export {
  ProgressReporter,
  type StepProgress,
  type ErrorEvent
} from './progress-reporter.js';

// 类型定义
export type {
  RlVersion,
  EnvCheckResult,
  ToolchainCheckResult,
  EnvironmentStatus
} from './types.js';
