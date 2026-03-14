import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(3, "项目名称至少 3 个字符").max(50, "项目名称最多 50 个字符"),
  type: z.enum(['app', 'lib', 'driver']),
  template: z.string().optional(),
  path: z.string().optional()
});

export type ProjectConfig = z.infer<typeof projectSchema>;
