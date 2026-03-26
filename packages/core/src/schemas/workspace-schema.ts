import { z } from 'zod';
import { BASE_COMPONENT_VALUES, REQUIRED_BASE_COMPONENTS } from '../constants.js';

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

export const ARM64_PAGE_SHIFT_VALUES = [12, 14, 16] as const;

function normalizeBaseComponentsInput(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\s\u3001\uff0c]+/)
      : [];

  const normalized = rawValues
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .flatMap((item) => item.split(/[,\s\u3001\uff0c]+/))
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return undefined;
  }

  return [...new Set(normalized)];
}

function hasArm64Platform(platforms: readonly string[]): boolean {
  return platforms.some((platform) => platform.startsWith('ARM64_'));
}

export function validateWorkspaceConfig(
  config: {
    platform: readonly string[];
    version: string;
    arm64PageShift?: number;
    baseComponents?: readonly string[];
    customRepo?: string;
    customBranch?: string;
    researchBranch?: string;
  },
  ctx: z.RefinementCtx
): void {
  if (config.arm64PageShift !== undefined && !hasArm64Platform(config.platform)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['arm64PageShift'],
      message: 'ARM64 页偏移仅能在选择 ARM64 平台时使用',
    });
  }

  if (config.version === 'custom') {
    if (!config.customRepo?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customRepo'],
        message: 'custom 版本必须提供 customRepo',
      });
    }
    if (!config.customBranch?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customBranch'],
        message: 'custom 版本必须提供 customBranch',
      });
    }
  }

  if (config.version === 'research' && !config.researchBranch?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['researchBranch'],
      message: 'research 版本必须提供 researchBranch',
    });
  }

  if (config.baseComponents !== undefined) {
    const missingRequired = REQUIRED_BASE_COMPONENTS.filter(
      (component) => !config.baseComponents?.includes(component)
    );
    if (missingRequired.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseComponents'],
        message: `Base 组件必须包含: ${missingRequired.join(', ')}`,
      });
    }
  }
}

export const workspaceSchemaObject = z.object({
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
  os: z.enum(['sylixos', 'linux']).default('sylixos'),
  customRepo: z.string().min(1).optional(),
  customBranch: z.string().min(1).optional(),
  researchBranch: z.string().min(1).optional(),
  arm64PageShift: z.coerce.number()
    .int("ARM64 页偏移必须是整数")
    .refine((value) => ARM64_PAGE_SHIFT_VALUES.includes(value as 12 | 14 | 16), {
      message: "ARM64 页偏移仅支持 12(4K)、14(16K)、16(64K)"
    })
    .optional(),
  baseComponents: z.preprocess(
    normalizeBaseComponentsInput,
    z.array(z.enum(BASE_COMPONENT_VALUES, {
      errorMap: () => ({ message: "不支持的 Base 组件，请从默认组件列表中选择" })
    }))
      .min(1, '至少选择一个 Base 组件')
      .optional()
  ),
});

export const workspaceSchema = workspaceSchemaObject.superRefine(validateWorkspaceConfig);

export type WorkspaceConfig = z.infer<typeof workspaceSchema>;
