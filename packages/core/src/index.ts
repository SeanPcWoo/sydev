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
  type DeviceConfig,
  templateTypeSchema,
  templateMetaSchema,
  templateIndexSchema,
  templateContentSchema,
  fullConfigSchema,
  type FullConfig,
} from './schemas/index.js';

// 模板管理
export {
  TemplateManager,
  type TemplateMeta,
  type TemplateType,
  type TemplateIndex,
} from './template-manager.js';

// rl 命令包装
export {
  RlWrapper,
  executeRlCommand,
  type RlCommandResult,
  type WorkspaceInitOptions,
  type ProjectCreateOptions,
  type DeviceAddOptions
} from './rl-wrapper.js';

// 进度报告
export {
  ProgressReporter,
  type StepProgress,
  type ErrorEvent
} from './progress-reporter.js';

// 常量
export { PLATFORMS } from './constants.js';

// 类型定义
export type {
  RlVersion,
  EnvCheckResult,
  ToolchainCheckResult,
  EnvironmentStatus
} from './types.js';
