# sydev upload 使用指南

`sydev upload` 用于把项目产物上传到目标设备。本文档重点说明 `.reproject` 配置、设备选择规则、路径变量替换，以及当前实现的限制。

## 命令形式

```bash
sydev upload
sydev upload <project>
sydev upload <project> --device <device>
sydev upload <project1,project2> --device <device>
sydev upload <project1:project2> --device <device>
sydev upload --all --device <device>
```

## 当前实现的规则

- 单项目上传时，可以不显式传 `--device`，命令会尝试从该项目 `.reproject` 中读取默认设备
- 多项目上传时，必须显式传 `--device`
- `--all` 时，必须显式传 `--device`
- 交互模式下，先多选项目，再选择设备
- 若能从 workspace 配置中检测到 base 目录，且 base 目录下存在 `.reproject`，则 `base` 会作为可上传项目出现

## 前置条件

### 1. 运行目录必须是 workspace 根目录

`upload` 会从当前目录扫描项目并加载设备配置。

### 2. 目标项目必须可被识别

当前实现中，项目需要位于 workspace 一级子目录，并同时包含：

- `.project`
- `Makefile`

### 3. 设备信息必须可读取

`upload` / `device list` 当前按以下顺序读取设备：

1. `.realevo/devicelist.json`
2. `.realevo/config.json`

### 4. 每个要上传的项目都需要 `.reproject`

上传规则由项目目录中的 `.reproject` 文件定义。

## 最短工作流

### 1. 添加设备

```bash
sydev device add
```

或：

```bash
sydev device add --config device.json
```

### 2. 编译项目

```bash
sydev build libcpu
```

### 3. 上传

```bash
sydev upload libcpu --device board1
```

## `.reproject` 文件格式

### 最小示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <device>board1</device>
  <upload>
    <file local="$(WORKSPACE_libcpu)\$(Output)\libcpu.so"
          remote="/system/lib/libcpu.so"/>
  </upload>
</project>
```

### 完整示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <device>board1</device>
  <upload>
    <file local="$(WORKSPACE_libcpu)\$(Output)\lib\libcpu.so"
          remote="/system/lib/libcpu.so"/>

    <file local="$(WORKSPACE_libcpu)\$(Output)\include\cpu.h"
          remote="/usr/include/cpu.h"/>

    <file local="$(WORKSPACE_lts)\libsylixos\$(Output)\libvpmpdm.so"
          remote="/system/lib/libvpmpdm.so"/>
  </upload>
</project>
```

## 设备选择规则

### 单项目上传

```bash
sydev upload libcpu
```

规则：

- 如果命令行传了 `--device`，优先使用命令行值
- 否则尝试使用 `.reproject` 中的 `<device>`
- 若两者都没有，上传失败

### 多项目上传

```bash
sydev upload libcpu,libnet --device board1
```

规则：

- 当前实现要求必须显式传 `--device`
- 不会为每个项目单独读取不同的默认设备

### `--all`

```bash
sydev upload --all --device board1
```

规则：

- 当前实现要求必须显式传 `--device`
- 会遍历当前可见的全部项目
- 若 `base` 被检测到，也会一并参与上传

## 支持的项目列表写法

### 单项目

```bash
sydev upload libcpu --device board1
```

### 逗号分隔

```bash
sydev upload libcpu,libnet,libfs --device board1
```

### 冒号分隔

```bash
sydev upload libcpu:libnet:libfs --device board1
```

### 交互式多选

```bash
sydev upload
```

## 路径变量替换

### `$(WORKSPACE_<project>)`

会替换成 workspace 中对应项目的绝对路径。

示例：

```text
$(WORKSPACE_libcpu) -> /path/to/workspace/libcpu
```

### `$(Output)`

根据项目 `config.mk` 中的 `DEBUG_LEVEL` 自动替换：

- `debug` -> `Debug`
- `release` -> `Release`

如果无法读取到有效值，默认按 `Release` 处理。

### Base 特殊处理

当本地路径包含 `libsylixos` 关键字时，会使用 base 路径进行替换。

示例：

```text
原始: $(WORKSPACE_lts)\libsylixos\$(Output)\libvpmpdm.so
替换: /path/to/base/libsylixos/Release/libvpmpdm.so
```

## 示例

### 单项目上传

```bash
sydev build libcpu
sydev upload libcpu --device board1
```

### 依赖 `.reproject` 默认设备

```bash
sydev upload libcpu
```

前提：

- `libcpu/.reproject` 中有 `<device>board1</device>`

### 多项目上传

```bash
sydev upload libcpu,libnet --device board1
```

### 上传全部项目

```bash
sydev upload --all --device board1
```

### 上传 base

```bash
sydev upload base --device board1
```

前提：

- `.realevo/config.json` 中能解析出 base 路径
- base 目录下存在 `.reproject`

## 常见故障

### `未配置设备（运行 sydev device add 添加设备）`

说明：

- 当前 workspace 中没有可读取的设备配置

处理：

```bash
sydev device add
sydev device list
```

### `上传多个工程时必须指定设备 (--device)`

说明：

- 这是当前实现的硬性要求

处理：

```bash
sydev upload libcpu,libnet --device board1
```

### `上传所有工程时必须指定设备 (--device)`

处理：

```bash
sydev upload --all --device board1
```

### `未找到工程`

说明：

- 当前目录不是 workspace 根目录，或项目目录结构不满足要求

处理：

```bash
sydev project list
sydev build
```

### `上传失败: ...`

优先检查：

1. 对应项目是否已完成编译
2. `.reproject` 中的本地路径是否真实存在
3. 设备 IP、端口、用户名和密码是否正确
4. 设备端 FTP 服务是否可访问

## 推荐搭配的命令

```bash
sydev build libcpu
sydev build init
sydev device list
sydev project list
```

## 相关文档

- [完整命令参考](./COMMANDS.md)
- [配置文件参考](./CONFIG_FILES.md)
- [快速参考卡片](./QUICK_REFERENCE.md)
