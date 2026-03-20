# 贡献指南

本文档面向参与 sydev 仓库开发的贡献者。

## 快速开始

```bash
git clone https://github.com/haawpc/sydev.git
cd sydev
pnpm install
pnpm dev:cli -- --help
```

## 常用命令

```bash
pnpm build
pnpm build:pkg
pnpm test
pnpm type-check
pnpm --filter @sydev/cli exec tsx src/index.ts --help
```

## 代码位置

| 路径 | 说明 |
| --- | --- |
| `apps/cli/src/commands/` | CLI 命令定义 |
| `apps/cli/src/options/` | 非交互参数解析 |
| `apps/cli/src/wizards/` | 交互式向导 |
| `apps/cli/src/helpers/` | CLI 辅助逻辑 |
| `apps/cli/src/utils/` | help formatter、进度输出等 |
| `packages/core/src/` | 核心业务逻辑 |
| `docs/` | 用户文档 |

## 修改 CLI 时必须同步检查

如果你修改了命令名、参数、默认值、行为、示例或配置文件结构，请同时更新：

- `README.md`
- `docs/COMMANDS.md`
- `docs/CONFIG_FILES.md`
- 相关专题文档，如 `docs/UPLOAD_GUIDE.md`
- `apps/cli/README.md`

如果你需要验证打包后的全局命令行为，还要重建打包产物：

```bash
pnpm build:pkg
```

## 建议的提交流程

1. 修改代码
2. 运行 `pnpm type-check`
3. 运行必要的构建或测试
4. 更新文档
5. 自查 `git diff`

## 提交消息建议

推荐格式：

```text
<type>(<scope>): <subject>
```

示例：

```text
fix(template): support applying templates from json files
docs(cli): refresh command reference and config examples
```

常见 `type`：

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`

## 文档是接口的一部分

sydev 的大量能力依赖命令行参数和 JSON 配置文件，因此文档不是附属品，而是用户接口的一部分。任何接口变化都应视为“代码 + 文档”一起交付。
