import { BaseOptionParser, ValidationResult } from './base-parser.js';

export type TemplateType = 'workspace' | 'project' | 'device' | 'full';

export interface TemplateSaveOptions {
  name: string;
  description?: string;
  type: TemplateType;
  // Workspace fields
  platforms?: string[];
  version?: string;
  os?: string;
  debugLevel?: string;
  createBase?: boolean;
  build?: boolean;
  // Project fields
  projectMode?: string;
  projectName?: string;
  projectSource?: string;
  projectBranch?: string;
  projectTemplate?: string;
  projectType?: string;
  projectMakeTool?: string;
  // Device fields
  deviceName?: string;
  deviceIp?: string;
  deviceUsername?: string;
  devicePassword?: string;
  deviceSsh?: number;
  deviceTelnet?: number;
  deviceFtp?: number;
  deviceGdb?: number;
}

export class TemplateSaveOptionParser extends BaseOptionParser<TemplateSaveOptions> {
  protected defaults: TemplateSaveOptions = {
    name: '',
    description: '',
    type: 'workspace',
  };

  protected requiredFields: (keyof TemplateSaveOptions)[] = [
    'name',
    'type',
  ];

  protected validate(config: TemplateSaveOptions): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    const base = super.validate(config);
    if (!base.valid) {
      errors.push(...base.errors);
    }

    // name 必需
    if (!config.name || !config.name.trim()) {
      errors.push('name is required');
    }

    // type 验证
    const validTypes: TemplateType[] = ['workspace', 'project', 'device', 'full'];
    if (!validTypes.includes(config.type)) {
      errors.push(`type must be one of: ${validTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected parseCliOptions(options: Record<string, any>): TemplateSaveOptions {
    // 处理 platforms 参数
    let platforms = options.platforms;
    if (typeof platforms === 'string') {
      platforms = platforms.split(',').map((p: string) => p.trim());
    }

    return {
      ...this.defaults,
      name: options.name || '',
      description: options.description || '',
      type: options.type || this.defaults.type,
      platforms,
      version: options.version || options['version'],
      os: options.os,
      debugLevel: options.debugLevel || options['debug-level'],
      createBase: options.createBase !== undefined ? options.createBase : undefined,
      build: options.build !== undefined ? options.build : undefined,
      // Project options
      projectMode: options.projectMode || options['project-mode'],
      projectName: options.projectName || options['project-name'],
      projectSource: options.projectSource || options['project-source'],
      projectBranch: options.projectBranch || options['project-branch'],
      projectTemplate: options.projectTemplate || options['project-template'],
      projectType: options.projectType || options['project-type'],
      projectMakeTool: options.projectMakeTool || options['project-make-tool'],
      // Device options
      deviceName: options.deviceName || options['device-name'],
      deviceIp: options.deviceIp || options['device-ip'],
      deviceUsername: options.deviceUsername || options['device-username'],
      devicePassword: options.devicePassword || options['device-password'],
      deviceSsh: options.deviceSsh ? parseInt(options.deviceSsh, 10) : undefined,
      deviceTelnet: options.deviceTelnet ? parseInt(options.deviceTelnet, 10) : undefined,
      deviceFtp: options.deviceFtp ? parseInt(options.deviceFtp, 10) : undefined,
      deviceGdb: options.deviceGdb ? parseInt(options.deviceGdb, 10) : undefined,
    };
  }
}
