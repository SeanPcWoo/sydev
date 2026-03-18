# sydev 开发文档索引

本目录包含 sydev 项目的各类开发文档，为不同角色的用户提供全面的参考资料。

## 📚 文档导航

### 1. **MEMORY.md** — 项目核心知识库
- **用途**: sydev 项目的功能和设计文档汇总
- **内容**:
  - 8 个主命令体系完整说明
  - v0.4.0 新增的非交互模式详解
  - 参数解析框架说明
  - 关键设计细节
  - SKILL 开发建议
- **适合**: 项目维护者、新贡献者、架构规划

### 2. **commands-reference.md** — 完整命令参考指南
- **用途**: SKILL 开发者手册，包含完整的 API 参考
- **内容**:
  - 所有 16 个命令的详细 API 文档
  - 交互流程和参数说明
  - 核心类的使用示例
  - 数据类型定义（TypeScript）
  - Makefile 生成细节
  - 常用 SKILL 开发模式代码示例
- **适合**:
  - SKILL 开发者
  - 需要深入理解命令实现的人
  - 编写自动化脚本的用户

### 3. **quick-index.md** — 快速查询索引
- **用途**: 快速查找命令实现和核心类
- **内容**:
  - 命令 → 实现文件映射表
  - 核心类位置和主要方法汇总
  - 常见 SKILL 开发场景导航
  - 命令参数速查表
  - 错误处理模式
  - 快速开发流程清单
- **适合**:
  - 需要快速定位代码的开发者
  - 学习已有 SKILL 的用户
  - 项目文件导航

## 🎯 使用场景

### 场景 1：我想理解 sydev 的整体架构
```
阅读顺序：MEMORY.md → quick-index.md → commands-reference.md
```

### 场景 2：我想开发一个 SKILL
```
1. 查看 quick-index.md 的"常见 SKILL 开发场景"
2. 在 commands-reference.md 中找到相关命令的 API
3. 参考 MEMORY.md 的"SKILL 开发建议"
```

### 场景 3：我需要快速找到某个命令的实现
```
打开 quick-index.md 查看"命令 → 实现文件映射"表
```

### 场景 4：我需要了解某个核心类的用法
```
在 quick-index.md 查看"核心类位置"，然后在
commands-reference.md 中找 API 示例
```

## 📖 文档关系图

```
MEMORY.md (整体概览)
    ↓
    ├── quick-index.md (快速查询)
    │   └── 定位具体的命令和类
    └── commands-reference.md (详细 API)
        └── 获得完整的实现细节和代码示例
```

## 🚀 快速开始阅读

### 5 分钟快速入门
- 阅读 **MEMORY.md** 中的"8 个主命令体系"部分

### 15 分钟了解非交互模式
- 阅读 **MEMORY.md** 中的"v0.4.0 新增：非交互模式"部分

### 30 分钟深入理解架构
- 完整阅读 **MEMORY.md**
- 浏览 **quick-index.md** 的映射表

### 1 小时学习 SKILL 开发
1. 阅读 **quick-index.md** 中的"常见 SKILL 开发场景"
2. 在 **commands-reference.md** 中查看具体的 API 和代码示例
3. 参考 **MEMORY.md** 的"SKILL 开发建议"

## 📝 文档维护说明

这些文档由 Claude 通过智能分析自动生成和维护：

- **MEMORY.md**: 项目核心知识，定期同步到全局记忆库
- **commands-reference.md**: 详细的 API 参考和开发指南
- **quick-index.md**: 快速导航索引

如有变更：
1. 更新对应的源文件
2. 同步到 Claude 的全局记忆库
3. 更新此索引文档

## 🔗 其他重要文件

- **README.md** — 用户使用文档（命令用法、参数说明）
- **examples/** — 示例配置文件
  - `workspace-config.json`
  - `project-import-config.json`
  - `project-create-config.json`
  - `device-config.json`

## 💡 建议

- 🔍 **查找** → quick-index.md
- 📚 **学习** → commands-reference.md
- 🎯 **理解** ��� MEMORY.md
- 👤 **使用** → ../README.md
- 📋 **示例** → ../examples/

---

**更新时间**: 2026-03-18
**sydev 版本**: 0.4.0
