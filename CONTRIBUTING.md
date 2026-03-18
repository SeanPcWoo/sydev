# 贡献指南 — sydev 项目

欢迎为 sydev 项目做贡献！本指南针对想要参与 sydev 本身开发的贡献者。

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

## 📋 常见开发任务

### 修复 bug

1. **定位问题** — 在相关命令文件或核心库中查找代码
   - 命令实现：`apps/cli/src/commands/`
   - 参数解析：`apps/cli/src/options/`
   - 交互向导：`apps/cli/src/wizards/`
   - 核心逻辑：`packages/core/src/`

2. **修改代码**
   ```bash
   npm run build
   npm run type-check
   ```

3. **测试修复**
   ```bash
   npm run dev:cli -- <command>
   ```

### 改进命令功能

1. **定位命令文件** — `apps/cli/src/commands/`
2. **查看对应的核心类** — `packages/core/src/`
3. **修改并测试**
   ```bash
   npm run build
   npm run dev:cli -- <command>
   ```

### 添加新的命令行参数

1. **在 `apps/cli/src/options/` 创建参数解析器**
   ```typescript
   // 继承 BaseOptionParser
   export class MyOptionParser extends BaseOptionParser<MyOptions> {
     // 实现
   }
   ```

2. **在 `apps/cli/src/commands/` 中使用**
3. **更新 README.md 中的参数文档**

## 📁 项目结构

```
📍 命令逻辑             → apps/cli/src/commands/
📍 参数解析             → apps/cli/src/options/
📍 交互式向导           → apps/cli/src/wizards/
📍 核心业务逻辑         → packages/core/src/
📍 用户文档             → README.md
📍 示例配置             → examples/
```

## 🔍 代码规范

- **文件命名**: kebab-case (例如 `my-command.ts`)
- **类命名**: PascalCase (例如 `MyCommand`)
- **变量命名**: camelCase (例如 `myVariable`)
- **导出**: 使用 TypeScript 的 `export` 关键字

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

**Scope**: 影响的模块 (例如 `command`, `core`, `options`)

**Subject**: 简洁的描述（动词开头，现在时）

**Example**:
```
fix(build): Fix parallel compilation parameter passing

Ensure make parameters are properly passed when using -- syntax.

Closes #123
```

## 🤝 PR 流程

1. **Fork and Branch** — 从 `main` 创建特性分支
2. **Commit** — 遵循提交指南
3. **Test** — 确保编译和类型检查通过
   ```bash
   npm run build
   npm run type-check
   ```
4. **PR** — 创建清晰的 PR 描述
5. **Review** — 等待代码审核
6. **Merge** — 合并到 main

## 📚 了解项目

阅读 [README.md](README.md) 了解所有 sydev 命令的用法和说明，这样可以更好地理解项目的功能和设计。

## ❓ 需要帮助？

- 查看 [README.md](README.md) 了解命令用法
- 查看已有 issue 和 PR
- 在 GitHub 上提出问题

---

感谢贡献！🙏
