/**
 * 共享常量定义
 */

/**
 * 平台清单以 RealEvo-Stream 官方“平台编译参数”为基础，
 * 并保留仓库内已经存在的历史兼容项，避免旧配置失效。
 */
const PLATFORM_DEFINITIONS = [
  { group: 'ARM', value: 'ARM_926H' },
  { group: 'ARM', value: 'ARM_926S' },
  { group: 'ARM', value: 'ARM_920T' },
  { group: 'ARM', value: 'ARM_A5' },
  { group: 'ARM', value: 'ARM_A5_SOFT' },
  { group: 'ARM', value: 'ARM_A7' },
  { group: 'ARM', value: 'ARM_A7_SOFT' },
  { group: 'ARM', value: 'ARM_A8' },
  { group: 'ARM', value: 'ARM_A8_SOFT' },
  { group: 'ARM', value: 'ARM_A9' },
  { group: 'ARM', value: 'ARM_A9_SOFT' },
  { group: 'ARM', value: 'ARM_A15' },
  { group: 'ARM', value: 'ARM_A15_SOFT' },
  { group: 'ARM', value: 'ARM_V7A' },
  { group: 'ARM', value: 'ARM_V7A_SOFT' },
  { group: 'ARM64', value: 'ARM64_A53' },
  { group: 'ARM64', value: 'ARM64_A55' },
  { group: 'ARM64', value: 'ARM64_A57' },
  { group: 'ARM64', value: 'ARM64_A72' },
  { group: 'ARM64', value: 'ARM64_GENERIC' },
  { group: 'MIPS', value: 'MIPS32' },
  { group: 'MIPS', value: 'MIPS32_SOFT' },
  { group: 'MIPS', value: 'MIPS32_R2' },
  { group: 'MIPS', value: 'MIPS32_R2_SOFT' },
  { group: 'MIPS', value: 'MIPS64_R2' },
  { group: 'MIPS', value: 'MIPS64_R2_SOFT' },
  { group: 'MIPS', value: 'MIPS64_LS3A' },
  { group: 'MIPS', value: 'MIPS64_LS3A_SOFT' },
  { group: 'x86', value: 'x86_PENTIUM' },
  { group: 'x86', value: 'x86_PENTIUM_SOFT' },
  { group: 'x86', value: 'X86_64' },
  { group: 'PPC', value: 'PPC_750' },
  { group: 'PPC', value: 'PPC_750_SOFT' },
  { group: 'PPC', value: 'PPC_464FP' },
  { group: 'PPC', value: 'PPC_464FP_SOFT' },
  { group: 'PPC', value: 'PPC_E500V1' },
  { group: 'PPC', value: 'PPC_E500V1_SOFT' },
  { group: 'PPC', value: 'PPC_E500V2' },
  { group: 'PPC', value: 'PPC_E500V2_SOFT' },
  { group: 'PPC', value: 'PPC_E500MC' },
  { group: 'PPC', value: 'PPC_E500MC_SOFT' },
  { group: 'PPC', value: 'PPC_E5500' },
  { group: 'PPC', value: 'PPC_E5500_SOFT' },
  { group: 'PPC', value: 'PPC_E6500' },
  { group: 'PPC', value: 'PPC_E6500_SOFT' },
  { group: 'SPARC', value: 'SPARC_LEON3' },
  { group: 'SPARC', value: 'SPARC_LEON3_SOFT' },
  { group: 'SPARC', value: 'SPARC_V8' },
  { group: 'SPARC', value: 'SPARC_V8_SOFT' },
  { group: 'RISCV', value: 'RISCV_GC32' },
  { group: 'RISCV', value: 'RISCV_GC32_SOFT' },
  { group: 'RISCV', value: 'RISCV_GC64' },
  { group: 'RISCV', value: 'RISCV_GC64_SOFT' },
  { group: 'LOONG', value: 'LOONGARCH64' },
  { group: 'LOONG', value: 'LOONGARCH64_SOFT' },
  { group: 'CSKY', value: 'CSKY_CK807' },
  { group: 'CSKY', value: 'CSKY_CK807_SOFT' },
  { group: 'CSKY', value: 'CSKY_CK810' },
  { group: 'CSKY', value: 'CSKY_CK810_SOFT' },
  { group: 'CSKY', value: 'CSKY_CK860' },
  { group: 'CSKY', value: 'CSKY_CK860_SOFT' },
  { group: 'LEGACY', value: 'SW6B' },
  { group: 'LEGACY', value: 'SW6B_SOFT' },
] as const;

export type PlatformValue = typeof PLATFORM_DEFINITIONS[number]['value'];

export const DEFAULT_PLATFORM: PlatformValue = 'ARM64_GENERIC';

export const PLATFORM_VALUES = PLATFORM_DEFINITIONS.map((platform) => platform.value) as [
  PlatformValue,
  ...PlatformValue[],
];

export const PLATFORMS = PLATFORM_DEFINITIONS.map((platform) => ({
  name: `${platform.group} - ${platform.value}`,
  value: platform.value,
}));

const PLATFORM_VALUE_SET = new Set<string>(PLATFORM_VALUES);

export function isValidPlatform(value: string): value is PlatformValue {
  return PLATFORM_VALUE_SET.has(value);
}
