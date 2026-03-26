# sydev

sydev 是一个面向 SylixOS 开发环境的命令行工具，用于初始化 workspace、创建项目、管理设备、编译、上传，以及把整套配置保存成模板或 JSON 文件。

## 安装

```bash
npm install -g @haawpc/sydev
```

查看安装结果：

```bash
sydev --version
sydev --help
```

## 环境要求

- Node.js `>= 18`
- RealEvo-Stream 已安装，且 `rl` / `rl-workspace` / `rl-project` 等命令可用
- 执行 `workspace`、`project`、`device`、`template apply`、`init` 时，需要在本机具备对应的 SylixOS/RealEvo 环境
- `build`、`clean`、`rebuild`、`upload` 需要在有效 workspace 根目录中运行

## 快速开始

### 1. 初始化 workspace

```bash
sydev workspace init
```

### 2. 创建项目

```bash
sydev project create
```

### 3. 添加目标设备

```bash
sydev device add
```

### 4. 编译项目

```bash
sydev build
sydev build libcpu
```

### 5. 上传产物

```bash
sydev upload
sydev upload libcpu --device board1
```

## 命令总览

| 命令 | 说明 |
| --- | --- |
| `sydev workspace` | 初始化 workspace，或检查当前目录是否已经初始化 |
| `sydev project` | 创建项目，列出当前 workspace 中的项目 |
| `sydev device` | 添加设备，列出当前 workspace 可见的设备 |
| `sydev build` | 编译单个项目，或交互式选择多个项目/构建模板 |
| `sydev clean` | 清理单个项目，或交互式选择多个项目 |
| `sydev rebuild` | 先 clean 再 build |
| `sydev upload` | 上传单个、多个或全部项目产物到设备 |
| `sydev template` | 管理全局配置模板，支持导入、导出、应用 |
| `sydev init` | 从完整 JSON 配置文件一次性初始化 workspace + projects + devices |

## 常见工作流

### 交互式日常使用

```bash
sydev workspace init
sydev project create
sydev device add
sydev build
sydev upload
```

### 非交互式脚本/CI

```bash
sydev workspace init --config workspace.json
sydev project create --config project.json
sydev device add --config device.json
sydev template apply env.json --cwd /path/to/ws --base-path /path/to/base -y
```

### 从当前 workspace 导出并复用配置

```bash
sydev template export -o sydev-config.json
sydev template import sydev-config.json
sydev template apply sydev-config.json --cwd /path/to/new-ws --base-path /path/to/new-base -y
```

## 0.4.12 更新

- `workspace init`、`sydev init --config`、`template apply` 都支持 ARM64 页大小配置与 Base 编译组件裁剪
- ARM64 页大小会在 base 构造完成且 `libsylixos` 就绪后，再修改 `libsylixos/SylixOS/config/cpu/cpu_cfg_arm64.h`
- Base 若选择编译，`rl-workspace` 阶段始终按“不编译”构造，待 base 准备完成后再进入 base 目录执行 `make all`
- Base 编译组件交互列表与非交互配置都支持部分编译；`libsylixos` 固定必选，`libcextern` 改为可选
- `template` 创建时的平台列表已与 `workspace init` / `device add` 使用同一套完整平台常量

## 两套“模板”要分清

### 配置模板：`sydev template`

`template` 命令管理的是 workspace / project / device / full 配置模板，存储在用户目录 `~/.sydev/templates/` 下。

典型用途：

- 保存一套可重复使用的环境配置
- 从 JSON 文件导入配置
- 在新目录中应用 `workspace` 或 `full` 配置
- 在已有 workspace 中复用 `project` 或 `device` 模板

### 构建模板：`sydev build`

`build` 命令还支持执行 `.sydev/Makefile` 中自定义的构建目标。它们通常以 `__` 开头，由 `sydev build` 识别和执行，不属于 `template` 子命令体系。

示例：

```makefile
SELF := $(firstword $(MAKEFILE_LIST))

__demo:
	$(MAKE) -f $(SELF) libcpu
	$(MAKE) -f $(SELF) libnet
```

执行：

```bash
sydev build __demo
```

## 文档导航

- [文档首页](./docs/README.md)
- [完整命令参考](./docs/COMMANDS.md)
- [配置文件参考](./docs/CONFIG_FILES.md)
- [Upload 使用指南](./docs/UPLOAD_GUIDE.md)
- [快速参考卡片](./docs/QUICK_REFERENCE.md)
- [Skill / IDE 集成指南](./docs/SKILL_INTEGRATION.md)
- [仓库内置 SylixOS Skill](./skills/sylixos-dev/SKILL.md)

## 内置帮助

所有主命令和子命令都支持 `--help`：

```bash
sydev --help
sydev workspace init --help
sydev project create --help
sydev template apply --help
```

## 当前 workspace 的典型文件

```text
workspace/
├── .realevo/
│   ├── config.json
│   ├── workspace.json
│   ├── projects.json
│   └── devicelist.json
├── .sydev/
│   └── Makefile
├── project-a/
│   ├── .project
│   ├── Makefile
│   ├── config.mk
│   └── .reproject
└── project-b/
    ├── .project
    ├── Makefile
    ├── config.mk
    └── .reproject
```

说明：

- `build` / `clean` / `rebuild` / `upload` 默认把当前目录视为 workspace 根目录
- `project list`、`build`、`clean`、`rebuild` 等命令当前通过“一级子目录同时包含 `.project` 和 `Makefile`”来识别项目
- `.sydev/Makefile` 的工程 target 内部调用 `rl-build`，例如 `bear --append -- rl-build build --project=<name>`
- `build` / `clean` / `rebuild` 执行前，会先把目标工程 `config.mk` 里的 `SYLIXOS_BASE_PATH` 同步成当前 workspace 的 base 路径
- `upload` / `device list` 会优先读取 `.realevo/devicelist.json`，若不存在再回退到 `.realevo/config.json`

## 更新文档的原则

这个仓库的文档以当前 CLI 行为为准，不保留已经移除或尚未实现的命令示例。若修改命令行接口，请同步更新：

- `README.md`
- `docs/COMMANDS.md`
- `docs/CONFIG_FILES.md`
- 受影响的专题文档
