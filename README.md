# sydev — SylixOS 开发环境快速部署工具

## 安装

```bash
npm install -g @haawpc/sydev
```

## 环境要求

- Node.js >= 18.0.0
- RealEvo-Stream 已安装并配置（`rl` 命令可用）
- 部分命令（`template`、`init`、`web`、`completion`）无需 RealEvo-Stream 环境

## 命令概览

| 命令 | 说明 |
|------|------|
| `sydev workspace` | 管理 SylixOS workspace |
| `sydev project` | 管理 SylixOS 项目 |
| `sydev device` | 管理目标设备 |
| `sydev template` | 管理配置模板 |
| `sydev init` | 从配置文件全流程初始化 |
| `sydev web` | 启动 Web 可视化界面 |
| `sydev completion` | 生成 Shell 自动补全脚本 |

---

## sydev workspace

管理 SylixOS workspace。

### workspace init

交互式初始化 workspace，向导会引导你完成以下配置：

- workspace 路径
- Base 版本（默认 / ecs_3.6.5 / lts_3.6.5 / lts_3.6.5_compiled / research / custom）
- 目标平台（如 arm64、x86_64 等）
- 操作系统类型（sylixos / linux）
- 调试级别（release / debug）
- 是否创建并编译 Base 工程

```bash
sydev workspace init
```

### workspace status

查看当前目录的 workspace 状态。

```bash
sydev workspace status
```

---

## sydev project

管理 SylixOS 项目。

### project create

交互式创建新项目，支持两种模式：

- 导入已有 Git 工程：输入仓库地址、分支、项目名称、构建工具
- 新建工程：选择项目模板、构建类型、调试级别、构建工具

可选项目模板：`app` / `lib` / `common` / `ko` / `python_native_lib` / `uorb_pubsub` / `vsoa_pubsub` / `fast_dds_pubsub`

可选构建类型：`cmake` / `automake` / `realevo` / `ros2` / `python` / `cython` / `go` / `javascript`

```bash
sydev project create
```

### project list

列出当前 workspace 中的所有项目。

```bash
sydev project list
```

---

## sydev device

管理目标设备。

### device add

交互式添加目标设备，向导会收集：

- 设备名称
- IP 地址
- 目标平台
- SSH / Telnet / FTP / GDB 端口
- 用户名和密码

```bash
sydev device add
```

### device list

列出所有已配置的设备。

```bash
sydev device list
```

---

## sydev template

管理配置模板，支持保存、复用、导入导出完整的环境配置。

### template save

将当前配置保存为模板，交互式收集模板名称、描述和类型。

模板类型：`workspace` / `project` / `device` / `full`（完整环境）

```bash
sydev template save
```

### template list

查看所有已保存的模板。

```bash
sydev template list
sydev template list -t workspace   # 按类型过滤
```

| 选项 | 说明 |
|------|------|
| `-t, --type <type>` | 按类型过滤（workspace / project / device / full） |

### template apply

从模板初始化环境。对 `full` 类型模板支持部分应用（可选择只应用 workspace / projects / devices）。

```bash
sydev template apply <模板ID>
```

### template delete

删除指定模板（需确认）。

```bash
sydev template delete <模板ID>
```

### template export

导出配置为 JSON 文件。

```bash
sydev template export
sydev template export -o my-config.json
```

| 选项 | 说明 |
|------|------|
| `-o, --output <file>` | 输出文件路径（默认 `sydev-config.json`） |

### template import

从 JSON 文件导入配置，自动检测配置类型，可选保存为模板。

```bash
sydev template import config.json
```

---

## sydev init

从 JSON 配置文件全流程初始化环境（workspace + projects + devices），一条命令完成所有部署。

```bash
sydev init --config my-env.json
```

| 选项 | 说明 |
|------|------|
| `--config <file>` | 配置文件路径（JSON），必需 |

配置文件中如果缺少 `workspace.cwd` 或 `workspace.basePath`，会交互式提示输入。

配置文件示例：

```json
{
  "workspace": {
    "cwd": "/home/user/workspace",
    "basePath": "/home/user/base",
    "platform": "arm64",
    "os": "sylixos",
    "debugLevel": "release"
  },
  "projects": [
    {
      "name": "my-app",
      "template": "app",
      "buildTool": "cmake"
    }
  ],
  "devices": [
    {
      "name": "board-1",
      "ip": "192.168.1.100",
      "platform": "arm64"
    }
  ]
}
```

---

## sydev web

启动 Web 可视化管理界面，提供配置管理、状态监控、模板管理和批量操作功能。

```bash
sydev web
sydev web -p 8080
sydev web --no-open
```

| 选项 | 说明 |
|------|------|
| `-p, --port <port>` | 端口号（默认 `3456`） |
| `--no-open` | 不自动打开浏览器 |

Web 界面功能：
- 配置表单：可视化编辑 workspace / project / device 配置
- 状态面板：查看当前环境状态
- 模板管理：创建、编辑、导入导出模板
- 批量操作：批量初始化环境，实时进度展示

---

## sydev completion

生成 Shell 自动补全脚本，支持 Bash 和 Zsh。

### completion install

自动检测当前 Shell 并安装补全脚本。

```bash
sydev completion install
```

### completion bash

输出 Bash 补全脚本（手动安装）。

```bash
sydev completion bash >> ~/.bashrc
```

### completion zsh

输出 Zsh 补全脚本（手动安装）。

```bash
sydev completion zsh > ~/.zsh/completion/_sydev
```

---

## 快速上手

### 1. 交互式创建环境

```bash
# 初始化 workspace
sydev workspace init

# 创建项目
sydev project create

# 添加设备
sydev device add
```

### 2. 保存为模板复用

```bash
# 保存当前配置为模板
sydev template save

# 在其他机器上应用模板
sydev template apply my-template
```

### 3. 配置文件批量部署

```bash
# 导出当前配置
sydev template export -o env.json

# 在其他机器上一键初始化
sydev init --config env.json
```

### 4. Web 界面管理

```bash
sydev web
```

---

## 全局选项

| 选项 | 说明 |
|------|------|
| `-v, --version` | 显示版本信息 |
| `-h, --help` | 显示帮助信息 |
