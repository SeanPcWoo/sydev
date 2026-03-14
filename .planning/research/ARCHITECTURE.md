# Architecture Research

**Domain:** 开发环境初始化工具（Web UI + CLI）
**Researched:** 2026-03-14
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户界面层 (UI Layer)                          │
├──────────────────────────────┬──────────────────────────────────────┤
│      Web UI (React/Vue)      │         CLI (Node.js)                │
│  ┌────────┐  ┌────────┐      │  ┌────────┐  ┌────────┐             │
│  │ 配置表单 │  │ 模板管理 │      │  │ 交互向导 │  │ 命令解析 │             │
│  └───┬────┘  └───┬────┘      │  └───┬────┘  └───┬────┘             │
│      │           │           │      │           │                  │
├──────┴───────────┴───────────┴──────┴───────────┴──────────────────┤
│                       核心业务层 (Core Layer)                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    共享业务逻辑包 (@core)                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │ 配置管理器 │  │ 模板引擎  │  │ 任务编排器 │  │ 验证器    │      │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      执行层 (Execution Layer)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ rl 命令包装器 │  │ 配置文件操作器 │  │ 进度报告器    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
├─────────────────────────────────────────────────────────────────────┤
│                       数据层 (Data Layer)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 模板存储  │  │ 配置存储  │  │ 状态缓存  │  │ 日志存储  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Web UI** | 可视化配置界面、模板管理、状态展示 | React/Vue + Vite，使用 @core 包 |
| **CLI** | 命令行交互、批量操作、自动化脚本 | Node.js + Commander/Yargs + Inquirer |
| **配置管理器** | 配置验证、合并、导入导出 | JSON Schema 验证 + 配置合并逻辑 |
| **模板引擎** | 模板渲染、变量替换、条件逻辑 | Handlebars/Mustache 或 ES6 模板字符串 |
| **任务编排器** | 依赖图构建、并行执行、进度跟踪 | DAG (有向无环图) + 任务队列 |
| **验证器** | 参数验证、环境检查、依赖检测 | JSON Schema + 自定义验证规则 |
| **rl 命令包装器** | 封装 RealEvo-Stream rl 命令调用 | child_process + 错误处理 |
| **配置文件操作器** | 直接读写 .realevo 和 .rlproject 配置 | fs + JSON/YAML 解析器 |
| **进度报告器** | 实时进度反馈、错误提示 | EventEmitter + 进度状态机 |
| **模板存储** | 模板 CRUD、版本管理 | 文件系统 + JSON 格式 |

## Recommended Project Structure

```
openswitch/
├── packages/                    # Monorepo 共享包
│   ├── core/                    # 核心业务逻辑（CLI 和 Web 共享）
│   │   ├── src/
│   │   │   ├── config/          # 配置管理
│   │   │   │   ├── manager.ts   # 配置管理器
│   │   │   │   ├── validator.ts # 配置验证
│   │   │   │   └── schema.ts    # JSON Schema 定义
│   │   │   ├── template/        # 模板引擎
│   │   │   │   ├── engine.ts    # 模板渲染引擎
│   │   │   │   ├── loader.ts    # 模板加载器
│   │   │   │   └── registry.ts  # 模板注册表
│   │   │   ├── orchestrator/    # 任务编排
│   │   │   │   ├── dag.ts       # 依赖图构建
│   │   │   │   ├── executor.ts  # 任务执行器
│   │   │   │   └── scheduler.ts # 并行调度器
│   │   │   ├── executor/        # 执行层
│   │   │   │   ├── rl-wrapper.ts      # rl 命令包装
│   │   │   │   ├── config-writer.ts   # 配置文件直接操作
│   │   │   │   └── strategy.ts        # 执行策略选择
│   │   │   ├── reporter/        # 进度报告
│   │   │   │   ├── progress.ts  # 进度跟踪
│   │   │   │   └── logger.ts    # 日志记录
│   │   │   └── index.ts         # 公共 API 导出
│   │   └── package.json
│   ├── types/                   # 共享类型定义
│   │   ├── src/
│   │   │   ├── config.ts        # 配置类型
│   │   │   ├── template.ts      # 模板类型
│   │   │   └── task.ts          # 任务类型
│   │   └── package.json
│   └── shared/                  # 共享工具函数
│       ├── src/
│       │   ├── fs-utils.ts      # 文件系统工具
│       │   ├── validation.ts    # 通用验证
│       │   └── errors.ts        # 错误定义
│       └── package.json
├── apps/
│   ├── web/                     # Web UI 应用
│   │   ├── src/
│   │   │   ├── components/      # UI 组件
│   │   │   ├── pages/           # 页面
│   │   │   ├── api/             # API 路由（后端）
│   │   │   └── main.ts          # 入口
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── cli/                     # CLI 应用
│       ├── src/
│       │   ├── commands/        # 命令实现
│       │   │   ├── init.ts      # 初始化命令
│       │   │   ├── template.ts  # 模板管理命令
│       │   │   └── wizard.ts    # 交互向导
│       │   ├── prompts/         # Inquirer 提示配置
│       │   ├── ui/              # CLI UI 组件（进度条等）
│       │   └── index.ts         # CLI 入口
│       ├── bin/
│       │   └── openswitch.js    # 可执行文件
│       └── package.json
├── templates/                   # 内置模板
│   ├── workspace/               # workspace 模板
│   ├── project/                 # 项目模板
│   ├── device/                  # 设备模板
│   └── full/                    # 全流程模板
├── pnpm-workspace.yaml          # Monorepo 配置
├── turbo.json                   # Turborepo 配置（可选）
└── package.json
```

### Structure Rationale

- **Monorepo 结构**: 使用 pnpm workspaces 管理多包，CLI 和 Web UI 共享 `@core` 包，避免代码重复
- **packages/core/**: 核心业务逻辑完全独立于 UI 层，可被 CLI 和 Web 同时引用
- **apps/ 分离**: Web 和 CLI 作为独立应用，各自有独立的依赖和构建配置
- **模板外置**: templates/ 目录独立于代码，便于用户自定义和扩展
- **类型共享**: packages/types/ 确保 CLI 和 Web 使用相同的类型定义

## Architectural Patterns

### Pattern 1: Shared Core with Dual Interfaces (共享核心双界面)

**What:** CLI 和 Web UI 共享同一个核心业务逻辑包，通过不同的界面层调用相同的 API

**When to use:** 需要同时提供 CLI 和 GUI 两种交互方式，且业务逻辑复杂

**Trade-offs:**
- ✅ 避免代码重复，逻辑一致性强
- ✅ 修复 bug 和添加功能只需改一处
- ✅ 便于测试（核心逻辑与 UI 解耦）
- ❌ 需要设计良好的抽象层
- ❌ 初期架构设计成本较高

**Example:**
```typescript
// packages/core/src/index.ts
export class WorkspaceInitializer {
  async initialize(config: WorkspaceConfig): Promise<InitResult> {
    // 核心逻辑：验证、执行、报告
    await this.validator.validate(config);
    const tasks = this.orchestrator.buildTasks(config);
    return await this.executor.run(tasks);
  }
}

// apps/cli/src/commands/init.ts
import { WorkspaceInitializer } from '@openswitch/core';
const initializer = new WorkspaceInitializer();
await initializer.initialize(config);

// apps/web/src/api/init.ts
import { WorkspaceInitializer } from '@openswitch/core';
const initializer = new WorkspaceInitializer();
await initializer.initialize(config);
```

### Pattern 2: Hybrid Execution Strategy (混合执行策略)

**What:** 智能选择直接操作配置文件或调用 rl 命令，优化执行速度

**When to use:** 需要与现有工具链兼容，同时追求性能优化

**Trade-offs:**
- ✅ 直接操作配置文件速度快（避免 rl 命令启动开销）
- ✅ 关键操作调用 rl 保证兼容性
- ❌ 需要深入理解 RealEvo-Stream 配置格式
- ❌ 配置格式变更时需要同步更新

**Example:**
```typescript
// packages/core/src/executor/strategy.ts
class ExecutionStrategy {
  async execute(task: Task): Promise<void> {
    if (this.canDirectWrite(task)) {
      // 快速路径：直接写配置文件
      await this.configWriter.write(task.config);
    } else {
      // 安全路径：调用 rl 命令
      await this.rlWrapper.execute(task.command);
    }
  }

  private canDirectWrite(task: Task): boolean {
    // 简单配置修改可直接写入
    return task.type === 'config-update' && !task.requiresValidation;
  }
}
```

### Pattern 3: DAG-based Task Orchestration (基于 DAG 的任务编排)

**What:** 使用有向无环图表示任务依赖关系，自动并行执行独立任务

**When to use:** 需要执行多个有依赖关系的任务，且希望最大化并行度

**Trade-offs:**
- ✅ 自动识别可并行任务，提升执行速度
- ✅ 清晰的依赖关系，易于调试
- ✅ 支持部分失败重试
- ❌ 实现复杂度较高
- ❌ 调试并行执行问题较困难

**Example:**
```typescript
// packages/core/src/orchestrator/dag.ts
class TaskDAG {
  buildGraph(config: FullConfig): TaskGraph {
    const graph = new Graph();

    // 添加节点
    graph.addNode('init-workspace', { action: 'workspace-init' });
    graph.addNode('create-project-1', { action: 'project-create' });
    graph.addNode('create-project-2', { action: 'project-create' });
    graph.addNode('add-device', { action: 'device-add' });

    // 添加依赖边
    graph.addEdge('init-workspace', 'create-project-1');
    graph.addEdge('init-workspace', 'create-project-2');
    graph.addEdge('create-project-1', 'add-device');

    return graph;
  }

  async execute(graph: TaskGraph): Promise<void> {
    const levels = this.topologicalSort(graph);
    for (const level of levels) {
      // 同一层级的任务并行执行
      await Promise.all(level.map(task => this.executor.run(task)));
    }
  }
}
```

### Pattern 4: Template Engine with Variable Substitution (模板引擎与变量替换)

**What:** 使用模板系统支持配置复用和参数化

**When to use:** 需要支持配置模板，允许用户自定义和共享配置

**Trade-offs:**
- ✅ 配置复用，减少重复输入
- ✅ 支持团队标准化配置
- ✅ 易于版本控制和分享
- ❌ 模板语法学习成本
- ❌ 复杂模板难以调试

**Example:**
```typescript
// packages/core/src/template/engine.ts
class TemplateEngine {
  render(template: Template, variables: Variables): Config {
    // 使用 Handlebars 或简单的字符串替换
    const rendered = template.content.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => variables[key] || ''
    );
    return JSON.parse(rendered);
  }
}

// 模板示例
const template = {
  name: "ARM64 开发环境",
  content: `{
    "workspace": {
      "base": "{{baseVersion}}",
      "platform": "{{platform}}",
      "buildType": "{{buildType}}"
    },
    "projects": [
      {
        "name": "{{projectName}}",
        "type": "{{projectType}}"
      }
    ]
  }`
};
```

### Pattern 5: Progress Reporting with Event Emitters (基于事件的进度报告)

**What:** 使用事件发射器实现解耦的进度报告机制

**When to use:** 需要在 CLI 和 Web UI 中展示实时进度

**Trade-offs:**
- ✅ 核心逻辑与 UI 解耦
- ✅ 支持多个监听器（CLI 进度条、Web WebSocket）
- ✅ 易于测试和扩展
- ❌ 异步事件处理增加复杂度

**Example:**
```typescript
// packages/core/src/reporter/progress.ts
class ProgressReporter extends EventEmitter {
  reportProgress(task: string, percent: number) {
    this.emit('progress', { task, percent });
  }

  reportError(task: string, error: Error) {
    this.emit('error', { task, error });
  }
}

// apps/cli/src/ui/progress-bar.ts
reporter.on('progress', ({ task, percent }) => {
  progressBar.update(percent, { task });
});

// apps/web/src/api/websocket.ts
reporter.on('progress', ({ task, percent }) => {
  ws.send(JSON.stringify({ type: 'progress', task, percent }));
});
```

## Data Flow

### Request Flow (CLI)

```
用户输入命令
    ↓
Commander 解析参数
    ↓
Inquirer 交互式提示（如需要）
    ↓
配置管理器验证配置
    ↓
任务编排器构建 DAG
    ↓
任务执行器并行执行
    ↓
进度报告器实时反馈
    ↓
返回执行结果
```

### Request Flow (Web UI)

```
用户填写表单
    ↓
前端验证
    ↓
POST /api/init
    ↓
后端 API 接收请求
    ↓
配置管理器验证配置
    ↓
任务编排器构建 DAG
    ↓
任务执行器并行执行
    ↓
WebSocket 推送进度
    ↓
返回执行结果
```

### State Management

```
配置状态存储
    ↓ (读取)
配置管理器 ←→ 模板引擎 → 渲染配置
    ↓
任务编排器 → 构建任务图
    ↓
任务执行器 → 执行任务
    ↓ (更新)
进度状态 → 事件发射 → UI 更新
```

### Key Data Flows

1. **配置导入导出流**: 用户导出配置 → JSON 文件 → 用户导入 → 验证 → 应用配置
2. **模板应用流**: 选择模板 → 填充变量 → 渲染配置 → 验证 → 执行初始化
3. **并行任务流**: 构建 DAG → 拓扑排序 → 分层并行执行 → 汇总结果

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 单用户本地使用 | 当前架构足够，Web UI 使用本地 HTTP 服务器 |
| 小团队共享模板 | 添加模板仓库功能，支持 Git 同步模板 |
| 企业级部署 | Web UI 部署为中心化服务，支持多用户、权限管理、审计日志 |

### Scaling Priorities

1. **First bottleneck:** rl 命令执行慢 → 优先使用直接配置文件操作，减少 rl 调用
2. **Second bottleneck:** 串行任务执行 → 实现 DAG 并行调度，独立任务同时执行

## Anti-Patterns

### Anti-Pattern 1: 在 UI 层实现业务逻辑

**What people do:** 在 CLI 命令或 Web API 路由中直接写配置生成、验证逻辑

**Why it's wrong:** 导致 CLI 和 Web 逻辑不一致，难以维护和测试

**Do this instead:** 所有业务逻辑放在 packages/core/，UI 层只负责参数收集和结果展示

### Anti-Pattern 2: 过度依赖 rl 命令

**What people do:** 所有操作都通过调用 rl 命令完成

**Why it's wrong:** rl 命令启动开销大，串行执行慢，无法并行优化

**Do this instead:** 简单配置操作直接读写配置文件，复杂操作或需要验证的操作才调用 rl

### Anti-Pattern 3: 全局状态管理

**What people do:** 使用全局变量存储配置和执行状态

**Why it's wrong:** 难以测试，并发执行时状态混乱，无法支持多任务

**Do this instead:** 使用依赖注入，每个任务有独立的上下文对象

### Anti-Pattern 4: 同步阻塞执行

**What people do:** 串行执行所有初始化步骤，等待每个步骤完成

**Why it's wrong:** 浪费时间，多个独立项目创建可以并行

**Do this instead:** 使用 DAG 识别独立任务，Promise.all 并行执行

### Anti-Pattern 5: 硬编码配置路径

**What people do:** 直接使用 `~/.realevo/config.json` 等硬编码路径

**Why it's wrong:** 不支持自定义路径，测试困难，无法支持多环境

**Do this instead:** 配置路径通过参数传入或环境变量配置，支持路径解析器

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| RealEvo-Stream rl 命令 | child_process.spawn | 需要处理 stdout/stderr，超时控制 |
| 文件系统 (.realevo, .rlproject) | fs.promises | 需要原子写入，避免并发冲突 |
| Git (模板仓库) | simple-git 或 child_process | 可选功能，用于模板同步 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Web UI ↔ Backend API | HTTP/REST + WebSocket | WebSocket 用于进度推送 |
| CLI ↔ Core | 直接函数调用 | 同进程，无需序列化 |
| Core ↔ Executor | 接口抽象 | 支持 mock 执行器用于测试 |
| Template Engine ↔ Config Manager | 数据传递 | 模板渲染后交给配置管理器验证 |

## Technology Recommendations

### Core Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Monorepo | pnpm workspaces | 快速、节省磁盘空间、严格依赖管理 |
| CLI Framework | Commander.js | 成熟、文档完善、社区标准 |
| CLI Prompts | Inquirer.js | 功能丰富、支持多种输入类型 |
| Web Framework | Vite + React/Vue | 快速开发、HMR、现代工具链 |
| Backend | Express/Fastify | Express 成熟稳定，Fastify 性能更好 |
| Template Engine | Handlebars 或 ES6 模板字符串 | Handlebars 功能丰富，ES6 模板字符串简单够用 |
| Validation | JSON Schema (Ajv) | 标准化、可复用、错误信息清晰 |
| Task Orchestration | 自实现 DAG | 需求简单，无需引入 Airflow 等重量级工具 |
| Progress UI (CLI) | cli-progress | 美观、支持多进度条 |
| Configuration Format | JSON | RealEvo-Stream 使用 JSON，保持一致 |

### Alternative Considerations

- **YAML vs JSON**: YAML 更易读，但 RealEvo-Stream 使用 JSON，保持一致性优先
- **Turborepo vs pnpm workspaces**: Turborepo 提供缓存和并行构建，但项目规模小，pnpm 足够
- **Yeoman vs 自实现**: Yeoman 功能完整但较重，自实现更灵活轻量

## Sources

### Architecture Patterns
- [Let's Build Vite](https://blog.devesh.tech/post/lets-build-vite) - CLI 工具架构参考
- [Monorepo Architecture: The Ultimate Guide for 2025](https://feature-sliced.design/blog/frontend-monorepo-explained) - Monorepo 共享包架构
- [Building a Task Orchestrator with Python and Graph Algorithms](https://medium.com/hurb-engineering/building-a-task-orchestrator-with-python-and-graph-algorithms-a-fun-and-practical-guide-c1cd4c9f3d40) - DAG 任务编排模式

### Technology Stack
- [Express vs Koa vs Fastify](https://generalistprogrammer.com/comparisons/koa-vs-fastify) - Web 框架对比
- [Building Interactive CLIs with Node.js and Inquirer](https://www.grizzlypeaksoftware.com/library/building-interactive-clis-with-nodejs-and-inquirer-zda12oy1) - CLI 交互模式
- [JSON, YAML, TOML, or XML? The Best Choice for 2025](https://leapcell.io/blog/json-yaml-toml-xml-best-choice-2025) - 配置格式选择

### Resilience Patterns
- [Error Handling Patterns for Resilient Applications](https://nexisltd.com/blog/error-handling-resilient-applications) - 错误处理和重试模式
- [Background tasks with progress updates: UI patterns that work](https://appmaster.io/blog/background-tasks-progress-ui) - 进度报告模式

### Extensibility
- [Building Extensible Software Systems](https://techbuzzonline.com/building-extensible-software-systems-guide/) - 插件架构和扩展性模式
- [How to Build Plugin Systems in Python](https://oneuptime.com/blog/post/2026-01-30-python-plugin-systems/view) - 插件系统设计

---
*Architecture research for: SylixOS 开发环境快速部署工具*
*Researched: 2026-03-14*
