import { BaseOptionParser, ValidationResult } from './base-parser.js';

export interface DeviceOptions {
  name: string;
  ip: string;
  platforms: string[];
  username: string;
  password: string;
  ssh: number;
  telnet: number;
  ftp: number;
  gdb: number;
}

export class DeviceOptionParser extends BaseOptionParser<DeviceOptions> {
  protected defaults: DeviceOptions = {
    name: '',
    ip: '',
    platforms: ['ARM64_GENERIC'],
    username: 'root',
    password: 'root',
    ssh: 22,
    telnet: 23,
    ftp: 21,
    gdb: 1234,
  };

  protected requiredFields: (keyof DeviceOptions)[] = [
    'name',
    'ip',
    'platforms',
    'username',
    'password',
    'ssh',
    'telnet',
    'ftp',
    'gdb',
  ];

  protected validate(config: DeviceOptions): ValidationResult {
    const errors: string[] = [];

    // 基础验证
    const base = super.validate(config);
    if (!base.valid) {
      errors.push(...base.errors);
    }

    // name 必需
    if (!config.name || !config.name.trim()) {
      errors.push('name must not be empty');
    }

    // IP 地址验证
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!config.ip || !ipRegex.test(config.ip)) {
      errors.push('ip must be a valid IPv4 address');
    } else {
      const parts = config.ip.split('.').map(Number);
      if (parts.some(p => p > 255)) {
        errors.push('ip address octets must be <= 255');
      }
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

    // 端口号验证
    const portFields = ['ssh', 'telnet', 'ftp', 'gdb'] as const;
    for (const field of portFields) {
      const port = config[field];
      if (typeof port !== 'number' || port < 1 || port > 65535) {
        errors.push(`${field} port must be a number between 1 and 65535`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  protected parseCliOptions(options: Record<string, any>): DeviceOptions {
    // 处理 platforms 参数（可以是逗号分隔字符串或数组）
    let platforms = options.platforms || this.defaults.platforms;
    if (typeof platforms === 'string') {
      platforms = platforms.split(',').map((p: string) => p.trim());
    }

    return {
      ...this.defaults,
      name: options.name || '',
      ip: options.ip || '',
      platforms,
      username: options.username || this.defaults.username,
      password: options.password || this.defaults.password,
      ssh: options.ssh ? parseInt(options.ssh, 10) : this.defaults.ssh,
      telnet: options.telnet ? parseInt(options.telnet, 10) : this.defaults.telnet,
      ftp: options.ftp ? parseInt(options.ftp, 10) : this.defaults.ftp,
      gdb: options.gdb ? parseInt(options.gdb, 10) : this.defaults.gdb,
    };
  }
}
