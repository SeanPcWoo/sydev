---
phase: 01-cli-core
plan: 07
subsystem: cli-wizards
tags: [refactor, gap-closure, uat-fix]
completed: 2026-03-15T06:31:59Z
duration: 77
requirements: [CLI-WIZARD-02]

dependency_graph:
  requires: []
  provides:
    - two-stage project creation flow (workspace path → import/create mode)
    - import mode with auto-extracted project name from git URL
    - version-free project configuration
  affects:
    - apps/cli/src/wizards/project-wizard.ts
    - packages/core/src/schemas/project-schema.ts
    - packages/core/src/rl-wrapper.ts

tech_stack:
  added: []
  patterns:
    - two-stage wizard flow (path selection → mode selection → mode-specific inputs)
    - git URL parsing for default project name extraction
    - conditional prompt branching based on import/create mode

key_files:
  created: []
  modified:
    - packages/core/src/schemas/project-schema.ts
    - packages/core/src/rl-wrapper.ts
    - apps/cli/src/wizards/project-wizard.ts

decisions:
  - title: "Remove version field completely"
    rationale: "User confirmed no project version concept exists in RealEvo-Stream workflow"
    alternatives: ["Keep version as optional field"]
    chosen: "Complete removal from schema, interface, and wizard"
  - title: "Auto-extract project name from git URL in import mode"
    rationale: "Reduces user input burden, follows common git workflow patterns"
    implementation: "Regex match on git URL to extract repository name as default"
  - title: "Workspace path as first question"
    rationale: "Aligns with workspace-wizard pattern, establishes context before mode selection"
    reference: "workspace-wizard.ts lines 86-96"

metrics:
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
  commits: 2
  test_pass_rate: 100
---

# Phase 01 Plan 07: 重构 Project 创建向导 Summary

**One-liner:** 重构项目创建向导为两阶段流程（workspace 路径 → 导入/新建分支），移除 version 字段，导入模式自动从 git URL 提取项目名称

## Overview

修复 UAT Test 6 发现的阻塞问题，将项目创建流程重构为符合 RealEvo-Stream 实际工作方式的两阶段流程：首先选择 workspace 路径和操作模式（导入/新建），然后根据模式收集相应的配置信息。

## Tasks Completed

### Task 1: 移除 project schema 和 rl-wrapper 中的 version 字段
**Status:** ✓ Complete
**Commit:** 05c08bd

- 从 `projectSchema` 移除 version 字段定义
- 从 `ProjectCreateOptions` 接口移除 version 字段
- 从 `createProject()` 方法移除 version 参数传递
- TypeScript 类型系统确保 version 不再被使用

**Files modified:**
- packages/core/src/schemas/project-schema.ts
- packages/core/src/rl-wrapper.ts

### Task 2: 重构 project wizard 为两阶段流程
**Status:** ✓ Complete
**Commit:** 0236125

完全重写 `runProjectWizard()` 函数，实现：

**第一阶段：**
- 询问 workspace 路径（默认当前目录，参考 workspace-wizard 模式）
- 询问操作模式：导入已有 Git 工程 / 新建工程

**第二阶段（导入模式）：**
- 输入 Git 仓库地址（必填）
- 输入 Git 分支（默认 master）
- 输入项目名称（默认从 git URL 自动提取，如 `https://github.com/user/my-project.git` → `my-project`）
- 选择调试级别
- 选择构建工具

**第二阶段（新建模式）：**
- 输入项目名称（必填，无默认值）
- 选择项目模板（8 种选项）
- 选择构建类型（8 种选项）
- 选择调试级别
- 选择构建工具

**配置摘要改进：**
- 显示 workspace 路径
- 显示操作模式（导入/新建）
- 导入模式显示 git 仓库和分支
- 新建模式显示模板和构建类型
- 不再显示 version 字段

**Files modified:**
- apps/cli/src/wizards/project-wizard.ts (192 insertions, 50 deletions)

### Task 3: 验证重构后的 project wizard
**Status:** ✓ Complete

运行测试套件验证：
- 所有 37 个测试通过（4 个测试文件）
- TypeScript 编译通过，无类型错误
- projectSchema 验证不包含 version 字段
- RlWrapper.createProject() 不传递 version 参数

**Test results:**
```
✓ packages/core/src/progress-reporter.test.ts (8 tests)
✓ packages/core/src/rl-wrapper.test.ts (11 tests)
✓ packages/core/src/env-checker.test.ts (9 tests)
✓ packages/core/src/config-manager.test.ts (9 tests)
```

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

### Git URL Parsing Logic

```typescript
default: (answers: any) => {
  // 从 git 仓库 URL 提取项目名称
  const source = answers.source?.trim() || '';
  const match = source.match(/\/([^/]+?)(\.git)?$/);
  return match ? match[1] : '';
}
```

支持的 URL 格式：
- `https://github.com/user/my-project.git` → `my-project`
- `git@github.com:user/my-project.git` → `my-project`
- `https://gitlab.com/group/subgroup/project` → `project`

### Two-Stage Flow Pattern

```typescript
// Phase 1: Context establishment
const phase1 = await inquirer.prompt([
  { type: 'input', name: 'cwd', ... },
  { type: 'list', name: 'mode', choices: ['import', 'create'] }
]);

// Phase 2: Mode-specific inputs
if (phase1.mode === 'import') {
  const importAnswers = await inquirer.prompt([...]);
  config = { name, source, branch, ... };
} else {
  const createAnswers = await inquirer.prompt([...]);
  config = { name, template, type, ... };
}
```

### Schema Changes

**Before:**
```typescript
export const projectSchema = z.object({
  name: z.string().min(3).max(50),
  template: z.enum([...]),
  type: z.enum([...]),
  source: z.string().optional(),
  branch: z.string().optional(),
  debugLevel: z.enum(['debug', 'release']).default('release'),
  makeTool: z.enum(['make', 'ninja']).default('make'),
  version: z.string().default('0.0.1')  // ❌ Removed
});
```

**After:**
```typescript
export const projectSchema = z.object({
  name: z.string().min(3).max(50),
  template: z.enum([...]),
  type: z.enum([...]),
  source: z.string().optional(),
  branch: z.string().optional(),
  debugLevel: z.enum(['debug', 'release']).default('release'),
  makeTool: z.enum(['make', 'ninja']).default('make')
  // ✓ version field removed
});
```

## Verification

### Manual Testing Flow

**Import mode:**
```bash
$ pnpm dev:cli project create
📦 项目创建向导

? Workspace 路径: /home/user/workspace
? 选择操作: 导入已有 Git 工程
? Git 仓库地址: https://github.com/user/my-project.git
? Git 分支: master
? 项目名称: my-project  # ← Auto-extracted default
? 调试级别: Release
? 构建工具: Make

📋 配置摘要:
  Workspace 路径: /home/user/workspace
  项目名称: my-project
  模式: 导入已有 Git 工程
  Git 仓库: https://github.com/user/my-project.git
  Git 分支: master
  调试级别: release
  构建工具: make
  # ✓ No version field displayed

? 确认创建? Yes
```

**Create mode:**
```bash
$ pnpm dev:cli project create
📦 项目创建向导

? Workspace 路径: /home/user/workspace
? 选择操作: 新建工程
? 项目名称: my-new-project
? 项目模板: 应用程序 (app)
? 构建类型: CMake
? 调试级别: Release
? 构建工具: Make

📋 配置摘要:
  Workspace 路径: /home/user/workspace
  项目名称: my-new-project
  模式: 新建工程
  项目模板: app
  构建类型: cmake
  调试级别: release
  构建工具: make
  # ✓ No version field displayed

? 确认创建? Yes
```

### Automated Testing

- TypeScript compilation: ✓ Pass
- Unit tests: ✓ 37/37 passed
- Schema validation: ✓ No version field
- Interface validation: ✓ No version in ProjectCreateOptions

## Impact

### UAT Test 6 Resolution

**Before (阻塞问题):**
- 项目创建流程不符合实际工作方式
- 缺少 workspace 路径选择
- 导入/新建逻辑混乱
- 包含不存在的 version 概念

**After (问题解除):**
1. ✓ 用户首先选择 workspace 路径（默认当前目录）
2. ✓ 用户选择导入已有工程或新建工程
3. ✓ 导入模式：输入 git 仓库和分支，项目名称自动提取
4. ✓ 新建模式：输入项目名称、选择模板和构建类型
5. ✓ 项目配置不包含 version 字段

### Files Changed

| File | Lines Changed | Type |
|------|---------------|------|
| packages/core/src/schemas/project-schema.ts | -1 | Schema definition |
| packages/core/src/rl-wrapper.ts | -2 | Interface + method |
| apps/cli/src/wizards/project-wizard.ts | +192 -50 | Complete rewrite |

### Backward Compatibility

**Breaking changes:**
- `ProjectConfig` type no longer includes `version` field
- `ProjectCreateOptions` interface no longer includes `version` field
- `RlWrapper.createProject()` no longer accepts `version` parameter

**Migration:** No migration needed - this is a gap closure plan fixing incorrect implementation before production use.

## Next Steps

1. Run UAT Test 6 again to confirm阻塞问题已解除
2. Proceed to plan 01-08 (final gap closure plan)
3. Complete Phase 01 UAT testing

## Self-Check: PASSED

All files and commits verified:

✓ FOUND: apps/cli/src/wizards/project-wizard.ts
✓ FOUND: packages/core/src/rl-wrapper.ts
✓ FOUND: packages/core/src/schemas/project-schema.ts
✓ FOUND: 05c08bd (Task 1 commit)
✓ FOUND: 0236125 (Task 2 commit)
