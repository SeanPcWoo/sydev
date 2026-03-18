# sydev 快速参考卡片

## 常用命令速查

### 初始化

```bash
sydev workspace          # 交互式初始化工作空间
sydev device add         # 添加上传设备
```

### 编译

```bash
sydev build              # 交互式选择工程编译
sydev build libcpu       # 编译指定工程
sydev build --all        # 编译全部工程
sydev rebuild libcpu     # 重新编译（clean+build）
sydev clean libcpu       # 清理工程
```

### 上传

```bash
sydev upload             # 交互式选择工程和设备上传
sydev upload libcpu --device board1              # 上传单工程
sydev upload libcpu,libnet --device board1       # 上传多工程
sydev upload base --device board1                # 上传 base 工程
sydev upload --all --device board1               # 上传全部工程
```

### 帮助

```bash
sydev --help             # 查看全局帮助
sydev <command> --help   # 查看特定命令帮助
sydev --version          # 显示版本
```

---

## 工程目录结构

```
workspace/
├── .realevo/config.json          # 工作空间和设备配置（自动生成）
├── .sydev/Makefile               # 编译 Makefile（自动生成）
├── base/ (可选 - SylixOS Base SDK)
│   ├── Makefile
│   ├── config.mk
│   ├── .project
│   └── .reproject                # 上传配置
├── libcpu/
│   ├── Makefile
│   ├── config.mk                 # 编译配置（DEBUG_LEVEL）
│   ├── .project
│   └── .reproject                # 上传配置（自定义创建）
└── libnet/
    ├── Makefile
    ├── config.mk
    ├── .project
    └── .reproject
```

---

## .reproject 模板

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <!-- 指定默认上传设备 -->
  <device>board1</device>

  <!-- 定义上传文件 -->
  <upload>
    <!-- 库文件 -->
    <file local="$(WORKSPACE_libcpu)\$(Output)\lib\libcpu.so"
          remote="/system/lib/libcpu.so"/>

    <!-- 头文件 -->
    <file local="$(WORKSPACE_libcpu)\$(Output)\include\cpu.h"
          remote="/usr/include/cpu.h"/>

    <!-- Base 库 -->
    <file local="$(WORKSPACE_lts)\libsylixos\$(Output)\libvpmpdm.so"
          remote="/system/lib/libvpmpdm.so"/>
  </upload>
</project>
```

---

## 路径变量速查

| 变量 | 说明 | 替换后 |
|------|------|--------|
| `$(WORKSPACE_libcpu)` | libcpu 工程路径 | `/path/to/workspace/libcpu` |
| `$(WORKSPACE_lts)` | lts 工程路径 | `/path/to/workspace/lts` |
| `$(Output)` | 编译输出目录 | `Debug` (若 DEBUG_LEVEL=debug) 或 `Release` |
| `libsylixos` | base 库特殊识别 | 自动用 base 路径替换 WORKSPACE_xxx |

---

## config.mk 关键配置

```makefile
# 编译模式（影响 $(Output) 替换）
DEBUG_LEVEL = debug      # 对应 Debug 目录
# 或
DEBUG_LEVEL = release    # 对应 Release 目录（默认）

# Base SDK 路径（自动注入）
SYLIXOS_BASE_PATH = /path/to/sylixos-base

# Workspace 变量（自动注入）
export WORKSPACE_libcpu = /path/to/workspace/libcpu
export WORKSPACE_libnet = /path/to/workspace/libnet
```

---

## 常见工作流

### 新项目初始化 → 编译 → 上传

```bash
# 1. 初始化
sydev workspace
# → 输入 base 路径、平台、版本

# 2. 添加设备
sydev device add
# → 输入设备 IP、用户名、密码

# 3. 为工程创建 .reproject
# vi libcpu/.reproject
# vi libnet/.reproject

# 4. 编译
sydev build --all

# 5. 上传
sydev upload --all --device board1
```

### 快速编译单个工程并上传

```bash
sydev build libcpu && sydev upload libcpu --device board1
```

### 批量上传多个工程

```bash
# 方式 1: 逗号分隔
sydev upload libcpu,libnet,libfs --device board1

# 方式 2: 冒号分隔
sydev upload libcpu:libnet:libfs --device board1

# 方式 3: 交互式
sydev upload  # 然后选择多个工程（Ctrl+Space）
```

---

## IDE Skill 集成快速开始

```typescript
// 导入核心模块
import { BuildRunner } from '@sydev/core/build-runner.js';
import { UploadRunner } from '@sydev/core/upload-runner.js';
import { WorkspaceScanner } from '@sydev/core/workspace-scanner.js';

// 扫描工程
const scanner = new WorkspaceScanner(process.cwd());
const projects = scanner.scan();

// 创建编译管理器
const buildRunner = new BuildRunner(projects, process.cwd());
await buildRunner.buildOne(project);

// 创建上传管理器
const uploadRunner = new UploadRunner(projects, process.cwd(), devices);
await uploadRunner.uploadOne(project, { device: 'board1' });

// 监听上传进度
uploadRunner.on('progress', (event) => {
  if (event.type === 'file-upload') {
    console.log(`Uploading: ${event.file}`);
  }
});
```

---

## 故障排查速查

| 问题 | 解决方案 |
|------|---------|
| 找不到工程 | `sydev build` 查看可用工程列表 |
| 找不到设备 | `sydev device add` 添加目标设备 |
| 上传失败 - 文件不存在 | 确保编译完成：`sydev build libcpu` |
| 上传失败 - 目录不存在 | 自动创建，检查权限和 FTP 配置 |
| 上传失败 - FTP 连接错误 | 检查 IP、端口、用户名、密码 |
| 上传失败 - base 工程 | Base 必须指定 --device：`sydev upload base --device board1` |
| $(Output) 替换错误 | 检查 config.mk 中 DEBUG_LEVEL = debug/release |

---

## 版本和文档

- [完整命令参考](./COMMANDS.md)
- [Upload 详细指南](./UPLOAD_GUIDE.md)
- [API 参考](./API_REFERENCE.md)

获取版本：`sydev --version`

获取帮助：`sydev --help` 或 `sydev <command> --help`
