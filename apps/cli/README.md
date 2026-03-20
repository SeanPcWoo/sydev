# @sydev/cli

`@sydev/cli` 是 sydev 的命令行前端，负责：

- 命令注册
- 交互式向导
- 非交互参数解析
- 终端输出和帮助文本

核心业务逻辑位于 `packages/core/`。

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 直接运行源码

```bash
pnpm --filter @sydev/cli exec tsx src/index.ts --help
pnpm --filter @sydev/cli exec tsx src/index.ts workspace init --help
```

### 类型检查

```bash
pnpm --filter @sydev/cli type-check
```

### 构建

```bash
pnpm build
pnpm build:pkg
```

## 当前命令面

| 命令 | 说明 |
| --- | --- |
| `workspace` | `init`, `status` |
| `project` | `create`, `list` |
| `device` | `add`, `list` |
| `build` | `[project]`, `init` |
| `clean` | `[project]` |
| `rebuild` | `[project]` |
| `upload` | `[projects]` |
| `template` | `create`, `list`, `show`, `apply`, `delete`, `export`, `import` |
| `init` | `--config <file>` |

## 目录结构

```text
apps/cli/
├── src/
│   ├── index.ts
│   ├── commands/
│   ├── options/
│   ├── wizards/
│   ├── helpers/
│   └── utils/
└── README.md
```

### 目录职责

| 目录 | 说明 |
| --- | --- |
| `src/index.ts` | CLI 入口，注册命令和全局 help |
| `src/commands/` | 命令定义 |
| `src/options/` | 非交互模式参数解析器 |
| `src/wizards/` | 交互式初始化逻辑 |
| `src/helpers/` | 辅助函数，例如设备读取 |
| `src/utils/` | help formatter、progress 等工具 |

## 命令开发约定

- 新增命令时，优先放在 `src/commands/`
- 若命令需要非交互模式，补对应 `src/options/*-parser.ts`
- 若命令需要交互式流程，补对应 `src/wizards/`
- 修改 CLI 接口后，同时更新：
  - 根目录 `README.md`
  - `docs/COMMANDS.md`
  - `docs/CONFIG_FILES.md`
  - 受影响的专题文档

## 相关文档

- [根 README](../../README.md)
- [完整命令参考](../../docs/COMMANDS.md)
- [配置文件参考](../../docs/CONFIG_FILES.md)
