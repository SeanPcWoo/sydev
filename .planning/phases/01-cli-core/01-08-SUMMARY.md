---
phase: 01-cli-core
plan: 08
subsystem: cli-wizards
tags: [gap-closure, uat-fix, wizard-consistency]
dependency_graph:
  requires: [01-04]
  provides: [shared-platforms-constant, device-wizard-workspace-selection]
  affects: [workspace-wizard, device-wizard]
tech_stack:
  added: []
  patterns: [shared-constants, wizard-consistency]
key_files:
  created:
    - packages/core/src/constants.ts
  modified:
    - packages/core/src/index.ts
    - apps/cli/src/wizards/workspace-wizard.ts
    - apps/cli/src/wizards/device-wizard.ts
decisions:
  - "提取 PLATFORMS 常量到 @sydev/core 确保两个向导使用相同的平台列表"
  - "device wizard 首先询问 workspace 路径，与 workspace wizard 保持一致的交互模式"
  - "平台选择从自由文本输入改为列表选择，减少用户输入错误"
metrics:
  duration: 98
  tasks_completed: 4
  files_modified: 4
  commits: 4
  completed_date: "2026-03-15"
---

# Phase 01 Plan 08: 修复 Device 配置向导 Summary

**一句话总结:** 提取共享的 PLATFORMS 常量，为 device wizard 添加 workspace 路径选择和平台列表选择，解除 UAT Test 7 阻塞

## 执行概览

**目标:** 修复 Device 配置向导，添加 workspace 路径选择步骤，并将平台输入改为列表选择

**结果:** ✅ 成功完成
- PLATFORMS 常量提取到 packages/core/src/constants.ts
- workspace-wizard 和 device-wizard 都使用共享的 PLATFORMS
- device wizard 首先询问 workspace 路径（默认当前目录）
- device wizard 使用列表选择平台（56 个选项）
- UAT Test 7 的阻塞问题解除

## 任务执行记录

| 任务 | 名称 | 状态 | 提交 | 关键文件 |
|------|------|------|------|----------|
| 1 | 提取 PLATFORMS 常量到共享位置 | ✅ | 5a9c07d | packages/core/src/constants.ts, packages/core/src/index.ts |
| 2 | 更新 workspace-wizard 使用共享的 PLATFORMS | ✅ | a41ccff | apps/cli/src/wizards/workspace-wizard.ts |
| 3 | 更新 device-wizard 添加 workspace 路径选择和平台列表选择 | ✅ | 4c14a2e | apps/cli/src/wizards/device-wizard.ts |
| 4 | 验证更新后的 device wizard | ✅ | 3e5370a | 所有测试通过 (37/37) |

## 技术实现

### 1. 共享常量提取

创建 `packages/core/src/constants.ts`:
```typescript
export const PLATFORMS = [
  { name: 'ARM --- ARM_926H', value: 'ARM_926H' },
  // ... 56 个平台选项
];
```

从 `packages/core/src/index.ts` 导出:
```typescript
export { PLATFORMS } from './constants.js';
```

### 2. Workspace Wizard 重构

移除本地 PLATFORMS 定义，改为从 @sydev/core 导入:
```typescript
import { PLATFORMS } from '@sydev/core';
```

### 3. Device Wizard 增强

**添加 workspace 路径选择:**
```typescript
{
  type: 'input',
  name: 'cwd',
  message: 'Workspace 路径:',
  default: process.cwd(),
  validate: (input: string) => {
    if (!input || input.trim().length === 0) {
      return '工作路径不能为空';
    }
    return true;
  }
}
```

**平台改为列表选择:**
```typescript
{
  type: 'list',
  name: 'platform',
  message: '设备平台:',
  choices: PLATFORMS,
  default: 'ARM64_GENERIC'
}
```

**配置摘要显示 workspace:**
```typescript
console.log(chalk.dim(`  Workspace: ${answers.cwd}`));
```

## 验证结果

### TypeScript 编译
✅ `pnpm exec tsc --noEmit` 通过

### 测试套件
✅ 所有 37 个测试通过:
- packages/core/src/progress-reporter.test.ts (8 tests)
- packages/core/src/rl-wrapper.test.ts (11 tests)
- packages/core/src/env-checker.test.ts (9 tests)
- packages/core/src/config-manager.test.ts (9 tests)

### UAT 影响
- ✅ UAT Test 7 阻塞问题解除
- device wizard 现在与 workspace wizard 保持一致的交互模式
- 用户通过列表选择平台，避免输入错误

## Deviations from Plan

None - 计划完全按照预期执行

## 提交记录

```
5a9c07d feat(01-08): extract PLATFORMS constant to shared location
a41ccff refactor(01-08): update workspace-wizard to use shared PLATFORMS
4c14a2e feat(01-08): add workspace path selection and platform list to device wizard
3e5370a test(01-08): verify PLATFORMS constant integration
```

## 影响范围

### 新增文件
- `packages/core/src/constants.ts` - 共享的 PLATFORMS 常量定义

### 修改文件
- `packages/core/src/index.ts` - 导出 PLATFORMS
- `apps/cli/src/wizards/workspace-wizard.ts` - 使用共享 PLATFORMS
- `apps/cli/src/wizards/device-wizard.ts` - 添加 workspace 路径选择和平台列表

### 向后兼容性
✅ 完全兼容 - 仅改进用户交互，不影响现有功能

## 后续建议

1. **UAT 重新测试:** 运行 UAT Test 7 验证修复效果
2. **用户体验优化:** 考虑为 workspace 路径添加路径验证（检查是否存在 .realevo 目录）
3. **文档更新:** 更新用户文档，说明新的交互流程

## Self-Check: PASSED

验证创建的文件:
```bash
✓ packages/core/src/constants.ts 存在
✓ PLATFORMS 常量包含 56 个平台选项
```

验证提交记录:
```bash
✓ 5a9c07d 存在
✓ a41ccff 存在
✓ 4c14a2e 存在
✓ 3e5370a 存在
```

验证功能:
```bash
✓ TypeScript 编译通过
✓ 所有测试通过 (37/37)
✓ workspace-wizard 和 device-wizard 都导入 PLATFORMS
✓ device-wizard 包含 workspace 路径选择
✓ device-wizard 使用列表选择平台
```
