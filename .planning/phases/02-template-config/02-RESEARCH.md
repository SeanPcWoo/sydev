# Phase 2: 模板与配置系统 - Research

**Researched:** 2026-03-15
**Domain:** 模板存储/管理、配置导入导出、单命令初始化编排
**Confidence:** HIGH

## Summary

Phase 2 在 Phase 1 已建立的 CLI 核心（zod schema、ConfigManager、RlWrapper、ProgressReporter）之上构建模板管理和配置系统。核心工作分为三个领域：(1) 模板 CRUD（保存、列表、应用、删除），(2) 配置导入导出（JSON 文件），(3) 单命令初始化编排（`sydev init --config`）。

技术上没有新的外部依赖需要引入。所有需要的基础设施（zod 验证、commander 命令注册、inquirer 交互、ora/chalk 进度反馈）在 Phase 1 已经就位。主要工作是在 `@sydev/core` 中新增 `TemplateManager` 类处理模板存储逻辑，新增 `InitOrchestrator` 类编排全流程初始化，然后在 CLI 层添加 `template` 子命令和 `init --config` 命令。

**Primary recommendation:** 在 core 包中实现纯逻辑的 TemplateManager 和 InitOrchestrator，CLI 层只做命令注册和用户交互，保持 Phase 1 建立的分层架构。

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- 使用单文件索引 + 独立模板文件的方式组织
- 模板存储在项目根目录的 `./templates/` 目录
- `templates/index.json` 存储元数据列表（id, name, description, type, createdAt, updatedAt）
- `templates/{id}.json` 存储各个模板的完整内容
- 模板 ID 基于名称的 slug 生成
- 支持四种模板类型：workspace、project、device、full
- 全流程模板使用完整配置结构（直接嵌入所有配置，不使用引用）
- 使用 `sydev init --config config.json` 命令从配置文件初始化
- 严格顺序执行：workspace 初始化 -> 所有 project 创建 -> 所有 device 配置
- 失败处理策略：任何步骤失败即停止，保留已创建的资源，显示错误和已完成的步骤
- 进度反馈使用 Phase 1 已建立的 EventEmitter 架构
- 应用模板时检测到现有配置时提示用户选择：覆盖、合并、取消
- 合并策略：模板值优先
- 支持部分应用：对于 full 模板，用户可以选择只应用 workspace、或只应用某些 project/device
- 应用前进行配置验证（使用 Phase 1 的 zod schema）

### Claude's Discretion
- 模板 ID 冲突时的具体处理方式（重命名或拒绝）
- 模板列表的排序和过滤逻辑
- 配置文件的 schema 版本化策略
- 错误消息的具体措辞

### Deferred Ideas (OUT OF SCOPE)
无

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLI-TEMPLATE-01 | 用户可以保存当前配置为模板（环境模板、项目模板、设备模板、全流程模板） | TemplateManager.save() + 四种模板类型 schema + slug ID 生成 |
| CLI-TEMPLATE-02 | 用户可以列出所有已保存的配置模板 | TemplateManager.list() 读取 index.json + 按类型过滤 + 表格输出 |
| CLI-TEMPLATE-03 | 用户可以从已保存的模板快速初始化环境 | TemplateManager.load() + InitOrchestrator 编排 + 冲突处理交互 |
| CLI-TEMPLATE-04 | 用户可以删除不需要的配置模板 | TemplateManager.delete() 删除模板文件 + 更新 index.json |
| CLI-CONFIG-01 | 用户可以将配置导出为 JSON 文件 | ConfigManager.exportToJson() 已存在，扩展支持完整配置结构导出 |
| CLI-CONFIG-02 | 用户可以从 JSON 配置文件导入配置 | ConfigManager.importFromJson() 已存在，扩展支持 fullConfigSchema 验证 |
| CLI-CONFIG-03 | 用户可以通过单条命令从配置文件完成全流程初始化 | InitOrchestrator 顺序编排 + ProgressReporter 进度反馈 + fail-fast 策略 |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.24.0 | 模板和配置 schema 验证 | Phase 1 已使用，类型安全验证 |
| commander | ^12.1.0 | CLI 命令注册 | Phase 1 已使用 |
| inquirer | ^11.1.0 | 交互式提示（冲突处理、部分应用选择） | Phase 1 已使用 |
| chalk | ^5.3.0 | 终端输出着色 | Phase 1 已使用 |
| ora | ^8.0.1 | 进度 spinner | Phase 1 已使用 |

### Supporting
无需新增依赖。Node.js 内置的 `fs`、`path`、`crypto` 模块足以处理文件操作和 slug 生成。

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 手写 slug 生成 | slugify 库 | 模板名称简单（英文+数字+连字符），手写 `name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')` 足够 |
| 手写表格输出 | cli-table3 | 模板列表字段少（4-5列），用 chalk + 手动对齐或简单格式化即可 |

## Architecture Patterns

### Recommended Project Structure
```
packages/core/src/
├── template-manager.ts      # 模板 CRUD 逻辑（纯文件操作，无 CLI 依赖）
├── template-manager.test.ts # 模板管理器测试
├── init-orchestrator.ts     # 全流程初始化编排（顺序执行 workspace->projects->devices）
├── init-orchestrator.test.ts
├── schemas/
│   ├── template-schema.ts   # 模板元数据 + 四种模板内容 schema
│   └── full-config-schema.ts # 完整配置文件 schema（用于 init --config）
│   └── index.ts             # 更新导出
├── index.ts                 # 更新导出

apps/cli/src/
├── commands/
│   ├── template.ts          # template save/list/apply/delete 子命令
│   └── init.ts              # init --config 命令
├── index.ts                 # 注册新命令

./templates/                 # 模板存储目录（用户项目根目录）
├── index.json               # 模板元数据索引
└── {id}.json                # 各模板内容文件
```

### Pattern 1: TemplateManager（纯逻辑层）
**What:** 封装模板文件的 CRUD 操作，不依赖 CLI 交互
**When to use:** 所有模板操作的核心逻辑

```typescript
// packages/core/src/template-manager.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export type TemplateType = 'workspace' | 'project' | 'device' | 'full';

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateIndex {
  templates: TemplateMeta[];
}

export class TemplateManager {
  private templatesDir: string;
  private indexPath: string;

  constructor(baseDir: string) {
    this.templatesDir = join(baseDir, 'templates');
    this.indexPath = join(this.templatesDir, 'index.json');
  }

  // 确保 templates 目录和 index.json 存在
  private ensureDir(): void { ... }

  // 从名称生成 slug ID
  static slugify(name: string): string { ... }

  // 保存模板
  save(name: string, description: string, type: TemplateType, content: unknown): TemplateMeta { ... }

  // 列出所有模板（可按 type 过滤）
  list(type?: TemplateType): TemplateMeta[] { ... }

  // 加载模板内容
  load(id: string): { meta: TemplateMeta; content: unknown } { ... }

  // 删除模板
  delete(id: string): void { ... }

  // 检查 ID 是否已存在
  exists(id: string): boolean { ... }
}
```

### Pattern 2: InitOrchestrator（编排层）
**What:** 顺序执行 workspace -> projects -> devices 的全流程初始化
**When to use:** `sydev init --config` 和模板应用时

```typescript
// packages/core/src/init-orchestrator.ts
import { RlWrapper } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';

export interface FullConfig {
  workspace: WorkspaceConfig;
  projects?: ProjectConfig[];
  devices?: DeviceConfig[];
}

export interface InitResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
}

export class InitOrchestrator {
  constructor(
    private rlWrapper: RlWrapper,
    private progressReporter: ProgressReporter
  ) {}

  async execute(config: FullConfig): Promise<InitResult> {
    const completedSteps: string[] = [];

    // Step 1: workspace
    const wsResult = await this.rlWrapper.initWorkspace(config.workspace);
    if (!wsResult.success) {
      return { success: false, completedSteps, failedStep: 'workspace', error: wsResult.error };
    }
    completedSteps.push('workspace');

    // Step 2: projects (顺序执行)
    for (const project of config.projects ?? []) {
      const pResult = await this.rlWrapper.createProject({ ...project, cwd: config.workspace.cwd });
      if (!pResult.success) {
        return { success: false, completedSteps, failedStep: `project:${project.name}`, error: pResult.error };
      }
      completedSteps.push(`project:${project.name}`);
    }

    // Step 3: devices (顺序执行)
    for (const device of config.devices ?? []) {
      const dResult = await this.rlWrapper.addDevice({ ...device, cwd: config.workspace.cwd });
      if (!dResult.success) {
        return { success: false, completedSteps, failedStep: `device:${device.name}`, error: dResult.error };
      }
      completedSteps.push(`device:${device.name}`);
    }

    return { success: true, completedSteps };
  }
}
```

### Pattern 3: CLI 命令注册（与 Phase 1 一致）
**What:** 使用 commander 子命令 + 动态 import 的模式
**When to use:** 注册 template 和 init 命令

```typescript
// apps/cli/src/commands/template.ts
import { Command } from 'commander';

export const templateCommand = new Command('template')
  .description('管理配置模板');

templateCommand
  .command('save')
  .description('保存当前配置为模板')
  .action(async () => { ... });

templateCommand
  .command('list')
  .option('-t, --type <type>', '按类型过滤 (workspace|project|device|full)')
  .description('列出所有已保存的模板')
  .action(async (options) => { ... });

templateCommand
  .command('apply <id>')
  .description('从模板初始化环境')
  .action(async (id) => { ... });

templateCommand
  .command('delete <id>')
  .description('删除模板')
  .action(async (id) => { ... });
```

### Pattern 4: 模板 Schema 定义
**What:** 用 zod 定义模板元数据和四种模板内容的 schema
**When to use:** 验证模板保存和加载

```typescript
// packages/core/src/schemas/template-schema.ts
import { z } from 'zod';
import { workspaceSchema } from './workspace-schema.js';
import { projectSchema } from './project-schema.js';
import { deviceSchema } from './device-schema.js';

export const templateTypeSchema = z.enum(['workspace', 'project', 'device', 'full']);

export const templateMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: templateTypeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// 完整配置 schema（用于 full 模板和 init --config）
export const fullConfigSchema = z.object({
  workspace: workspaceSchema,
  projects: z.array(projectSchema).optional(),
  devices: z.array(deviceSchema).optional(),
});

// 各类型模板内容 schema
export const templateContentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('workspace'), data: workspaceSchema }),
  z.object({ type: z.literal('project'), data: projectSchema }),
  z.object({ type: z.literal('device'), data: deviceSchema }),
  z.object({ type: z.literal('full'), data: fullConfigSchema }),
]);
```

### Anti-Patterns to Avoid
- **在 core 包中引入 CLI 依赖（inquirer/chalk）：** core 层应该是纯逻辑，CLI 交互（冲突提示、部分应用选择）在 apps/cli 层处理
- **模板文件中存储绝对路径：** workspace 的 cwd 和 basePath 是环境特定的，保存模板时应保留原始值，应用时让用户确认或覆盖
- **index.json 和模板文件不一致：** 删除模板时必须同时删除 index.json 条目和 {id}.json 文件，使用事务性操作（先删文件，再更新索引）

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON 文件读写 | 自定义序列化 | Node.js fs + JSON.stringify/parse | 标准且可靠 |
| Schema 验证 | 手写验证逻辑 | zod schema（已有） | Phase 1 已建立模式，类型安全 |
| 命令行参数解析 | 手写 argv 解析 | commander（已有） | Phase 1 已建立模式 |
| 进度反馈 | 自定义进度系统 | ProgressReporter + ora（已有） | Phase 1 已建立模式 |

## Common Pitfalls

### Pitfall 1: 模板 ID 冲突
**What goes wrong:** 用户保存同名模板时覆盖已有模板
**Why it happens:** slug 生成是确定性的，相同名称产生相同 ID
**How to avoid:** 保存前检查 exists()，冲突时提示用户选择：覆盖现有模板、使用新名称、取消操作
**Recommendation (Claude's Discretion):** 提示用户选择，不自动重命名（避免产生 my-template-2 这种混乱命名）

### Pitfall 2: 模板中的环境特定路径
**What goes wrong:** 模板保存了 `/home/user-a/workspace` 这样的绝对路径，在另一台机器上应用时路径无效
**Why it happens:** workspace 的 cwd 和 basePath 通常是绝对路径
**How to avoid:** 应用模板时，workspace 的 cwd 默认使用当前目录（process.cwd()），basePath 使用相对路径。保存时保留原始值，应用时提示用户确认路径
**Warning signs:** 模板中出现 `/home/` 或 `/Users/` 开头的路径

### Pitfall 3: index.json 与模板文件不同步
**What goes wrong:** 删除模板文件但 index.json 仍有条目，或反之
**Why it happens:** 操作中途失败（磁盘满、权限问题）
**How to avoid:** 操作顺序：删除时先删文件再更新索引；保存时先写文件再更新索引。load() 时检查文件是否存在，不存在则自动清理索引中的孤立条目
**Warning signs:** list 显示的模板 apply 时报文件不存在

### Pitfall 4: init --config 部分失败后的状态
**What goes wrong:** workspace 创建成功但第 2 个 project 失败，用户不知道哪些已完成
**Why it happens:** 顺序执行中间步骤失败
**How to avoid:** InitOrchestrator 返回 completedSteps 列表，CLI 层在错误信息中清晰显示已完成和失败的步骤。用户修复问题后可以手动跳过已完成的步骤（或重新运行，利用幂等性）
**Warning signs:** 错误信息只说"失败"但不说明进度

### Pitfall 5: ConfigManager.merge 的浅合并问题
**What goes wrong:** 合并 full 模板时，嵌套的 projects 数组被整体替换而非合并
**Why it happens:** 现有 ConfigManager.merge 使用 Object.assign（浅合并）
**How to avoid:** 模板合并场景中，对顶层字段使用模板值优先策略，对数组字段（projects、devices）使用追加或替换策略，不依赖通用 merge

## Code Examples

### 模板索引文件结构 (templates/index.json)
```json
{
  "templates": [
    {
      "id": "arm64-dev-env",
      "name": "ARM64 开发环境",
      "description": "ARM64 平台标准开发环境配置",
      "type": "full",
      "createdAt": "2026-03-15T10:00:00.000Z",
      "updatedAt": "2026-03-15T10:00:00.000Z"
    }
  ]
}
```

### 模板内容文件结构 (templates/arm64-dev-env.json)
```json
{
  "type": "full",
  "data": {
    "workspace": {
      "cwd": "/home/dev/workspace",
      "basePath": ".realevo/base",
      "platform": "ARM64_GENERIC",
      "version": "default",
      "createbase": true,
      "build": false,
      "debugLevel": "release",
      "os": "sylixos"
    },
    "projects": [
      {
        "name": "my-app",
        "template": "app",
        "makeTool": "make"
      }
    ],
    "devices": [
      {
        "name": "dev-board",
        "ip": "192.168.1.100",
        "platform": "ARM64_GENERIC",
        "ssh": 22,
        "telnet": 23,
        "ftp": 21,
        "gdb": 1234,
        "username": "root"
      }
    ]
  }
}
```

### Slug 生成逻辑
```typescript
static slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')  // 保留中文字符
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

### 模板列表排序和过滤（Claude's Discretion）
```typescript
list(type?: TemplateType): TemplateMeta[] {
  const index = this.readIndex();
  let templates = index.templates;
  if (type) {
    templates = templates.filter(t => t.type === type);
  }
  // 按更新时间降序排列（最近更新的在前）
  return templates.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
```

### Schema 版本化策略（Claude's Discretion）
```typescript
// 在模板文件和配置文件中添加 schemaVersion 字段
// 当前版本为 1，未来 schema 变更时递增
// 加载时检查版本，不兼容时给出迁移提示
export const fullConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  workspace: workspaceSchema,
  projects: z.array(projectSchema).optional(),
  devices: z.array(deviceSchema).optional(),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 全局配置目录 (~/.config/) | 项目本地 ./templates/ | Phase 2 设计决策 | 模板随项目版本控制，团队可共享 |
| UUID 作为模板 ID | slug 作为模板 ID | Phase 2 设计决策 | 用户可读、可记忆、可手动引用 |

## Open Questions

1. **中文模板名称的 slug 处理**
   - What we know: slug 生成需要处理中文字符
   - What's unclear: 是保留中文字符（如 "arm64-开发环境"）还是转为拼音
   - Recommendation: 保留中文字符在 slug 中，因为文件系统支持 UTF-8，且用户是中文用户。如果名称纯中文，slug 就是中文（如 "标准开发环境"）

2. **template save 时如何获取"当前配置"**
   - What we know: workspace 配置在 .realevo 目录中，device 配置在 .sydev/devices.json 中
   - What's unclear: 是否需要从这些文件中读取，还是让用户通过向导重新输入
   - Recommendation: 提供两种方式——(1) 从当前 workspace 读取已有配置保存为模板，(2) 通过向导交互式创建模板。优先实现方式 2（向导创建），因为读取现有配置需要解析 .realevo 目录结构，复杂度较高

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | 无独立配置文件，使用 package.json scripts |
| Quick run command | `pnpm test -- --run` |
| Full suite command | `pnpm test -- --run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-TEMPLATE-01 | 保存模板（四种类型） | unit | `pnpm --filter @sydev/core test -- --run src/template-manager.test.ts` | Wave 0 |
| CLI-TEMPLATE-02 | 列出模板（过滤、排序） | unit | `pnpm --filter @sydev/core test -- --run src/template-manager.test.ts` | Wave 0 |
| CLI-TEMPLATE-03 | 从模板初始化 | unit | `pnpm --filter @sydev/core test -- --run src/init-orchestrator.test.ts` | Wave 0 |
| CLI-TEMPLATE-04 | 删除模板 | unit | `pnpm --filter @sydev/core test -- --run src/template-manager.test.ts` | Wave 0 |
| CLI-CONFIG-01 | 导出配置为 JSON | unit | `pnpm --filter @sydev/core test -- --run src/config-manager.test.ts` | 已有，需扩展 |
| CLI-CONFIG-02 | 从 JSON 导入配置 | unit | `pnpm --filter @sydev/core test -- --run src/config-manager.test.ts` | 已有，需扩展 |
| CLI-CONFIG-03 | 单命令全流程初始化 | unit | `pnpm --filter @sydev/core test -- --run src/init-orchestrator.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @sydev/core test -- --run`
- **Per wave merge:** `pnpm test -- --run`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `packages/core/src/template-manager.test.ts` -- covers CLI-TEMPLATE-01, 02, 04
- [ ] `packages/core/src/init-orchestrator.test.ts` -- covers CLI-TEMPLATE-03, CLI-CONFIG-03
- [ ] `packages/core/src/schemas/template-schema.ts` -- schema definitions needed before tests
- [ ] `packages/core/src/schemas/full-config-schema.ts` -- full config schema for init --config

## Sources

### Primary (HIGH confidence)
- 项目源码直接阅读：packages/core/src/*.ts, apps/cli/src/**/*.ts
- Phase 1 已建立的模式：ConfigManager, RlWrapper, ProgressReporter, zod schemas
- CONTEXT.md 用户决策：模板存储结构、类型设计、初始化流程

### Secondary (MEDIUM confidence)
- Node.js fs 模块 API（稳定 API，无需额外验证）
- zod discriminatedUnion 用法（zod 文档标准用法）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 无新依赖，全部复用 Phase 1
- Architecture: HIGH - 模式清晰，与 Phase 1 一致的分层架构
- Pitfalls: HIGH - 基于代码审查和模板系统常见问题

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (稳定领域，30 天有效)
