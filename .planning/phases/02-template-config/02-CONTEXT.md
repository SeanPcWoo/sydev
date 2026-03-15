# Phase 2: 模板与配置系统 - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

用户可以保存当前配置为可复用的模板，管理模板库，并通过配置文件快速初始化环境。包括模板的创建、列表、应用、删除，以及配置的导入导出和单命令初始化功能。

</domain>

<decisions>
## Implementation Decisions

### 模板存储结构
- 使用单文件索引 + 独立模板文件的方式组织
- 模板存储在项目根目录的 `./templates/` 目录
- `templates/index.json` 存储元数据列表（id, name, description, type, createdAt, updatedAt）
- `templates/{id}.json` 存储各个模板的完整内容
- 模板 ID 基于名称的 slug 生成（如 "my-dev-env" → "my-dev-env"）
- 元数据包含基础字段：id、name、description、type、createdAt、updatedAt

### 模板类型设计
- 支持四种模板类型：
  - `workspace`：环境模板，只保存 workspace 配置
  - `project`：项目模板，只保存 project 配置
  - `device`：设备模板，只保存 device 配置
  - `full`：全流程模板，包含完整的 workspace + projects 数组 + devices 数组
- 全流程模板使用完整配置结构（直接嵌入所有配置，不使用引用）
- 每个模板类型独立存储，通过 type 字段区分

### 单命令初始化流程
- 使用 `sydev init --config config.json` 命令从配置文件初始化
- 严格顺序执行：1) workspace 初始化 → 2) 所有 project 创建 → 3) 所有 device 配置
- 失败处理策略：任何步骤失败即停止，保留已创建的资源，显示错误和已完成的步骤
- 用户可以修复问题后重新运行命令继续初始化
- 进度反馈使用 Phase 1 已建立的 EventEmitter 架构

### 模板应用行为
- 应用模板时检测到现有配置时提示用户选择：覆盖、合并、取消
- 合并策略：模板值优先（模板中的字段覆盖现有值，模板中没有的字段保留现有值）
- 支持部分应用：对于 full 模板，用户可以选择只应用 workspace、或只应用某些 project/device
- 应用前进行配置验证（使用 Phase 1 的 zod schema）

### Claude's Discretion
- 模板 ID 冲突时的具体处理方式（重命名或拒绝）
- 模板列表的排序和过滤逻辑
- 配置文件的 schema 版本化策略
- 错误消息的具体措辞

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ConfigManager** (packages/core/src/config-manager.ts): 已有 validate、merge、exportToJson、importFromJson 方法，可直接用于模板的验证和导入导出
- **Schema 定义** (packages/core/src/schemas/): workspace、project、device 的 zod schema 已完整定义，可用于模板内容验证
- **ProgressReporter** (packages/core/src/progress-reporter.ts): EventEmitter 架构已建立，可用于初始化流程的进度反馈
- **RlWrapper** (packages/core/src/rl-wrapper.ts): 已封装 rl 命令调用，可复用于模板应用时的实际操作

### Established Patterns
- 配置存储模式：`.sydev/` 目录用于存储配置文件（devices.json 已使用此模式）
- 中文错误信息：所有错误消息和修复建议使用中文
- 配置验证：使用 zod schema 进行类型安全的验证
- 进度报告：基于 EventEmitter 的事件驱动架构

### Integration Points
- 模板保存功能需要读取当前的 workspace/project/device 配置
- 模板应用功能需要调用 Phase 1 的 workspace-wizard、project-wizard、device-wizard 逻辑
- CLI 命令需要扩展 apps/cli/src/index.ts 添加 template 子命令和 init --config 选项

</code_context>

<specifics>
## Specific Ideas

- 模板目录使用 `./templates/` 而不是 `.sydev/templates/`，因为用户希望模板随项目版本控制
- 模板 ID 使用 slug 而不是 UUID，便于用户记忆和手动引用
- 支持部分应用是为了灵活性：用户可能只想应用 full 模板中的 workspace 部分，而不创建所有 project

</specifics>

<deferred>
## Deferred Ideas

无 — 讨论保持在 Phase 2 范围内

</deferred>

---

*Phase: 02-template-config*
*Context gathered: 2026-03-15*
