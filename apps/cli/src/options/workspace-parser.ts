import { BaseOptionParser, ValidationResult } from './base-parser.js';

export interface WorkspaceOptions {
  cwd: string;
  basePath: string;
  version: 'default' | 'ecs_3.6.5' | 'lts_3.6.5' | 'lts_3.6.5_compiled' | 'research' | 'custom';
  platforms: string[];
  os: 'sylixos' | 'linux';
  debugLevel: 'release' | 'debug';
  createBase?: boolean;
  build?: boolean;
  // For custom version
  customRepo?: string;
  customBranch?: string;
  researchBranch?: string;
}

export class WorkspaceOptionParser extends BaseOptionParser<WorkspaceOptions> {
  protected defaults: WorkspaceOptions = {
    cwd: process.cwd(),
    basePath: '',
    version: 'default',
    platforms: ['ARM64_GENERIC'],
    os: 'sylixos',
    debugLevel: 'release',
    createBase: true,
    build: false,
  };

  protected requiredFields: (keyof WorkspaceOptions)[] = [
    'cwd',
    'basePath',
    'version',
    'platforms',
    'os',
    'debugLevel',
  ];

  protected validate(config: WorkspaceOptions): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    const base = super.validate(config);
    if (!base.valid) {
      errors.push(...base.errors);
    }

    // cwd 必需
    if (!config.cwd || !config.cwd.trim()) {
      errors.push('cwd must not be empty');
    }

    // basePath 必需（如果 createBase 为 true）
    if (config.createBase !== false && !config.basePath) {
      errors.push('basePath is required when createBase is true');
    }

    // version 验证
    const validVersions = ['default', 'ecs_3.6.5', 'lts_3.6.5', 'lts_3.6.5_compiled', 'research', 'custom'];
    if (!validVersions.includes(config.version)) {
      errors.push(`version must be one of: ${validVersions.join(', ')}`);
    }

    // custom 版本需要 customRepo 和 customBranch
    if (config.version === 'custom') {
      if (!config.customRepo) errors.push('customRepo is required for version=custom');
      if (!config.customBranch) errors.push('customBranch is required for version=custom');
    }

    // research 版本需要 researchBranch
    if (config.version === 'research' && !config.researchBranch) {
      errors.push('researchBranch is required for version=research');
    }

    // platforms 验证
    if (!Array.isArray(config.platforms) || config.platforms.length === 0) {
      errors.push('platforms must be a non-empty array');
    }

    const validPlatforms = [
      'ARM64_GENERIC', 'ARM64_A53', 'ARM64_A55', 'ARM64_A57', 'ARM64_A72',
      'X86_64', 'RISCV_GC64', 'LOONGARCH64'
    ];
    const invalidPlatforms = config.platforms.filter((p: string) => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      errors.push(
        `Invalid platforms: ${invalidPlatforms.join(', ')}. Valid: ${validPlatforms.join(', ')}`
      );
    }

    // os 验证
    if (!['sylixos', 'linux'].includes(config.os)) {
      errors.push('os must be "sylixos" or "linux"');
    }

    // debugLevel 验证
    if (!['release', 'debug'].includes(config.debugLevel)) {
      errors.push('debugLevel must be "release" or "debug"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 转换命令行参数到配置对象
   */
  protected parseCliOptions(options: Record<string, any>): WorkspaceOptions {
    // 处理 platforms 参数（可以是逗号分隔字符串或数组）
    let platforms = options.platforms || this.defaults.platforms;
    if (typeof platforms === 'string') {
      platforms = platforms.split(',').map((p: string) => p.trim());
    }

    return {
      ...this.defaults,
      cwd: options.cwd || this.defaults.cwd,
      basePath: options.basePath || this.defaults.basePath,
      version: options.version || this.defaults.version,
      platforms,
      os: options.os || this.defaults.os,
      debugLevel: options.debugLevel || options['debug-level'] || this.defaults.debugLevel,
      createBase: options.createBase !== undefined ? options.createBase : this.defaults.createBase,
      build: options.build !== undefined ? options.build : this.defaults.build,
      customRepo: options.customRepo || options['custom-repo'],
      customBranch: options.customBranch || options['custom-branch'],
      researchBranch: options.researchBranch || options['research-branch'],
    };
  }

  /**
   * 转换为初始化所需的格式
   */
  toInitConfig(opts: WorkspaceOptions) {
    return {
      cwd: opts.cwd,
      basePath: opts.basePath,
      workspace: {
        version: opts.version,
        platform: opts.platforms,
        os: opts.os,
        debugLevel: opts.debugLevel,
        createbase: opts.createBase,
        build: opts.build,
        ...(opts.version === 'custom' && {
          customRepo: opts.customRepo,
          customBranch: opts.customBranch,
        }),
        ...(opts.version === 'research' && {
          researchBranch: opts.researchBranch,
        }),
      },
    };
  }
}
