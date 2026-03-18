# sydev 命令完整指南

sydev 是 SylixOS 开发环境快速部署工具，提供统一的 CLI 来管理工程编译和部署。

## 快速导航

- [Workspace](#workspace-管理工作空间)
- [Device](#device-管理目标设备)
- [Project](#project-管理工程)
- [Build](#build-编译工程)
- [Clean](#clean-清理工程)
- [Rebuild](#rebuild-重新编译)
- [Upload](#upload-上传产物到设备)
- [Template](#template-编译模板)
- [Init](#init-初始化工作空间)

---

## Workspace 管理工作空间

初始化并配置 SylixOS 开发工作空间。

### 基本用法

```bash
sydev workspace               # 交互式初始化
sydev workspace init          # 初始化工作空间子命令
sydev workspace add <name>    # 添加工程
sydev workspace remove <name> # 移除工程
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--base <path>` | SylixOS Base SDK 路径 | `--base /path/to/sylixos` |
| `--platform <platforms>` | 支持的平台（冒号分隔） | `--platform ARM64_A53:X86_64` |
| `--version <version>` | Base SDK 版本 | `--version lts_3.6.5` |
| `--createbase` | 初始化时创建 base 工程 | 无值标志 |
| `--build` | 初始化时编译 base | 无值标志 |

### 示例

```bash
# 交互式配置
sydev workspace

# 非交互式初始化
sydev workspace init \
  --base /home/user/sylixos \
  --platform ARM64_A53 \
  --version lts_3.6.5

# 添加已存在的��程
sydev workspace add myproject

# 移除工程
sydev workspace remove myproject
```

---

## Device 管理目标设备

配置和管理 FTP 上传目标设备。

### 基本用法

```bash
sydev device add               # 交互式添加设备
sydev device add --config <file>  # 从配置文件导入
sydev device list              # 列出所有设备
```

### 参数说明

| 参数 | 说明 | 必需 | 示例 |
|------|------|------|------|
| `--name <name>` | 设备名称 | ✓ | `--name board1` |
| `--ip <ip>` | 设备 IP 地址 | ✓ | `--ip 192.168.1.100` |
| `--platforms <platforms>` | 支持的平台（逗号分隔） | ✓ | `--platforms ARM64_A53,X86_64` |
| `--username <user>` | FTP 用户名 | ✓ | `--username root` |
| `--password <pwd>` | FTP 密码（可选） |  | `--password 123456` |
| `--ssh <port>` | SSH 端口 |  | `--ssh 22` (默认) |
| `--telnet <port>` | Telnet 端口 |  | `--telnet 23` (默认) |
| `--ftp <port>` | FTP 端口 |  | `--ftp 21` (默认) |
| `--gdb <port>` | GDB 端口 |  | `--gdb 1234` (默认) |

### 示例

```bash
# 交互式添加
sydev device add

# 命令行指定
sydev device add \
  --name dev_board \
  --ip 192.168.1.100 \
  --platforms ARM64_A53 \
  --username root \
  --ftp 21

# 列出所有设备
sydev device list
```

---

## Project 管理工程

在工作空间中创建和管理工程。

### 基本用法

```bash
sydev project                  # 交互式选择工程
sydev project create <name>    # 创建新工程
sydev project remove <name>    # 移除工程
sydev project list             # 列表工程
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--source <url>` | Git 仓库地址 | `--source https://...` |
| `--branch <branch>` | Git 分支 | `--branch main` |
| `--template <template>` | 项目模板 | `--template device-driver` |
| `--type <type>` | 工程类型 | `--type app/lib/driver` |

### 示例

```bash
# 交互式创建工程
sydev project

# 从 Git 创建工程
sydev project create mylib \
  --source https://github.com/example/mylib.git \
  --branch develop

# 列出工程
sydev project list
```

---

## Build 编译工程

编译一个或多个工程。

### 基本用法

```bash
sydev build                    # 交互式选择工程
sydev build <project>          # 编译指定工程
sydev build --all              # 编译全部工程
sydev build init               # 生成 .sydev/Makefile
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `<project>` | 工程名 | `libcpu` |
| `--all` | 编译全部工程 | 无值标志 |
| `--quiet` | 静默模式，不显示编译输出 | 无值标志 |
| `-- [args]` | 传递给 make 的参数 | `-- -j4` |

### 示例

```bash
# 交互式选择
sydev build

# 编译指定工程
sydev build libcpu

# 编译全部工程
sydev build --all

# 编译并指定 make 参数
sydev build libcpu -- -j4

# 生成 Makefile（脱离 sydev 直接 make）
sydev build init
make -f .sydev/Makefile libcpu
```

---

## Clean 清理工程

清理编译产物。

### 基本用法

```bash
sydev clean                    # 交互式选择工程
sydev clean <project>          # 清理指定工程
sydev clean --all              # 清理全部工程
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `<project>` | 工程名 | `libcpu` |
| `--all` | 清理全部工程 | 无值标志 |
| `--quiet` | 静默模式 | 无值标志 |
| `-- [args]` | 传递给 make 的参数 | `-- -j4` |

### 示例

```bash
# 交互式选择
sydev clean

# 清理指定工程
sydev clean libcpu

# 清理全部工程
sydev clean --all
```

---

## Rebuild 重新编译

先清理再编译工程（`clean` + `build`）。

### 基本用法

```bash
sydev rebuild                  # 交互式选择工程
sydev rebuild <project>        # 重新编译指定工程
sydev rebuild --all            # 重新编译全部工程
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `<project>` | 工程名 | `libcpu` |
| `--all` | 重新编译全部工程 | 无值标志 |
| `--quiet` | 静默模式 | 无值标志 |
| `-- [args]` | 传递给 make 的参数 | `-- -j4` |

### 示例

```bash
# 交互式选择
sydev rebuild

# 重新编译指定工程
sydev rebuild libcpu

# 重新编译全部工程
sydev rebuild --all
```

---

## Upload 上传产物到设备

通过 FTP 上传编译产物到目标设备。参考 [Upload 详细指南](./UPLOAD_GUIDE.md) 了解更多。

### 基本用法

```bash
sydev upload                   # 交互式选择工程和设备
sydev upload <project>         # 上传指定工程
sydev upload <project> --device <device>  # 上传到指定设备
sydev upload --all --device <device>      # 上传全部工程
```

### 参数说明

| 参数 | 说明 | 必需 | 示例 |
|------|------|------|------|
| `<project>` | 工程名或多工程列�� |  | `libcpu` 或 `libcpu,libnet` 或 `libcpu:libnet:libfs` |
| `--device <name>` | 目标设备名 | 上传多工程/base 时必需 | `--device board1` |
| `--all` | 上传全部工程 |  | 无值标志 |
| `--quiet` | 静默模式 |  | 无值标志 |

### 示例

```bash
# 交互式选择（推荐）
sydev upload

# 上传单个工程
sydev upload libcpu

# 上传到指定设备
sydev upload libcpu --device board1

# 上传多个工程（逗号分隔）
sydev upload libcpu,libnet --device board1

# 上传多个工程（冒��分隔）
sydev upload libcpu:libnet:libfs --device dev1

# 上传全部工程到设备
sydev upload --all --device board1

# 上传 base 工程（必须指定设备）
sydev upload base --device board1
```

---

## Template 编译模板

管理自定义编译模板。

### 基本用法

```bash
sydev template apply <template>  # 应用编译模板
```

### 说明

编译模板是在 `.sydev/Makefile` 中以 `__` 开头的自定义 make target。您可以在 Makefile 中定义自己的编译流程（如编译多个工程、执行构建后脚本等）。

### 示例

```makefile
# .sydev/Makefile 中的自定义模板
__demo:
	make libcpu
	make libnet
	make libfs
	echo "All done!"
```

然后运行：

```bash
sydev template apply __demo
```

---

## Init 初始化工作空间

快速初始化工作空间（与 `workspace init` 相同）。

### 基本用法

```bash
sydev init                     # 交互式初始化
```

---

## 全局选项

所有命令支持以下全局选项：

| 选项 | 说明 |
|------|------|
| `-h, --help` | 显示帮助信息 |
| `-v, --version` | 显示版本信息 |

---

## 常见工作流

### 1. 初始化新工作空间并编译

```bash
# 初始化工作空间
sydev workspace

# 或非交互式
sydev workspace init \
  --base /path/to/sylixos \
  --platform ARM64_A53

# 编译工程
sydev build --all

# 生成可独立 make 的 Makefile
sydev build init
```

### 2. 配置设备并上传产物

```bash
# 添加目标设备
sydev device add

# 上传工程到设备
sydev upload

# 或直接指定
sydev upload libcpu,libnet --device board1
```

### 3. 完整的开发流程

```bash
# 1. 编译
sydev build libcpu

# 2. 如有问题，清理后重新编译
sydev rebuild libcpu

# 3. 编译完成，上传到目标设备
sydev upload libcpu --device board1

# 4. 编译另一个工程
sydev build libnet

# 5. 批量上传多个工程
sydev upload libcpu,libnet,libfs --device board1
```

---

## 环境要求

- Node.js >= 18.0.0
- SylixOS Base SDK (可选，用于实际编译)
- FTP 连接能力（用于上传功能）

---

## 获取帮助

```bash
# 查看全局帮助
sydev --help

# 查看特定命令帮助
sydev build --help
sydev upload --help

# 查看命令版本
sydev --version
```
