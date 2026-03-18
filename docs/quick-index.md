# sydev 命令快速查询索引

## 📍 命令 → 实现文件映射

| 命令族 | 主命令 | 子命令 | 实现文件 | 核心类 |
|------|--------|--------|---------|--------|
| workspace | `sydev workspace` | `init` | `apps/cli/src/commands/workspace.ts` | `WorkspaceWizard` |
| workspace | `sydev workspace` | `status` | `apps/cli/src/commands/workspace.ts` | - |
| project | `sydev project` | `create` | `apps/cli/src/commands/project.ts` | `ProjectWizard` |
| project | `sydev project` | `list` | `apps/cli/src/commands/project.ts` | `WorkspaceScanner` |
| build | `sydev build` | `build` | `apps/cli/src/commands/build.ts` | `BuildRunner` |
| build | `sydev build` | `init` | `apps/cli/src/commands/build.ts` | `BuildRunner` |
| clean | `sydev clean` | `clean` | `apps/cli/src/commands/clean.ts` | `BuildRunner` |
| rebuild | `sydev rebuild` | `rebuild` | `apps/cli/src/commands/rebuild.ts` | `BuildRunner` |
| device | `sydev device` | `add` | `apps/cli/src/commands/device.ts` | `DeviceWizard` |
| device | `sydev device` | `list` | `apps/cli/src/commands/device.ts` | - |
| template | `sydev template` | `save` | `apps/cli/src/commands/template.ts` | `TemplateManager` |
| template | `sydev template` | `list` | `apps/cli/src/commands/template.ts` | `TemplateManager` |
| template | `sydev template` | `apply` | `apps/cli/src/commands/template.ts` | `InitOrchestrator` |
| template | `sydev template` | `delete` | `apps/cli/src/commands/template.ts` | `TemplateManager` |
| template | `sydev template` | `export` | `apps/cli/src/commands/template.ts` | `ConfigManager` |
| template | `sydev template` | `import` | `apps/cli/src/commands/template.ts` | `TemplateManager` |
| init | `sydev init` | `--config` | `apps/cli/src/commands/init.ts` | `InitOrchestrator` |

## 🔑 核心类位置

| 核心类 | 文件位置 | 主要方法 |
|--------|---------|---------|
| `BuildRunner` | `packages/core/src/build-runner.ts` | `buildOne()`, `cleanOne()`, `rebuildOne()`, `ensureMakefile()` |
| `WorkspaceScanner` | `packages/core/src/workspace-scanner.ts` | `scan()` |
| `TemplateManager` | `packages/core/src/template-manager.ts` | `save()`, `list()`, `load()`, `delete()` |
| `InitOrchestrator` | `packages/core/src/init-orchestrator.ts` | `execute()` |
| `ConfigManager` | `packages/core/src/config-manager.ts` | `validate()`, `exportToJson()` |
| `RlWrapper` | `packages/core/src/rl-wrapper.ts` | 用于与 RealEvo-Stream 交互 |
| `WorkspaceWizard` | `apps/cli/src/wizards/workspace-wizard.ts` | `runWorkspaceWizard()` |
| `ProjectWizard` | `apps/cli/src/wizards/project-wizard.ts` | `runProjectWizard()` |
| `DeviceWizard` | `apps/cli/src/wizards/device-wizard.ts` | `runDeviceWizard()` |

## 🎯 常见 SKILL 开发场景

### 场景 1：快速编译单个项目
**相关命令**: `sydev build <project>`
**相关文件**: `apps/cli/src/commands/build.ts` (L42-66)
**核心 API**:
```typescript
const runner = new BuildRunner(projects, process.cwd());
const result = await runner.buildOne(project, { extraArgs });
```

### 场景 2：交互式多选编译
**相关命令**: `sydev build`
**相关文件**: `apps/cli/src/commands/build.ts` (L83-121)
**核心技巧**: 使用 `inquirer.prompt()` 的 checkbox 类型

### 场景 3：Makefile 生成
**相关命令**: `sydev build init`
**相关文件**: `apps/cli/src/commands/build.ts` (L124-138)
**核心 API**: `runner.ensureMakefile()`

### 场景 4：项目扫描
**相关命令**: `sydev project list`
**相关文件**: `packages/core/src/workspace-scanner.ts`
**核心逻辑**: 查找包含 `.project` 和 `Makefile` 的目录

### 场景 5：配置模板保存
**相关命令**: `sydev template save`
**相关文件**: `apps/cli/src/commands/template.ts` (L62-100)
**存储位置**: `~/.sydev/` (由 `TemplateManager` 管理)

### 场景 6：一键部署
**相关命令**: `sydev init --config`
**相关文件**: `apps/cli/src/commands/init.ts`
**核心类**: `InitOrchestrator`

## 📋 命令参数速查

### build/clean/rebuild 通用参数
```
[project]       # 可选：项目名称
--quiet         # 可选：静默模式
-- <args>       # 可选：透传给 make 的参数
```

### template 命令参数
```
template save                    # 无参数，交互式
template list [-t TYPE]          # -t 过滤类型
template apply <ID>              # ID 必需
template delete <ID>             # ID 必需
template export [-o FILE]        # -o 输出文件路径
template import <FILE>           # FILE 必需
```

### init 命令参数
```
init --config <FILE>             # --config 必需
```

## 🔍 错误处理模式

### build/clean/rebuild 失败处理
```typescript
// 失败时返回的信息
result.success: boolean
result.errorLines?: string[]  // 错误摘要
result.stdout?: string        // 完整输出（--quiet 模式）
result.stderr?: string
result.durationMs: number
```

### 配置验证
```typescript
const validation = ConfigManager.validate(schema, config);
if (!validation.valid) {
  validation.errors?.forEach(e => console.error(e));
}
```

## 📝 数据文件位置

| 数据类型 | 位置 | 说明 |
|---------|------|------|
| 模板 | `~/.sydev/` | TemplateManager 管理 |
| Workspace 配置 | `.realevo/config.json` | Workspace 目录 |
| 项目标记 | `<project>/.project` | 项目子目录 |
| 生成的 Makefile | `.sydev/Makefile` | Workspace 目录 |

## 🚀 快速开发 SKILL 流程

1. **确定功能**：选择要包装的命令（e.g., `sydev build`）
2. **查找实现**：找到对应的命令文件（e.g., `apps/cli/src/commands/build.ts`）
3. **理解数据流**：
   - 输入：命令参数、交互式选择
   - 处理：核心类的方法调用（e.g., `BuildRunner.buildOne()`)
   - 输出：结果对象、进度事件
4. **设计 SKILL**：
   - 自动化交互式选择（通过参数或配置）
   - 增强错误处理或输出格式
   - 组合多个命令的功能
5. **测试**：使用本 README 中的命令示例测试

## 📚 文档链接

- **完整 README**: `/home/sean/project/sydev/README.md`
- **命令参考**: `/home/sean/.claude/projects/-home-sean-project-sydev/memory/commands-reference.md`
- **内存简介**: `/home/sean/.claude/projects/-home-sean-project-sydev/memory/MEMORY.md`
