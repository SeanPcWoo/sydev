import { z } from 'zod';

export const PLATFORM_VALUES = [
  'ARM_926H', 'ARM_926S', 'ARM_920T',
  'ARM_A5', 'ARM_A5_SOFT',
  'ARM_A7', 'ARM_A7_SOFT',
  'ARM_A8', 'ARM_A8_SOFT',
  'ARM_A9', 'ARM_A9_SOFT',
  'ARM_A15', 'ARM_A15_SOFT',
  'ARM_V7A', 'ARM_V7A_SOFT',
  'ARM64_A53', 'ARM64_A55', 'ARM64_A57', 'ARM64_A72', 'ARM64_GENERIC',
  'MIPS32', 'MIPS32_SOFT', 'MIPS32_R2', 'MIPS32_R2_SOFT',
  'MIPS64_R2', 'MIPS64_R2_SOFT', 'MIPS64_LS3A', 'MIPS64_LS3A_SOFT',
  'x86_PENTIUM', 'x86_PENTIUM_SOFT', 'X86_64',
  'PPC_750', 'PPC_750_SOFT',
  'PPC_464FP', 'PPC_464FP_SOFT',
  'PPC_E500V1', 'PPC_E500V1_SOFT',
  'PPC_E500V2', 'PPC_E500V2_SOFT',
  'PPC_E500MC', 'PPC_E500MC_SOFT',
  'PPC_E5500', 'PPC_E5500_SOFT',
  'PPC_E6500', 'PPC_E6500_SOFT',
  'SPARC_LEON3', 'SPARC_LEON3_SOFT',
  'SPARC_V8', 'SPARC_V8_SOFT',
  'RISCV_GC32', 'RISCV_GC32_SOFT',
  'RISCV_GC64', 'RISCV_GC64_SOFT',
  'LOONGARCH64', 'LOONGARCH64_SOFT',
  'CSKY_CK807', 'CSKY_CK807_SOFT',
  'CSKY_CK810', 'CSKY_CK810_SOFT',
  'CSKY_CK860', 'CSKY_CK860_SOFT',
  'SW6B', 'SW6B_SOFT'
] as const;

export const workspaceSchema = z.object({
  cwd: z.string().min(1, "工作路径不能为空"),
  basePath: z.string().min(1, "Base 路径不能为空"),
  platform: z.enum(PLATFORM_VALUES, {
    errorMap: () => ({ message: "不支持的平台，请参考 RealEvo-Stream 文档" })
  }),
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
