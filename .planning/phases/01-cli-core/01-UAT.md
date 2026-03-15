---
status: diagnosed
phase: 01-cli-core
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md
started: 2026-03-14T08:15:00Z
updated: 2026-03-15T09:22:00Z
---

## Current Test

[testing complete]

## Tests

### 1. 环境检查 - rl 命令不存在时的错误提示
expected: 运行任何 CLI 命令（如 `pnpm dev:cli workspace status`）时，如果 rl 命令不存在，应该显示清晰的中文错误提示，说明 RealEvo-Stream 工具链未安装，并提供修复建议（如安装路径或环境变量设置）。
result: issue
reported: "系统明明有 rl-workspace、rl-project 等命令，但环境检查失败。检查器在找不存在的 `rl` 命令，应该检查实际的 `rl-workspace`、`rl-project` 等命令。另外错误信息混合中英文，修复建议是英文且不够具体。"
severity: blocker

### 2. 帮助系统 - 主命令帮助信息
expected: 运行 `pnpm dev:cli --help` 显示美化的中文帮助信息，包含所有子命令（workspace、project、device、completion）及其描述，使用 chalk 颜色高亮。
result: pass

### 3. 帮助系统 - 子命令帮助信息
expected: 运行 `pnpm dev:cli workspace --help` 显示 workspace 子命令的帮助信息，包含 init 和 status 两个操作及其说明。
result: pass

### 4. 帮助系统 - 版本信息
expected: 运行 `pnpm dev:cli --version` 显示版本号 0.1.0。
result: pass

### 5. 交互式向导 - Workspace 初始化流程
expected: 运行 `pnpm dev:cli workspace init` 启动交互式向导，依次提示输入 Base 版本、平台、构建选项。输入错误格式时立即显示验证错误（如版本号格式不正确）。完成输入后显示配置摘要并要求确认。
result: pass

### 6. 交互式向导 - Project 创建流程
expected: 运行 `pnpm dev:cli project create` 启动交互式向导，提示输入项目名称（验证 3-50 字符）、选择项目类型（app/lib/driver）、可选模板名称、项目路径。输入验证即时反馈，完成后显示配置摘要。
result: issue
reported: "整个逻辑不对，首先还是要用户选择创建好的 workspace 的路径，默认情况，应该就是执行命令的所在目录。然后创建工程时，先是询问是导入已有git 工程，还是新建工程，如果是导入已有工程，那么直接让用户写 git 仓库地址和分支，并且工程的默认名称就是git 的文件名称。另外没有项目版本号的概念"
severity: blocker

### 7. 交互式向导 - Device 配置流程
expected: 运行 `pnpm dev:cli device add` 启动交互式向导，提示输入设备名称、IP 地址（验证 IPv4 格式）、SSH 端口（验证 1-65535）、用户名、密码（mask 显示）。完成后保存到 .sydev/devices.json 文件。
result: issue
reported: "同样要先让用户指定 workspace 路径，然后平台也是在 workspace init 一样，要让用户选择"
severity: blocker

### 8. 进度反馈 - 实时进度显示
expected: 在交互式向导执行操作时（如 workspace init），显示 ora spinner 进度指示器，显示当前步骤名称和进度百分比，操作成功时显示绿色成功提示。
result: pass

### 9. Shell 补全 - bash 补全脚本生成
expected: 运行 `pnpm dev:cli completion bash` 输出 bash 补全脚本到 stdout，脚本包含所有命令和子命令（workspace init/status, project create/list, device add/list, completion bash/zsh/install）。
result: pass

### 10. Shell 补全 - zsh 补全脚本生成
expected: 运行 `pnpm dev:cli completion zsh` 输出 zsh 补全脚本到 stdout，脚本包含所有命令和子命令。
result: pass

### 11. Shell 补全 - 自动安装功能
expected: 运行 `pnpm dev:cli completion install` 自动检测当前 Shell 类型（bash 或 zsh），将补全脚本安装到相应位置（bash: ~/.bashrc, zsh: ~/.zsh/completion/_openswitch），显示安装成功提示和后续步骤。
result: pass

## Summary

total: 11
passed: 8
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "环境检查器能够正确检测 RealEvo-Stream 工具链（rl-workspace、rl-project 等命令）"
  status: resolved
  reason: "User reported: 系统明明有 rl-workspace、rl-project 等命令，但环境检查失败。检查器在找不存在的 `rl` 命令，应该检查实际的 `rl-workspace`、`rl-project` 等命令。另外错误信息混合中英文，修复建议是英文且不够具体。"
  severity: blocker
  test: 1
  root_cause: "checkRlCommand() 函数检查了不存在的 `rl --version` 命令。根据项目文档，RealEvo-Stream 工具链的实际命令是 `rl-workspace`、`rl-project`、`rl-device`、`rl-build` 等独立命令，不存在统一的 `rl` 命令。此外，所有错误消息和修复建议都是英文，不符合用户偏好，且修复建议过于笼统，缺乏可操作性。"
  artifacts:
    - path: "packages/core/src/env-checker.ts"
      issue: "checkRlCommand() 检查了错误的命令名称（rl --version），错误消息全部为英文且不够具体"
  resolution: "Plan 01-06 修复了所有问题：命令检测改为 rl-workspace，所有错误消息中文化，修复建议包含具体命令示例和路径示例"
  resolved_by: "01-06"
  debug_session: ".planning/debug/env-check-wrong-command.md"

- truth: "Project 创建向导应该先选择 workspace 路径（默认当前目录），然后询问是导入已有 git 工程还是新建工程，导入时提供 git 仓库地址和分支，工程名称默认为 git 仓库名"
  status: failed
  reason: "User reported: 整个逻辑不对，首先还是要用户选择创建好的 workspace 的路径，默认情况，应该就是执行命令的所在目录。然后创建工程时，先是询问是导入已有git 工程，还是新建工程，如果是导入已有工程，那么直接让用户写 git 仓库地址和分支，并且工程的默认名称就是git 的文件名称。另外没有项目版本号的概念"
  severity: blocker
  test: 6
  root_cause: "Project wizard 实现了完全错误的交互流程，缺少三个关键功能：1) 缺少 workspace 路径选择（应默认为当前目录）；2) 缺少导入/新建分支逻辑（导入模式询问 git 仓库地址和分支，项目名称默认为 git 仓库名；新建模式询问项目名称、模板等）；3) 错误包含 version 字段（用户明确表示没有项目版本号概念）。根本原因：初始设计时没有理解 RealEvo-Stream 工具链的实际工作流程。"
  artifacts:
    - path: "apps/cli/src/wizards/project-wizard.ts"
      issue: "整个交互流程需要重构，添加 workspace 路径选择和导入/新建分支逻辑"
    - path: "packages/core/src/schemas/project-schema.ts"
      issue: "移除 version 字段，调整 source/branch 字段语义"
    - path: "packages/core/src/rl-wrapper.ts"
      issue: "ProjectCreateOptions 和 createProject() 方法需要移除 version 参数"
  missing:
    - "重构 project wizard 为两阶段流程：第一阶段询问 workspace 路径和导入/新建选择；第二阶段根据选择分别处理导入（git 仓库+分支，自动提取项目名）或新建（现有字段，去除 version）"
  debug_session: ".planning/debug/project-wizard-wrong-flow.md"

- truth: "Device 配置向导应该先让用户指定 workspace 路径，然后让用户选择平台（与 workspace init 相同的平台选择流程）"
  status: failed
  reason: "User reported: 同样要先让用户指定 workspace 路径，然后平台也是在 workspace init 一样，要让用户选择"
  severity: blocker
  test: 7
  root_cause: "Device wizard 缺少两个关键功能：1) 未提示用户指定 workspace 路径（workspace wizard 在第一步就询问路径，device wizard 直接从设备名称开始）；2) 平台选择使用自由文本输入而非列表选择（workspace wizard 使用 type: 'list' 配合 PLATFORMS 常量提供结构化选择，device wizard 使用 type: 'input' 允许任意文本）"
  artifacts:
    - path: "apps/cli/src/wizards/device-wizard.ts"
      issue: "缺少 workspace 路径输入步骤；平台字段使用 type: 'input' 而非 type: 'list'；未导入 PLATFORMS 常量"
  missing:
    - "在设备名称之前添加 workspace 路径输入（参考 workspace-wizard.ts line 86-96）"
    - "将平台字段从 type: 'input' 改为 type: 'list'，使用与 workspace wizard 相同的 PLATFORMS 选项列表"
    - "需要将 PLATFORMS 常量提取到共享位置或在 device-wizard.ts 中复制定义"
  debug_session: ""
