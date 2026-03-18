# sydev — SylixOS 开发环境快速部署工具

**版本**: 0.4.0

快速部署和管理 SylixOS 开发环境、编译工程、清理构建产物的命令行工具。

> **💡 开发者提示**: 如果你需要学习 sydev 的架构、开发 SKILL 或深入理解命令实现，请查看 [`docs/INDEX.md`](docs/INDEX.md) — 完整的开发文档索引。

## 安装

```bash
npm install -g @haawpc/sydev
```

## 环境要求

- Node.js >= 18.0.0
- RealEvo-Stream 已安装并配置（`rl` 命令可用）— 需要用于 workspace/project/device 初始化
- 部分命令（`build`、`clean`、`rebuild`、`template`、`init`）可独立使用

## 快速概览

| 命令 | 说明 |
|------|------|
| `sydev workspace` | 初始化和管理 workspace |
| `sydev project` | 创建和列出项目 |
| `sydev build` | 编译 SylixOS 工程 |
| `sydev clean` | 清理工程构建产物 |
| `sydev rebuild` | 清理并重新编译（clean + build） |
| `sydev device` | 管理目标设备配置 |
| `sydev template` | 管理和复用配置模板 |
| `sydev init` | 从 JSON 配置文件一键初始化 |

---

## sydev workspace

管理 SylixOS workspace — 工作空间是所有项目和配置的根目录。

### workspace init

交互式初始化 workspace，向导会引导你完成以下配置：

```bash
sydev workspace init
```

**配置项**：

| 项目 | 说明 | 选项 |
|------|------|------|
| Workspace 路径 | 工作空间根目录 | 用户输入 |
| Base 版本 | SylixOS 基础库版本 | `default`, `ecs_3.6.5`, `lts_3.6.5`, `lts_3.6.5_compiled`, `research`, `custom` |
| 目标平台 | **多选** 支持的处理器架构 | `ARM64_GENERIC`, `ARM64_A53`, `ARM64_A55`, `ARM64_A57`, `ARM64_A72`, `X86_64`, `RISCV_GC64`, `LOONGARCH64` |
| 操作系统 | 底层操作系统 | `sylixos`, `linux` |
| 调试级别 | 编译优化级别 | `release`, `debug` |
| 创建 Base | 是否初始化 Base 工程 | `true` / `false` |
| 编译 Base | 是否立即编译 Base | `true` / `false` |

### workspace status

查看当前目录的 workspace 初始化状态。

```bash
sydev workspace status
```

**输出**：
- 如果 `.realevo/` 目录存在，显示 `✓ Workspace 已初始化`
- 否则显示 `⚠ Workspace 未初始化`

---

## sydev project

管理 SylixOS 项目。

### project create

交互式创建新项目，支持两种模式：

```bash
sydev project create
```

**模式 1：导入已有 Git 工程**

输入以下信息：
- **Git 仓库地址** — 完整的 Git 仓库 URL（支持 HTTP/SSH）
- **Git 分支** — 远程分支名，会自动验证分支存在
- **项目名称** — 本地项目目录名（至少 3 个字符）
- **构建工具** — `make` 或 `ninja`

**模式 2：新建工程**

选择以下配置：
- **项目名称** — 至少 3 个字符
- **项目模板** — `app`, `lib`, `common`, `ko`, `python_native_lib`, `uorb_pubsub`, `vsoa_pubsub`, `fast_dds_pubsub`
- **构建类型** — `cmake`, `automake`, `realevo`, `ros2`, `python`, `cython`, `go`, `javascript`
- **调试级别** — `release`, `debug`
- **构建工具** — `make`, `ninja`

### project list

列出当前 workspace 中的所有项目（通过检查 `.rlproject` 标记文件）。

```bash
sydev project list
```

**输出示例**：
```
✓ 找到 3 个项目:
  - libcpu
  - my-app
  - libcommon
```

---

## sydev build

编译 SylixOS 工程，支持单项目编译或交互式多项目编译。

### 基础用法

**编译指定项目**：
```bash
sydev build libcpu
```

**交互式选择项目编译**（无参数）：
```bash
sydev build
```

**初始化/更新 Makefile**：
```bash
sydev build init
```

### 参数和选项

| 参数 | 说明 | 类型 |
|------|------|------|
| `[project]` | 项目名称，精确匹配目录名 | 可选 |
| `--quiet` | 静默模式，不显示 make 输出 | 可选 |
| `-- <args>` | 透传给 make 的额外参数 | 可选 |

### 进阶用法

**编译时传递 make 参数**（例如并行编译）：
```bash
sydev build libcpu -- -j4
```

**编译多个项目**（无参数时交互式选择）：
```bash
sydev build
# 选择多个项目进行编译
```

**静默模式编译**（不显示编译日志）：
```bash
sydev build libcpu --quiet
```

### Makefile 生成机制

第一次执行 `sydev build` 时会自动生成 `.sydev/Makefile`，包含：
- 所有项目的编译 target
- Base 项目自动添加
- `.PHONY` 声明确保每次都重新编译
- 支持 `bear` 工具捕获编译命令

也可手动初始化：
```bash
sydev build init
```

### 编译输出

成功：
```
✓ 编译成功 (5.2s)
```

失败（含错误行数统计）：
```
✗ 编译失败 (2 个错误)
  > error: undefined reference to 'foo'
  > error: expected ';' before '}'
```

---

## sydev clean

清理工程的构建产物（调用 make clean target）。

### 基础用法

**清理指定项目**：
```bash
sydev clean libcpu
```

**交互式选择项目清理**（无参数）：
```bash
sydev clean
```

### 参数和选项

| 参数 | 说明 | 类型 |
|------|------|------|
| `[project]` | 项目名称，精确匹配目录名 | 可选 |
| `--quiet` | 静默模式 | 可选 |
| `-- <args>` | 透传给 make 的额外参数 | 可选 |

### 用法示例

**清理单个项目**：
```bash
sydev clean libcpu
```

**清理多个项目**（交互式选择）：
```bash
sydev clean
# 使用 ☑ / ☐ 勾选多个项目，按 Enter 确认
```

**清理时使用并行**：
```bash
sydev clean libcpu -- -j4
```

### 清理输出

成功：
```
✓ 清理成功 (0.8s)
```

---

## sydev rebuild

一键清理+重新编译（等价于 `make clean && make`）。

### 基础用法

**重新编译指定项目**：
```bash
sydev rebuild libcpu
```

**交互式选择项目重新编译**（无参数）：
```bash
sydev rebuild
```

### 参数和选项

| 参数 | 说明 | 类型 |
|------|------|------|
| `[project]` | 项目名称，精确匹配目录名 | 可选 |
| `--quiet` | 静默模式 | 可选 |
| `-- <args>` | 透传给 make 的额外参数 | 可选 |

### 用法示例

**重新编译单个项目**：
```bash
sydev rebuild libcpu
```

**重新编译多个项目**（交互式）：
```bash
sydev rebuild
```

**重新编译并使用并行**：
```bash
sydev rebuild libcpu -- -j4
```

### 重新编译输出

成功：
```
✓ 重新编译成功 (12.3s)
```

失败会显示错误摘要，同 `sydev build`

---

## sydev device

管理目标设备配置，用于部署和调试。

### device add

交互式添加目标设备，向导会收集完整的设备配置：

```bash
sydev device add
```

**收集信息**：

| 项目 | 说明 | 示例 |
|------|------|------|
| 设备名称 | 本地标识名称 | `board-1`, `target-arm64` |
| IP 地址 | 设备 IPv4 地址 | `192.168.1.100` |
| 目标平台 | **多选** 设备支持的架构 | `ARM64_GENERIC`, `X86_64` 等 |
| 用户名 | SSH/Telnet 登录用户 | `root` |
| 密码 | 设备登录密码 | `root` |
| SSH 端口 | SSH 服务端口 | `22` |
| Telnet 端口 | Telnet 服务端口 | `23` |
| FTP 端口 | FTP 服务端口 | `21` |
| GDB 端口 | 远程 GDB 调试端口 | `1234` |

### device list

列出所有已配置的设备（功能在后续版本实现）。

```bash
sydev device list
```

---

## sydev template

管理配置模板，支持保存、复用、导入导出完整的环境配置。

配置保存在用户主目录 `~/.sydev/` 下，全局可用。

### template save

将当前配置保存为模板，交互式收集模板名称、描述和类型。

```bash
sydev template save
```

**模板类型**：

| 类型 | 说明 | 包含内容 |
|------|------|---------|
| `workspace` | 环境模板 | workspace 配置 |
| `project` | 项目模板 | 单个项目配置 |
| `device` | 设备模板 | 单个设备配置 |
| `full` | 完整模板 | workspace + 多个项目 + 多个设备 |

**模板命名**：
- 模板 ID 由名称自动生成（空格转下划线，转小写）
- 如果模板已存在，可选择：覆盖 / 重命名 / 取消

### template list

查看所有已保存的模板，支持按类型过滤。

```bash
sydev template list
sydev template list -t workspace   # 按类型过滤
```

**选项**：

| 选项 | 说明 |
|------|------|
| `-t, --type <type>` | 按类型过滤：`workspace`, `project`, `device`, `full` |

**输出示例**：
```
共 3 个模板:

  ID                   名称                类型         更新时间
  ──────────────────────────────────────────────────────────────
  my_workspace         My Workspace        workspace    2026/3/17 18:20:30
  my_app_config        My App Config       project      2026/3/17 18:15:45
  dev_env              Development Env     full         2026/3/17 18:10:20
```

### template apply

从模板初始化环境。对 `full` 类型模板支持**部分应用**。

```bash
sydev template apply <模板ID>
```

**应用流程**：
1. 指定 workspace 路径和 Base 目录路径
2. 如果是 `full` 模板，可选择要应用的部分（workspace / projects / devices）
3. 验证配置并执行初始化

**示例**：
```bash
# 应用完整模板
sydev template apply my_env

# 应用时交互式选择部分
# ☑ workspace
# ☐ project:my-app
# ☑ device:board-1
```

### template delete

删除指定模板（需要确认）。

```bash
sydev template delete <模板ID>
```

输入模板 ID，确认后删除。

### template export

导出配置为 JSON 文件，便于备份或分享。

```bash
sydev template export
sydev template export -o my-config.json
```

**选项**：

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output <file>` | 输出文件路径 | `sydev-config.json` |

**导出流程**：
1. 选择要导出的���型（workspace / project / device / full）
2. 交互式收集配置
3. 保存为 JSON 文件

**JSON 示例**：
```json
{
  "schemaVersion": 1,
  "type": "full",
  "workspace": {
    "platform": ["ARM64_GENERIC", "X86_64"],
    "version": "default",
    "debugLevel": "release",
    "os": "sylixos",
    "createbase": true,
    "build": false
  },
  "projects": [
    {
      "name": "my-app",
      "source": "https://github.com/user/my-app.git",
      "branch": "main"
    }
  ]
}
```

### template import

从 JSON 文件导入配置，自动检测配置类型，可选保存为模板。

```bash
sydev template import config.json
```

**导入流程**：
1. 读取 JSON 文件
2. 自动检测配置类型
3. 提示是否保存为模板
4. 如保存，收集模板名称和描述

**支持的 JSON 格式**：
- `{ "type": "full", "workspace": {...}, "projects": [...], "devices": [...] }`
- `{ "type": "workspace", "workspace": {...} }`
- `{ "type": "project", "project": {...} }`
- `{ "workspace": {...}, ... }` — 自动识别为 full

---

## sydev init

从 JSON 配置文件全流程初始化环境（workspace + projects + devices），一条命令完成所有部署。

```bash
sydev init --config my-env.json
```

**选项**：

| 选项 | 说明 | 类型 |
|------|------|------|
| `--config <file>` | 配置文件路径（JSON） | 必需 |

### 初始化流程

1. **读取和验证配置文件**
   - 自动检测并处理 `{ type: "full", data: {...} }` 格式
   - 验证配置架构

2. **交互式收集路径**（如果配置文件未指定）
   - `workspace.cwd` — 工作空间根目录
   - `workspace.basePath` — Base 目录路径

3. **执行初始化**
   - 创建 workspace 目录
   - 初始化 Base 工程
   - 创建项目
   - 添加设备配置

4. **显示结果**
   - 成功：列出已完成步骤
   - 失败：显示失败原因和已完成步骤

### 配置文件示例

**完整配置**：
```json
{
  "schemaVersion": 1,
  "workspace": {
    "cwd": "/home/user/workspace",
    "basePath": "/home/user/base",
    "platform": ["ARM64_GENERIC", "X86_64"],
    "version": "default",
    "debugLevel": "release",
    "os": "sylixos",
    "createbase": true,
    "build": false
  },
  "projects": [
    {
      "name": "my-app",
      "template": "app",
      "type": "cmake",
      "debugLevel": "release",
      "makeTool": "make"
    },
    {
      "name": "imported-app",
      "source": "https://github.com/user/my-project.git",
      "branch": "main",
      "makeTool": "ninja"
    }
  ],
  "devices": [
    {
      "name": "board-1",
      "ip": "192.168.1.100",
      "platform": ["ARM64_GENERIC"],
      "username": "root",
      "password": "root",
      "ssh": 22,
      "telnet": 23,
      "ftp": 21,
      "gdb": 1234
    }
  ]
}
```

**最小配置**（仅 workspace）：
```json
{
  "workspace": {
    "platform": ["ARM64_GENERIC"],
    "version": "default",
    "debugLevel": "release",
    "os": "sylixos"
  }
}
```

---

## 非交互模式（CI/自动化）

所有交互式命令都支持**完全的命令行参数模式**，允许脚本化和自动化场景。你可以通过：

1. **命令行标志** — 直接传递所有参数
2. **JSON 配置文件** — 结构化配置文件
3. **混合模式** — JSON 文件 + 命令行覆盖

### workspace init 非交互模式

**方式 1：命令行参数**

```bash
sydev workspace init \
  --cwd /path/to/workspace \
  --base-path /path/to/workspace/.realevo/base \
  --version default \
  --platforms ARM64_GENERIC,X86_64 \
  --os sylixos \
  --debug-level release \
  --create-base \
  --build
```

**方式 2：JSON 配置文件**

创建 `workspace.json`：
```json
{
  "version": "default",
  "cwd": "/home/user/my-workspace",
  "basePath": "/home/user/my-workspace/.realevo/base",
  "platform": ["ARM64_GENERIC", "X86_64"],
  "os": "sylixos",
  "debugLevel": "release",
  "createbase": true,
  "build": false
}
```

然后执行：
```bash
sydev workspace init --config workspace.json
```

**方式 3：混合模式（JSON + 命令行覆盖）**

```bash
sydev workspace init --config workspace.json --platforms X86_64,ARM64_A53
```

### project create 非交互模式

**导入 Git 项目**

```bash
sydev project create \
  --mode import \
  --name my-project \
  --source https://github.com/user/repo.git \
  --branch main \
  --make-tool make
```

**新建项目**

```bash
sydev project create \
  --mode create \
  --name my-app \
  --template app \
  --type cmake \
  --debug-level release \
  --make-tool make
```

**使用 JSON 配置**

创建 `project.json`：
```json
{
  "mode": "create",
  "name": "my-app",
  "template": "app",
  "type": "cmake",
  "debugLevel": "release",
  "makeTool": "make"
}
```

执行：
```bash
sydev project create --config project.json
```

### device add 非交互模式

```bash
sydev device add \
  --name dev1 \
  --ip 192.168.1.100 \
  --platforms ARM64_GENERIC,X86_64 \
  --username root \
  --password root \
  --ssh 22 \
  --telnet 23 \
  --ftp 21 \
  --gdb 1234
```

或使用 JSON 配置（`device.json`）：
```json
{
  "name": "device-arm64",
  "ip": "192.168.1.100",
  "platforms": ["ARM64_GENERIC", "ARM64_A53"],
  "username": "root",
  "password": "root",
  "ssh": 22,
  "telnet": 23,
  "ftp": 21,
  "gdb": 1234
}
```

执行：
```bash
sydev device add --config device.json
```

### 脚本化示例

**一键部署环境** (`deploy.sh`)：

```bash
#!/bin/bash

# 初始化 workspace
sydev workspace init \
  --cwd /data/workspace \
  --base-path /data/workspace/.realevo/base \
  --version lts_3.6.5 \
  --platforms ARM64_A53,X86_64 \
  --os sylixos \
  --debug-level release \
  --create-base \
  --build

# 创建项目
sydev project create \
  --mode import \
  --name myapp \
  --source https://github.com/company/myapp.git \
  --branch main \
  --make-tool make

# 添加设备
sydev device add --config devices.json

# 编译
sydev build myapp -- -j8
```

### 参数说明

#### workspace init 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--cwd` | Workspace 路径 | `/path/to/ws` |
| `--base-path` | Base 目录路径 | `/path/to/ws/.realevo/base` |
| `--version` | Base 版本 | `default`, `lts_3.6.5`, `custom`, `research` |
| `--platforms` | 目标平台（逗号分隔） | `ARM64_GENERIC,X86_64` |
| `--os` | 操作系统 | `sylixos`, `linux` |
| `--debug-level` | 调试级别 | `release`, `debug` |
| `--custom-repo` | 自定义仓库 URL（version=custom） | `https://...` |
| `--custom-branch` | 自定义分支（version=custom） | `main` |
| `--research-branch` | Research 分支（version=research） | `master` |
| `--create-base` | 创建 Base | 标志（默认 true） |
| `--no-create-base` | 不创建 Base | 标志 |
| `--build` | 编译 Base | 标志（默认 false） |
| `--config` | JSON 配置文件 | `workspace.json` |

#### project create 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--mode` | 操作模式 | `import`, `create` |
| `--name` | 项目名称 | `my-project` |
| `--source` | Git 仓库（mode=import） | `https://github.com/...` |
| `--branch` | Git 分支（mode=import） | `main` |
| `--template` | 项目模板（mode=create） | `app`, `lib`, `ko` 等 |
| `--type` | 构建类型（mode=create） | `cmake`, `realevo`, `python` 等 |
| `--debug-level` | 调试级别 | `release`, `debug` |
| `--make-tool` | 构建工具 | `make`, `ninja` |
| `--config` | JSON 配置文件 | `project.json` |

#### device add 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--name` | 设备名称 | `dev1` |
| `--ip` | 设备 IP | `192.168.1.100` |
| `--platforms` | 支持的平台（逗号分隔） | `ARM64_GENERIC,X86_64` |
| `--username` | 登录用户 | `root` |
| `--password` | 登录密码 | `root` |
| `--ssh` | SSH 端口 | `22` |
| `--telnet` | Telnet 端口 | `23` |
| `--ftp` | FTP 端口 | `21` |
| `--gdb` | GDB 端口 | `1234` |
| `--config` | JSON 配置文件 | `device.json` |

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

# 编译项目
sydev build libcpu
```

### 2. 保存为模板复用

```bash
# 保存当前配置为完整模板
sydev template save

# 在其他机器上应用模板
sydev template apply my-template
```

### 3. 配置文件批量部署

```bash
# 导出当前配置为 JSON
sydev template export -o env.json

# 在其他机器上一键初始化
sydev init --config env.json
```

### 4. 编译工作流

```bash
# 编译单个项目
sydev build libcpu

# 编译多个项目（交互式）
sydev build

# 清理项目
sydev clean libcpu

# 重新编译
sydev rebuild libcpu

# 并行编译（传递 make 参数）
sydev build libcpu -- -j8
```

---

## 全局选项

| 选项 | 说明 |
|------|------|
| `-v, --version` | 显示版本信息 |
| `-h, --help` | 显示帮助信息 |

---

## 架构说明

### 项目结构

```
workspace/
├── .realevo/              # RealEvo 配置目录
├── .sydev/
│   └── Makefile           # 自动生成的构建脚本
├── base/                  # SylixOS Base 工程
├── libcpu/                # 项目 1
│   ├── .project           # 标记文件
│   └── Makefile           # 项目构建配置
├── my-app/                # 项目 2
│   ├── .project
│   └── Makefile
└── ...
```

### Makefile 生成

`sydev build init` 会自动生成 `.sydev/Makefile`，每个项目一个 target：

```makefile
.PHONY: libcpu my-app clean rebuild

libcpu:
	cd libcpu && make

my-app:
	cd my-app && make

clean:
	cd libcpu && make clean
	cd my-app && make clean

rebuild: clean
	cd libcpu && make
	cd my-app && make
```

也可直接使用：
```bash
make -f .sydev/Makefile libcpu
make -f .sydev/Makefile clean
```

---

## 配置文件存储

- **模板**：`~/.sydev/` （用户主目录）
- **Workspace 配置**：`.realevo/config.json` （workspace 目录）
- **项目配置**：各项目的 `.project` 文件

---

## 常见问题

### Q: 我可以在 workspace 外运行 build/clean 命令吗？

A: 可以。build/clean/rebuild 不需要 RealEvo-Stream，可在任何包含 workspace 项目的目录运行。

### Q: 如何并行编译？

A: 使用 `--` 传递 make 参数：
```bash
sydev build libcpu -- -j8
```

### Q: 如何导出配置供其他机器使用？

A: 使用 template 功能：
```bash
sydev template save           # 保存为模板
sydev template export -o env.json  # 导出为 JSON
# 在其他机器上
sydev init --config env.json  # 一键初始化
```

### Q: 模板存放在哪里？

A: 所有模板存放在用户主目录的 `~/.sydev/` 下，全局可用。

---

## 许可证

MIT
