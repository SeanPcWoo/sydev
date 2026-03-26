/**
 * 共享常量定义
 */

/**
 * SylixOS 支持的平台列表
 * 用于 workspace 和 device 配置向导
 */
export const PLATFORMS = [
  { name: 'ARM --- ARM_926H', value: 'ARM_926H' },
  { name: 'ARM --- ARM_926S', value: 'ARM_926S' },
  { name: 'ARM --- ARM_920T', value: 'ARM_920T' },
  { name: 'ARM --- ARM_A5', value: 'ARM_A5' },
  { name: 'ARM --- ARM_A5_SOFT', value: 'ARM_A5_SOFT' },
  { name: 'ARM --- ARM_A7', value: 'ARM_A7' },
  { name: 'ARM --- ARM_A7_SOFT', value: 'ARM_A7_SOFT' },
  { name: 'ARM --- ARM_A8', value: 'ARM_A8' },
  { name: 'ARM --- ARM_A8_SOFT', value: 'ARM_A8_SOFT' },
  { name: 'ARM --- ARM_A9', value: 'ARM_A9' },
  { name: 'ARM --- ARM_A9_SOFT', value: 'ARM_A9_SOFT' },
  { name: 'ARM --- ARM_A15', value: 'ARM_A15' },
  { name: 'ARM --- ARM_A15_SOFT', value: 'ARM_A15_SOFT' },
  { name: 'ARM --- ARM_V7A', value: 'ARM_V7A' },
  { name: 'ARM --- ARM_V7A_SOFT', value: 'ARM_V7A_SOFT' },
  { name: 'ARM64 - ARM64_A53', value: 'ARM64_A53' },
  { name: 'ARM64 - ARM64_A55', value: 'ARM64_A55' },
  { name: 'ARM64 - ARM64_A57', value: 'ARM64_A57' },
  { name: 'ARM64 - ARM64_A72', value: 'ARM64_A72' },
  { name: 'ARM64 - ARM64_GENERIC', value: 'ARM64_GENERIC' },
  { name: 'MIPS -- MIPS32', value: 'MIPS32' },
  { name: 'MIPS -- MIPS32_SOFT', value: 'MIPS32_SOFT' },
  { name: 'MIPS -- MIPS32_R2', value: 'MIPS32_R2' },
  { name: 'MIPS -- MIPS32_R2_SOFT', value: 'MIPS32_R2_SOFT' },
  { name: 'MIPS -- MIPS64_R2', value: 'MIPS64_R2' },
  { name: 'MIPS -- MIPS64_R2_SOFT', value: 'MIPS64_R2_SOFT' },
  { name: 'MIPS -- MIPS64_LS3A', value: 'MIPS64_LS3A' },
  { name: 'MIPS -- MIPS64_LS3A_SOFT', value: 'MIPS64_LS3A_SOFT' },
  { name: 'x86 --- x86_PENTIUM', value: 'x86_PENTIUM' },
  { name: 'x86 --- x86_PENTIUM_SOFT', value: 'x86_PENTIUM_SOFT' },
  { name: 'x86 --- X86_64', value: 'X86_64' },
  { name: 'PPC --- PPC_750', value: 'PPC_750' },
  { name: 'PPC --- PPC_750_SOFT', value: 'PPC_750_SOFT' },
  { name: 'PPC --- PPC_464FP', value: 'PPC_464FP' },
  { name: 'PPC --- PPC_464FP_SOFT', value: 'PPC_464FP_SOFT' },
  { name: 'PPC --- PPC_E500V1', value: 'PPC_E500V1' },
  { name: 'PPC --- PPC_E500V1_SOFT', value: 'PPC_E500V1_SOFT' },
  { name: 'PPC --- PPC_E500V2', value: 'PPC_E500V2' },
  { name: 'PPC --- PPC_E500V2_SOFT', value: 'PPC_E500V2_SOFT' },
  { name: 'PPC --- PPC_E500MC', value: 'PPC_E500MC' },
  { name: 'PPC --- PPC_E500MC_SOFT', value: 'PPC_E500MC_SOFT' },
  { name: 'PPC --- PPC_E5500', value: 'PPC_E5500' },
  { name: 'PPC --- PPC_E5500_SOFT', value: 'PPC_E5500_SOFT' },
  { name: 'PPC --- PPC_E6500', value: 'PPC_E6500' },
  { name: 'PPC --- PPC_E6500_SOFT', value: 'PPC_E6500_SOFT' },
  { name: 'SPARC - SPARC_LEON3', value: 'SPARC_LEON3' },
  { name: 'SPARC - SPARC_LEON3_SOFT', value: 'SPARC_LEON3_SOFT' },
  { name: 'SPARC - SPARC_V8', value: 'SPARC_V8' },
  { name: 'SPARC - SPARC_V8_SOFT', value: 'SPARC_V8_SOFT' },
  { name: 'RISCV - RISCV_GC32', value: 'RISCV_GC32' },
  { name: 'RISCV - RISCV_GC32_SOFT', value: 'RISCV_GC32_SOFT' },
  { name: 'RISCV - RISCV_GC64', value: 'RISCV_GC64' },
  { name: 'RISCV - RISCV_GC64_SOFT', value: 'RISCV_GC64_SOFT' },
  { name: 'LOONG - LOONGARCH64', value: 'LOONGARCH64' },
  { name: 'LOONG - LOONGARCH64_SOFT', value: 'LOONGARCH64_SOFT' },
  { name: 'CSKY -- CSKY_CK807', value: 'CSKY_CK807' },
  { name: 'CSKY -- CSKY_CK807_SOFT', value: 'CSKY_CK807_SOFT' },
  { name: 'CSKY -- CSKY_CK810', value: 'CSKY_CK810' },
  { name: 'CSKY -- CSKY_CK810_SOFT', value: 'CSKY_CK810_SOFT' },
  { name: 'CSKY -- CSKY_CK860', value: 'CSKY_CK860' },
  { name: 'CSKY -- CSKY_CK860_SOFT', value: 'CSKY_CK860_SOFT' },
  { name: 'SW6B -- SW6B', value: 'SW6B' },
  { name: 'SW6B -- SW6B_SOFT', value: 'SW6B_SOFT' }
];

/**
 * SylixOS base 默认组件列表
 * 对应 base/Makefile 中的 COMPONENTS
 */
export const BASE_COMPONENT_VALUES = [
  'libsylixos',
  'libcextern',
  'libVxWorks',
  'libreadline',
  'liblua',
  'libsqlite3',
  'pciutils',
  'libzmodem',
  'libexpat',
  'libluaplugin',
  'libsunrpc',
  'unfsd',
  'libsalsa',
  'libpcap',
  'openssl',
  'libcurl',
  'libffi',
  'libwayland',
  'libgtest',
  'tcpdump',
  'zlib',
  'libarchive',
  'openssh',
] as const;

export const REQUIRED_BASE_COMPONENTS = [
  'libsylixos',
] as const;

export const BASE_COMPONENTS = BASE_COMPONENT_VALUES.map((value) => ({
  name: value,
  value,
}));
