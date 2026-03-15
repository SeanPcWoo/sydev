import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(3, "项目名称至少 3 个字符").max(50, "项目名称最多 50 个字符"),
  template: z.enum([
    'app',
    'lib',
    'common',
    'ko',
    'python_native_lib',
    'uorb_pubsub',
    'vsoa_pubsub',
    'fast_dds_pubsub'
  ]).optional(),
  type: z.enum([
    'cmake',
    'automake',
    'realevo',
    'ros2',
    'python',
    'cython',
    'go',
    'javascript'
  ]).optional(),
  source: z.string().optional(),
  branch: z.string().optional(),
  debugLevel: z.enum(['debug', 'release']).optional(),
  makeTool: z.enum(['make', 'ninja']).default('make')
});

export type ProjectConfig = z.infer<typeof projectSchema>;
