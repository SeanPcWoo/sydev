import { z } from 'zod';

export const workspaceSchema = z.object({
  baseVersion: z.string().min(1, "Base 版本不能为空"),
  platform: z.enum(['arm', 'x86', 'mips', 'riscv'], {
    errorMap: () => ({ message: "平台必须是 arm, x86, mips 或 riscv" })
  }),
  buildOptions: z.object({
    debug: z.boolean().default(false),
    optimize: z.enum(['none', 'size', 'speed']).default('none')
  }).optional(),
  path: z.string().optional()
});

export type WorkspaceConfig = z.infer<typeof workspaceSchema>;
