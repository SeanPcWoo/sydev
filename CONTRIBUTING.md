# 贡献指南 — sydev 项目

欢迎为 sydev 项目做贡献！本指南将帮助你快速上手。

## 🚀 快速开始

### 1. 环境设置

```bash
# 克隆仓库
git clone https://github.com/haawpc/sydev.git
cd sydev

# 安装依赖
pnpm install

# 启动开发模式
npm run dev:cli -- --help
```

### 2. 构建和测试

```bash
# 编译
npm run build

# 构建包
npm run build:pkg

# 类型检查
npm run type-check
```

## 📚 理解项目

### 第一步：快速了解架构

1. 阅读 [`docs/INDEX.md`](docs/INDEX.md) — 文档导航
2. 浏览 [`docs/MEMORY.md`](docs/MEMORY.md) — 项目概览
3. 查看 [`docs/quick-index.md`](docs/quick-index.md) — 代码位置

### 第二步：深入学习

根据你的兴趣选择：

- **想开发 SKILL？** → 阅读 [`docs/commands-reference.md`](docs/commands-reference.md)
- **想添加新命令？** → 查看 `apps/cli/src/commands/` 中的现有实现
- **想改进核心库？** → 查看 `packages/core/src/` 的源码
- **想改进参数解析？** → 查看 `apps/cli/src/options/` 的参数解析器

### 第三步：了解工作流

sydev 的基本工作流：

```
用户输入 → 命令处理 → 参数解析 → Wizard/非交互模式 → 核心库处理 → 输出结果
```

具体：
```
CLI Command (commands/*.ts)
    ↓
OptionParser (options/*.ts) 或 Wizard (wizards/*.ts)
    ↓
Core Classes (packages/core/src/)
    ├── BuildRunner
    ├── TemplateManager
    ├── InitOrchestrator
    └── RlWrapper
    ↓
输出结果或异常
```

## 🛠️ 常见开发任务

### 添加新的非交互参数

1. **确定参数列表** — 参考 `README.md` 中的参数表
2. **创建 Parser 类** — 继承 `BaseOptionParser`
   ```typescript
   // apps/cli/src/options/my-parser.ts
   export class MyOptionParser extends BaseOptionParser<MyOptions> {
     protected defaults = { ... }
     protected requiredFields = [ ... ]
     protected validate(config) { ... }
   }
   ```
3. **更新命令** — 在 `apps/cli/src/commands/` 中集成
4. **测试** — 运行 `npm run dev:cli -- my-command --help`

### 修改或增强命令功能

1. **找到命令文件** — `apps/cli/src/commands/command-name.ts`
2. **查看核心类实现** — `packages/core/src/` 中的对应类
3. **修改并测试**
   ```bash
   npm run build
   npm run dev:cli -- command-name
   ```

### 优化参数验证

1. **定位参数解析器** — `apps/cli/src/options/`
2. **增强 validate 方法**
3. **更新测试** — 如果有的话

### 修复 bug

1. **定位问题** — 使用 `quick-index.md` 找到相关代码
2. **添加 TypeScript 类型检查** — `npm run type-check`
3. **编译测试** — `npm run build`
4. **验证修复** — 手动测试相关命令

## 📋 命令参考速查

| 任务 | 命令 |
|------|------|
| 开发模式运行 | `npm run dev:cli -- [args]` |
| 编译 | `npm run build` |
| 类型检查 | `npm run type-check` |
| 构建包 | `npm run build:pkg` |

## 🔍 代码规范

- **文件命名**: kebab-case (例如 `my-command.ts`)
- **类命名**: PascalCase (例如 `MyCommand`)
- **变量命名**: camelCase (例如 `myVariable`)
- **导出**: 使用 TypeScript 的 `export` 关键字

## 📁 项目结构速查

```
📍 命令逻辑             → apps/cli/src/commands/
📍 参数解析             → apps/cli/src/options/ (v0.4.0 新增)
📍 交互式向导           → apps/cli/src/wizards/
📍 核心业务逻辑         → packages/core/src/
📍 编译系统             → packages/core/src/build-runner.ts
📍 配置管理             → packages/core/src/template-manager.ts
📍 一键初始化           → packages/core/src/init-orchestrator.ts
📍 用户文档             → README.md
📍 开发文档             → docs/
📍 示例配置             → examples/
```

## 🧪 测试建议

### 测试非交互模式

```bash
# 测试命令行参数
npm run dev:cli -- workspace init \
  --cwd /tmp/test-ws \
  --base-path /tmp/test-ws/.realevo/base \
  --version default \
  --platforms ARM64_GENERIC \
  --os sylixos \
  --debug-level release

# 测试 JSON 配置
npm run dev:cli -- workspace init --config examples/workspace-config.json
```

### 测试交互模式

```bash
npm run dev:cli -- workspace init
# 按提示交互输入
```

### 测试帮助文本

```bash
npm run dev:cli -- command-name --help
```

## 📝 提交指南

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能
- `test`: 测试

**Scope**: 影响的模块 (e.g., `options`, `commands`, `core`)

**Subject**: 简洁的描述（动词开头，现在时）

**Example**:
```
feat(options): Add JSON config file support for workspace init

Add --config parameter to workspace init command to support
non-interactive mode with JSON configuration files.

Closes #123
```

## 🤝 PR 流程

1. **Fork and Branch** — 从 `main` 创建特性分支
2. **Commit** — 遵循提交指南
3. **Test** — 确保编译和类型检查通过
4. **PR** — 创建清晰的 PR 描述
5. **Review** — 等待代码审核
6. **Merge** — 合并到 main

## ❓ 常见问题

### Q: 我在哪里找到特定命令的实现？

A: 查看 [`docs/quick-index.md`](docs/quick-index.md) 中的"命令 → 实现文件映射"表。

### Q: 我如何添加新的命令行参数？

A:
1. 在 `apps/cli/src/options/` 创建参数解析器
2. 在 `apps/cli/src/commands/` 中使用它
3. 在 `README.md` 中文档化

### Q: 参数验证在哪里进行？

A: 在 `apps/cli/src/options/` 中对应的 Parser 类的 `validate()` 方法。

### Q: 如何测试非交互模式？

A: 使用命令行参数或 JSON 配置文件：
```bash
npm run dev:cli -- workspace init --cwd /path --platforms ARM64_GENERIC
npm run dev:cli -- workspace init --config examples/workspace-config.json
```

## 📚 更多资源

- [README.md](README.md) — 用户文档
- [docs/INDEX.md](docs/INDEX.md) — 文档导航
- [docs/MEMORY.md](docs/MEMORY.md) — 项目知识库
- [docs/commands-reference.md](docs/commands-reference.md) — API 参考
- [docs/quick-index.md](docs/quick-index.md) — 快速查询

## 💡 需要帮助？

- 查看已有 issue 和 PR
- 查阅文档中的相关部分
- 在 GitHub 上提出问题

---

感谢贡献！🙏

