---
status: diagnosed
trigger: "Diagnose root cause for UAT gap from Phase 01-cli-core - Project 创建向导应该先选择 workspace 路径（默认当前目录），然后询问是导入已有 git 工程还是新建工程，导入时提供 git 仓库地址和分支，工程名称默认为 git 仓库名"
created: 2026-03-15T10:30:00Z
updated: 2026-03-15T10:35:00Z
---

## Current Focus

hypothesis: Project wizard 实现了错误的交互流程，缺少 workspace 路径选择和导入/新建工程的分支逻辑
test: 分析 project-wizard.ts 代码结构，对比 workspace-wizard.ts 的实现模式
expecting: 确认缺少的功能点和需要修改的文件
next_action: 完成代码分析，输出根因报告

## Symptoms

expected: "Project 创建向导应该先选择 workspace 路径（默认当前目录），然后询问是导入已有 git 工程还是新建工程，如果是导入已有工程，那么直接让用户写 git 仓库地址和分支，并且工程的默认名称就是 git 仓库名。另外没有项目版本号的概念"
actual: "当前 project wizard 直接询问项目名称、模板、构建类型等，没有 workspace 路径选择，没有导入/新建分支，有项目版本号字段"
errors: 无错误消息，但整个交互流程不符合预期
reproduction: 运行 `pnpm dev:cli project create`
started: 从项目开始就存在此问题

## Eliminated

(无)

## Evidence

- timestamp: 2026-03-15T10:30:00Z
  checked: apps/cli/src/wizards/project-wizard.ts (lines 14-107)
  found: |
    当前流程：
    1. 直接询问项目名称 (name)
    2. 选择项目模板 (template) - 8 种选项
    3. 选择构建类型 (type) - 8 种选项
    4. 输入源码路径或 Git URL (source) - 可选
    5. 输入 Git 分支 (branch) - 仅当 source 是 git URL 时显示
    6. 选择调试级别 (debugLevel)
    7. 选择构建工具 (makeTool)
    8. 输入项目版本号 (version) - 默认 0.0.1
  implication: 完全缺少 workspace 路径选择步骤，没有"导入已有工程 vs 新建工程"的分支逻辑

- timestamp: 2026-03-15T10:31:00Z
  checked: apps/cli/src/wizards/workspace-wizard.ts (lines 84-96)
  found: |
    workspace wizard 第一步就是询问 workspace 路径：
    ```typescript
    {
      type: 'input',
      name: 'cwd',
      message: 'Workspace 创建路径:',
      default: process.cwd(),
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return '工作路径不能为空';
        }
        return true;
      }
    }
    ```
  implication: workspace wizard 有正确的路径选择模式，project wizard 应该参考此实现

- timestamp: 2026-03-15T10:32:00Z
  checked: packages/core/src/schemas/project-schema.ts
  found: |
    schema 包含 version 字段：
    ```typescript
    version: z.string().default('0.0.1')
    ```
    但用户反馈"没有项目版本号的概念"
  implication: version 字段不应该存在，需要从 schema 和 wizard 中移除

- timestamp: 2026-03-15T10:33:00Z
  checked: packages/core/src/rl-wrapper.ts (lines 140-160)
  found: |
    createProject() 方法接收 ProjectCreateOptions，包含 version 参数，
    并传递给 rl-project 命令：`--version=${config.version}`
  implication: RlWrapper 也需要修改，移除 version 参数

## Resolution

root_cause: |
  Project wizard 实现了完全错误的交互流程：

  1. **缺少 workspace 路径选择**：没有第一步询问用户选择已创建的 workspace 路径（应默认为当前目录）

  2. **缺少导入/新建分支逻辑**：没有询问用户是"导入已有 git 工程"还是"新建工程"
     - 如果是导入：应该直接询问 git 仓库地址和分支，项目名称默认为 git 仓库名
     - 如果是新建：才询问项目名称、模板、构建类型等

  3. **错误包含 version 字段**：用户明确表示"没有项目版本号的概念"，但当前实现在 wizard、schema、rl-wrapper 中都包含 version 字段

  4. **source/branch 字段语义不清**：当前 source 字段混合了"源码路径"和"Git URL"两种用途，应该在导入模式下专门处理 git 仓库

  根本原因是初始设计时没有理解正确的业务流程，直接按照通用项目创建向导的模式实现，而不是 RealEvo-Stream 工具链的实际工作流程。

fix: "诊断完成，不执行修复（goal: find_root_cause_only）"
verification: "N/A"
files_changed:
  - apps/cli/src/wizards/project-wizard.ts
  - packages/core/src/schemas/project-schema.ts
  - packages/core/src/rl-wrapper.ts
