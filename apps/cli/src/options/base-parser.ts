import { readFileSync } from 'fs';
import chalk from 'chalk';

/**
 * 通用参数解析器
 * 支持：
 * 1. 命令行 --flag 参数
 * 2. JSON 配置文件 (--config file.json)
 * 3. 混合模式（文件 + 命令行覆盖）
 */

export interface ParsedOptions<T> {
  config: T;
  raw: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export abstract class BaseOptionParser<T> {
  protected abstract readonly defaults: T;
  protected abstract readonly requiredFields: (keyof T)[];

  /**
   * 从命令行参数解析配置
   */
  protected parseCliOptions(options: Record<string, any>): T {
    return {
      ...this.defaults,
      ...this.filterOptions(options),
    } as T;
  }

  /**
   * 从 JSON 文件加载配置
   */
  protected loadJsonConfig(filePath: string): Record<string, any> {
    try {
      const json = readFileSync(filePath, 'utf-8');
      return JSON.parse(json);
    } catch (err: any) {
      throw new Error(`Failed to load config file: ${err.message}`);
    }
  }

  /**
   * 合并配置（文件 + 命令行参数）
   * 优先级：命令行参数 > JSON 文件 > 默认值
   */
  protected mergeOptions(
    fileConfig: Record<string, any>,
    cliOptions: Record<string, any>
  ): T {
    const merged = {
      ...this.defaults,
      ...fileConfig,
      ...this.filterOptions(cliOptions),
    };
    return merged as T;
  }

  /**
   * 过滤掉 undefined 和内部字段的选项
   */
  private filterOptions(options: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(options)
        .filter(([key, value]) => value !== undefined && !key.startsWith('_'))
    );
  }

  /**
   * 验证配置
   * 子类应重写此方法添加具体验证逻辑
   */
  protected validate(config: T): ValidationResult {
    const errors: string[] = [];

    // 检查必需字段
    for (const field of this.requiredFields) {
      if (!config[field]) {
        errors.push(`Missing required field: ${String(field)}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 主解析方法
   */
  parse(options: Record<string, any>): ParsedOptions<T> {
    let config: T;
    const raw = { ...options };

    // 如果提供了 --config 文件
    if (options.config) {
      const fileConfig = this.loadJsonConfig(options.config);
      config = this.mergeOptions(fileConfig, options);
    } else {
      config = this.parseCliOptions(options);
    }

    // 验证配置
    const validation = this.validate(config);
    if (!validation.valid) {
      const errorMsg = validation.errors.join('\n  ');
      throw new Error(`Validation failed:\n  ${errorMsg}`);
    }

    return { config, raw };
  }

  /**
   * 判断是否提供了足够的参数跳过交互
   */
  hasEnoughOptions(options: Record<string, any>): boolean {
    // 至少需要提供一些参数（除了 --config 和内部字段）
    const providedOptions = Object.entries(options)
      .filter(([key, value]) =>
        value !== undefined &&
        !key.startsWith('_') &&
        key !== 'config'
      );

    return providedOptions.length > 0;
  }
}

/**
 * 生成人类可读的帮助文本
 */
export function generateHelpExample(
  commandName: string,
  examples: Record<string, string>
): string {
  let help = `\n${chalk.bold('Non-interactive mode examples:')}`;
  for (const [desc, cmd] of Object.entries(examples)) {
    help += `\n  ${chalk.dim(desc)}\n  ${chalk.cyan('$')} ${cmd}\n`;
  }
  return help;
}
