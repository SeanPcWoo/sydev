import { z } from 'zod';

export class ConfigManager {
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): { valid: boolean; data?: T; errors?: string[] } {
    const result = schema.safeParse(data);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    };
  }

  static merge<T extends Record<string, any>>(...configs: Partial<T>[]): T {
    return Object.assign({}, ...configs) as T;
  }

  static exportToJson<T>(config: T): string {
    return JSON.stringify(config, null, 2);
  }

  static importFromJson<T>(schema: z.ZodSchema<T>, json: string): { valid: boolean; data?: T; errors?: string[] } {
    try {
      const parsed = JSON.parse(json);
      return ConfigManager.validate(schema, parsed);
    } catch (error) {
      return { valid: false, errors: [`JSON 解析失败: ${(error as Error).message}`] };
    }
  }
}
