# sydev 平台参数参考

`sydev workspace init --platforms ...`、`device add --platforms ...`、`workspace.platform`、`device.platform` 的平台值统一来自 `packages/core/src/constants.ts`。

当前列表以 ACOINFO 官方 RealEvo-Stream 文档“平台编译参数”为主：

- 官方页面：<https://docs.acoinfo.com/developer-tools/realevo_stream/platform_compile_parameter.html>
- 本次对照的页面更新时间：2025-04-28

## 可直接使用的平台值

### ARM

- `ARM_926H`
- `ARM_926S`
- `ARM_920T`
- `ARM_A5`
- `ARM_A5_SOFT`
- `ARM_A7`
- `ARM_A7_SOFT`
- `ARM_A8`
- `ARM_A8_SOFT`
- `ARM_A9`
- `ARM_A9_SOFT`
- `ARM_A15`
- `ARM_A15_SOFT`
- `ARM_V7A`
- `ARM_V7A_SOFT`

### ARM64

- `ARM64_A53`
- `ARM64_A55`
- `ARM64_A57`
- `ARM64_A72`
- `ARM64_GENERIC`

### MIPS

- `MIPS32`
- `MIPS32_SOFT`
- `MIPS32_R2`
- `MIPS32_R2_SOFT`
- `MIPS64_R2`
- `MIPS64_R2_SOFT`
- `MIPS64_LS3A`
- `MIPS64_LS3A_SOFT`

### x86

- `x86_PENTIUM`
- `x86_PENTIUM_SOFT`
- `X86_64`

### PPC

- `PPC_750`
- `PPC_750_SOFT`
- `PPC_464FP`
- `PPC_464FP_SOFT`
- `PPC_E500V1`
- `PPC_E500V1_SOFT`
- `PPC_E500V2`
- `PPC_E500V2_SOFT`
- `PPC_E500MC`
- `PPC_E500MC_SOFT`
- `PPC_E5500`
- `PPC_E5500_SOFT`
- `PPC_E6500`
- `PPC_E6500_SOFT`

### SPARC

- `SPARC_LEON3`
- `SPARC_LEON3_SOFT`
- `SPARC_V8`
- `SPARC_V8_SOFT`

### RISCV

- `RISCV_GC32`
- `RISCV_GC32_SOFT`
- `RISCV_GC64`
- `RISCV_GC64_SOFT`

### LoongArch

- `LOONGARCH64`
- `LOONGARCH64_SOFT`

### CSKY

- `CSKY_CK807`
- `CSKY_CK807_SOFT`
- `CSKY_CK810`
- `CSKY_CK810_SOFT`
- `CSKY_CK860`
- `CSKY_CK860_SOFT`

## 兼容保留项

以下值保留是为了兼容仓库中已有历史配置，不来自上面这版官方页面：

- `SW6B`
- `SW6B_SOFT`

如果你是在新建配置，优先使用官方页面中仍然列出的平台值。

## 使用建议

- `workspace init --config` 用 `platforms`
- `sydev init` / full 模板用 `workspace.platform`
- 所有平台字段都是数组，支持多选

示例：

```json
{
  "platforms": ["ARM64_GENERIC", "X86_64"]
}
```

```json
{
  "workspace": {
    "platform": ["ARM64_GENERIC", "X86_64"]
  }
}
```
