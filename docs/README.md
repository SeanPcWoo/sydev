# sydev 文档中心

本目录的文档以当前仓库中的 CLI 实现为准，目标是让使用者可以只看文档就上手命令、写脚本，或把命令交给其他人使用。

## 推荐阅读顺序

1. [快速参考卡片](./QUICK_REFERENCE.md)
2. [完整命令参考](./COMMANDS.md)
3. [配置文件参考](./CONFIG_FILES.md)
4. [Upload 使用指南](./UPLOAD_GUIDE.md)
5. [Skill / IDE 集成指南](./SKILL_INTEGRATION.md)

## 文档索引

| 文档 | 适用场景 |
| --- | --- |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 想快速查命令、参数和常见工作流 |
| [COMMANDS.md](./COMMANDS.md) | 想系统了解每个命令、子命令、选项和行为 |
| [CONFIG_FILES.md](./CONFIG_FILES.md) | 想写 `--config` JSON、模板文件或 `sydev init` 配置 |
| [UPLOAD_GUIDE.md](./UPLOAD_GUIDE.md) | 想配置 `.reproject`、理解上传规则和排错 |
| [SKILL_INTEGRATION.md](./SKILL_INTEGRATION.md) | 想在 IDE、脚本、Agent、CI 里调用 sydev |

## 你可以先看这些命令

```bash
sydev --help
sydev workspace init --help
sydev project create --help
sydev device add --help
sydev template apply --help
```

## 本次文档整理覆盖的范围

- 只保留当前代码中真实存在的命令和子命令
- 去掉旧版命令示例，如 `workspace add/remove`、`project remove`、`completion`
- 修正 `build --all`、`clean --all`、`rebuild --all` 等并不存在的参数说明
- 补全 `template apply` 的 JSON 文件、`--cwd`、`--base-path`、`-y` 文档
- 补全 `workspace/project/device` 的 `--config` 用法与 JSON 结构
- 明确 `build` 的“构建模板”和 `template` 的“配置模板”是两套不同概念
- 补充 `workspace` / `template` / `full` 配置中的 ARM64 页大小与 `baseComponents` 用法
- 补充 `.sydev/Makefile` 中 `base` target 使用 `make`、其它工程调用 `rl-build`，以及 `build` / `clean` / `rebuild` 执行前自动同步 `SYLIXOS_BASE_PATH`
- 同步 `template` 与 `workspace/device` 的平台列表来源，避免交互与非交互支持范围不一致
- 明确 `baseComponents` 中只有 `libsylixos` 为固定必选项，`libcextern` 为可选项

## 需要记住的几个事实

- `workspace`、`project create`、`device add` 都支持“交互模式”和“非交互模式”
- 只传 `--config` 也会进入非交互模式
- `upload` 上传多个项目或 `--all` 时必须显式传 `--device`
- `template apply` 的 `<source>` 可以是模板 ID，也可以是 JSON 文件路径
- `template apply` 对 `workspace` / `full` 模板会初始化 workspace；对 `project` / `device` 模板会复用已有 workspace
- `build` / `clean` / `rebuild` 执行前会先校正目标工程 `config.mk` 里的 `SYLIXOS_BASE_PATH`

## 如果你只想把命令交给别人使用

优先发这三份：

- [完整命令参考](./COMMANDS.md)
- [配置文件参考](./CONFIG_FILES.md)
- [Upload 使用指南](./UPLOAD_GUIDE.md)
