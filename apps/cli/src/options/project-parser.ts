import { BaseOptionParser, ValidationResult } from './base-parser.js';

export type ProjectMode = 'import' | 'create';

export interface ProjectOptions {
  mode: ProjectMode;
  name: string;
  // For import mode
  source?: string;
  branch?: string;
  // For create mode
  template?: 'app' | 'lib' | 'common' | 'ko' | 'python_native_lib' | 'uorb_pubsub' | 'vsoa_pubsub' | 'fast_dds_pubsub';
  type?: 'cmake' | 'automake' | 'realevo' | 'ros2' | 'python' | 'cython' | 'go' | 'javascript';
  debugLevel?: 'release' | 'debug';
  makeTool: 'make' | 'ninja';
}

export class ProjectOptionParser extends BaseOptionParser<ProjectOptions> {
  protected defaults: ProjectOptions = {
    mode: 'import',
    name: '',
    makeTool: 'make',
    debugLevel: 'release',
    template: 'app',
    type: 'realevo',
  };

  protected requiredFields: (keyof ProjectOptions)[] = [
    'mode',
    'name',
    'makeTool',
  ];

  protected validate(config: ProjectOptions): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    const base = super.validate(config);
    if (!base.valid) {
      errors.push(...base.errors);
    }

    // name 必需且长度 >= 3
    if (!config.name || config.name.length < 3) {
      errors.push('name is required and must be at least 3 characters');
    }

    // mode 验证
    if (!['import', 'create'].includes(config.mode)) {
      errors.push('mode must be "import" or "create"');
    }

    // import 模式需要 source 和 branch
    if (config.mode === 'import') {
      if (!config.source || !config.source.trim()) {
        errors.push('source is required for mode=import');
      }
      if (!config.branch || !config.branch.trim()) {
        errors.push('branch is required for mode=import');
      }
    }

    // create 模式需要 template 和 type
    if (config.mode === 'create') {
      if (!config.template) {
        errors.push('template is required for mode=create');
      }
      if (!config.type) {
        errors.push('type is required for mode=create');
      }
    }

    // template 验证
    const validTemplates = [
      'app', 'lib', 'common', 'ko', 'python_native_lib',
      'uorb_pubsub', 'vsoa_pubsub', 'fast_dds_pubsub'
    ];
    if (config.template && !validTemplates.includes(config.template)) {
      errors.push(`template must be one of: ${validTemplates.join(', ')}`);
    }

    // type 验证
    const validTypes = ['cmake', 'automake', 'realevo', 'ros2', 'python', 'cython', 'go', 'javascript'];
    if (config.type && !validTypes.includes(config.type)) {
      errors.push(`type must be one of: ${validTypes.join(', ')}`);
    }

    // makeTool 验证
    if (!['make', 'ninja'].includes(config.makeTool)) {
      errors.push('makeTool must be "make" or "ninja"');
    }

    // debugLevel 验证
    if (config.debugLevel && !['release', 'debug'].includes(config.debugLevel)) {
      errors.push('debugLevel must be "release" or "debug"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected parseCliOptions(options: Record<string, any>): ProjectOptions {
    return {
      ...this.defaults,
      mode: options.mode || this.defaults.mode,
      name: options.name || '',
      source: options.source,
      branch: options.branch,
      template: options.template || this.defaults.template,
      type: options.type || this.defaults.type,
      debugLevel: options.debugLevel || options['debug-level'] || this.defaults.debugLevel,
      makeTool: options.makeTool || options['make-tool'] || this.defaults.makeTool,
    };
  }
}
