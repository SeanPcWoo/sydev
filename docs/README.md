# sydev 文档中心

欢迎使用 sydev —— SylixOS 开发环境快速部署工具！

这里包含了所有你需要的文档和参考资料。

## 📚 文档导航

### 快速入门

- **[快速参考卡片](./QUICK_REFERENCE.md)** ⚡
  - 常用命令速查
  - 工程目录结构
  - 常见工作流
  - 故障排查速查表

### 详细指南

- **[完整命令参考](./COMMANDS.md)** 📖
  - 所有命令的详细说明
  - 参数详解
  - 完整的使用示例
  - 全局选项说明

- **[Upload 使用指南](./UPLOAD_GUIDE.md)** 📤
  - 上传功能完整说明
  - .reproject 配置格式
  - 路径变量替换规则
  - 工作流程示例
  - 故障排除指南

### 开发者文档

- **[Skill 集成指南](./SKILL_INTEGRATION.md)** 🔧
  - 通过 CLI 接口集成 sydev
  - 常见集成场景和代码示例
  - 配置文件解析方式
  - 最佳实践

---

## 🎯 按场景查找文档

### 我想...

| 场景 | 推荐文档 |
|------|---------|
| 快速了解常用命令 | [快速参考卡片](./QUICK_REFERENCE.md) |
| 初始化新工作空间 | [命令参考 → Workspace](./COMMANDS.md#workspace-管理工作空间) |
| 配置上传到设备 | [Upload 指南](./UPLOAD_GUIDE.md) |
| 编写 IDE Skill | [Skill 集成指南](./SKILL_INTEGRATION.md) |
| 排查问题 | [快速参考卡片 → 故障排查](./QUICK_REFERENCE.md#故障排查速查) 或 [Upload 指南 → 故障排除](./UPLOAD_GUIDE.md#故障排除) |
| 完整学习所有命令 | [完整命令参考](./COMMANDS.md) |

---

## 🚀 5 分钟快速开始

### 第 1 步：初始化工作空间

```bash
sydev workspace
```

交互式输入：
- Base SDK 路径
- 支持的平台
- 版本等信息

### 第 2 步：配置目标设备

```bash
sydev device add
```

交互式输入：
- 设备名称
- IP 地址
- FTP 用户名和密码

### 第 3 步：为工程配置上传

在每个工程目录创建 `.reproject` 文件：

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

### 第 4 步：编译

```bash
sydev build --all
```

### 第 5 步：上传

```bash
sydev upload --all --device board1
```

完成！🎉

---

## 📋 文档结构

```
docs/
├── README.md (本文件)
├── QUICK_REFERENCE.md         # 速查表 ⚡
├── COMMANDS.md                # 完整命令参考 📖
├── UPLOAD_GUIDE.md            # 上传详细指南 📤
└── SKILL_INTEGRATION.md       # Skill 集成指南 🔧
```

---

## 🎓 按难度学习

### 初级（刚开始使用）

1. 阅读 [快速参考卡片](./QUICK_REFERENCE.md) 前 2 部分
2. 跟随 [5 分钟快速开始](#5-分钟快速开始)
3. 运行几个基本命令

### 中级（日常开发��

1. 阅读 [完整命令参考](./COMMANDS.md)
2. 学习 [Upload 使用指南](./UPLOAD_GUIDE.md) 中的工作流
3. 根据需要查阅 [快速参考卡片](./QUICK_REFERENCE.md)

### 高级（IDE 集成）

1. 学习 [API 参考](./API_REFERENCE.md)
2. 查看集成示例
3. 参考 `packages/core/src/` 中的实现代码

---

## 🔑 关键概念

### Workspace（工作空间）

包含所有工程和配置的目录。初始化后会生成：
- `.realevo/config.json` - 工作空间和设备配置
- `.sydev/Makefile` - 自动生成的编译文件

参考：[Workspace 命令](./COMMANDS.md#workspace-管理工作空间)

### Project（工程）

SylixOS 工程，通常包含：
- `Makefile` - 编译配置
- `config.mk` - 编译参数（包括 DEBUG_LEVEL）
- `.project` - 工程描述
- `.reproject` - 上传配置（自定义，可选）

参考：[工程结构](./QUICK_REFERENCE.md#工程目录结构)

### Device（设备）

目标部署设备，通过 FTP 连接。配置包括：
- 名称、IP、FTP 端口
- 用户名和密码
- 支持的平台

参考：[Device 命令](./COMMANDS.md#device-管理目标设备)

### .reproject（上传配置）

定义如何将编译产物上传到设备。支持：
- 变量替换：`$(WORKSPACE_xxx)`、`$(Output)`
- Base 工程特殊处理（libsylixos）
- 自动创建远端目录

参考：[.reproject 格式](./UPLOAD_GUIDE.md#reproject-配置)

### $(Output) 变量

根据 `config.mk` 中的 `DEBUG_LEVEL` 自动替换：
- `debug` → `Debug`
- `release` → `Release`

参考：[变量替换规则](./UPLOAD_GUIDE.md#路径变量替换)

---

## 📞 需要帮助？

### 查看命令帮助

```bash
sydev --help              # 全局帮助
sydev build --help        # 特定命令帮助
```

### 常见问题

查看 [快速参考卡片 → 故障排查](./QUICK_REFERENCE.md#故障排查速查)

或 [Upload 指南 → 故障排除](./UPLOAD_GUIDE.md#故障排除)

### 联系支持

- 查看 [API 参考](./API_REFERENCE.md) 了解集成
- 参考项目 README 获取更多信息

---

## 💡 最佳实践

1. **使用标准路径结构**
   ```xml
   <file local="$(WORKSPACE_<project>)\$(Output)\<artifact>"
         remote="/system/lib/<artifact>"/>
   ```

2. **在 .reproject 中指定默认设备**
   ```xml
   <device>board1</device>
   ```
   避免每次都要指定 `--device`

3. **确保 config.mk 配置正确**
   ```makefile
   DEBUG_LEVEL = release
   ```
   确保与实际编译配置一致

4. **批量操作时指定设备**
   ```bash
   sydev upload libcpu,libnet,libfs --device board1
   ```

5. **使用 --quiet 模式进行自动化**
   ```bash
   sydev upload --all --device board1 --quiet
   ```

---

## 🚦 下一步

- 完成 [5 分钟快速开始](#5-分钟快速开始)
- 浏览 [快速参考卡片](./QUICK_REFERENCE.md)
- 根据需要查阅其他文档

祝开发愉快！ 🎉

---

**sydev 版本**: 见 `sydev --version`

**最后更新**: 2026-03-18

**相关资源**:
- [完整命令参考](./COMMANDS.md)
- [Upload 使用指南](./UPLOAD_GUIDE.md)
- [Skill 集成指南](./SKILL_INTEGRATION.md)
