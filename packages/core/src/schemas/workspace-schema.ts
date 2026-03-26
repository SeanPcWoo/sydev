import { z } from 'zod';
import { PLATFORM_VALUES } from '../constants.js';

export { PLATFORM_VALUES };

export const workspaceSchema = z.object({
  cwd: z.string().min(1, "工作路径不能为空"),
  basePath: z.string().min(1, "Base 路径不能为空"),
  platform: z.array(z.enum(PLATFORM_VALUES, {
    errorMap: () => ({ message: "不支持的平台，请参考 RealEvo-Stream 文档" })
  })).min(1, "至少选择一个平台"),
  version: z.enum([
    'default',
    'ecs_3.6.5',
    'lts_3.6.5',
    'lts_3.6.5_compiled',
    'research',
    'custom'
  ]).default('default'),
  createbase: z.boolean().default(false),
  build: z.boolean().default(false),
  debugLevel: z.enum(['debug', 'release']).default('release'),
  os: z.enum(['sylixos', 'linux']).default('sylixos')
});

export type WorkspaceConfig = z.infer<typeof workspaceSchema>;
