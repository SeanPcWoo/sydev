# Phase 3: Web UI 与批量操作 - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

通过 Web 界面提供可视化配置（workspace/project/device）、环境状态查看、模板管理（CRUD + 导入导出），以及批量创建项目和设备的能力。Web 服务内嵌于 CLI，用户通过 `sydev web` 启动。

</domain>

<decisions>
## Implementation Decisions

### Web 框架与架构
- 前端框架：React
- UI 组件库：Tailwind CSS + shadcn/ui
- Web 服务启动方式：CLI 内嵌 Web 服务，用户运行 `sydev web` 启动本地服务器，浏览器自动打开
- 前后端通信：REST API 处理 CRUD 操作，WebSocket 推送实时进度（初始化、批量操作）
- 后端桥接：EventEmitter 进度事件通过 WebSocket 转发到前端

### 界面布局与交互
- 页面结构：侧边栏导航（配置/状态/模板/批量），右侧内容区
- 配置表单：Workspace、Project、Device 分三个独立 Tab/子页面，各有独立表单
- 状态面板：卡片式概览，Workspace 状态卡、项目列表卡、设备列表卡
- 表单验证：实时验证，复用 @sydev/core 的 zod schema，字段失焦时确认

### 批量操作体验
- 批量定义方式：表单逐个添加项目/设备，每个有独立表单
- 进度展示：列表式状态跟踪，每个项目/设备一行，显示名称、状态（等待/进行中/成功/失败）、进度
- 失败处理：跳过失败项继续执行其余，最后汇总失败项，支持一键重试失败项
- 执行方式：顺序执行，不并行（避免竞态条件）

### 模板管理界面
- 模板列表：卡片网格展示，显示名称、类型标签、描述、创建时间
- 模板编辑：复用配置表单组件，预填模板已有值
- 导入：拖拽或点击上传 JSON 文件，解析后预览内容，确认后保存
- 导出：点击按钮直接下载 JSON 文件
- CLI 导出：显示完整 `sydev init --config ...` 命令供一键复制，同时提供配置文件下载

### Claude's Discretion
- 后端 HTTP 框架选择（Express/Fastify/Hono 等）
- WebSocket 库选择
- React 构建工具选择（Vite 等）
- 侧边栏具体图标和样式
- 卡片具体布局和间距
- 空状态页面设计
- 响应式适配策略

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **@sydev/core 包**: 所有业务逻辑（ConfigManager, TemplateManager, RlWrapper, InitOrchestrator）可直接在 Web 后端调用
- **Zod Schemas** (packages/core/src/schemas/): workspace/project/device/template/full-config schema 已完整定义，Web 端表单验证可复用
- **ProgressReporter** (packages/core/src/progress-reporter.ts): EventEmitter 架构，可桥接到 WebSocket 推送
- **TemplateManager** (packages/core/src/template-manager.ts): 模板 CRUD 已实现，Web 端直接调用

### Established Patterns
- Monorepo 架构：`packages/core` + `apps/cli`，Web UI 作为 `apps/web` 加入
- 配置验证：zod schema 类型安全验证
- 进度报告：EventEmitter 事件驱动
- 中文错误信息和修复建议
- 模板存储：`./templates/` 目录，index.json + {id}.json

### Integration Points
- Web 后端调用 @sydev/core 的 ConfigManager、TemplateManager、InitOrchestrator
- `sydev web` 命令需要添加到 apps/cli/src/commands/ 或 apps/cli/src/index.ts
- Web 前端作为 apps/web 包，构建产物可能内嵌到 CLI 包中分发

</code_context>

<specifics>
## Specific Ideas

- `sydev web` 启动后自动打开浏览器，类似 Vite dev server 的体验
- 状态面板和配置表单风格统一，都使用卡片式设计
- 模板编辑复用配置表单组件，保持交互一致性
- CLI 导出功能让 Web 配置的结果可以无缝衔接到 CLI 工作流

</specifics>

<deferred>
## Deferred Ideas

None — 讨论保持在 Phase 3 范围内

</deferred>

---

*Phase: 03-web-ui-batch*
*Context gathered: 2026-03-15*
