# SylixOS 开发环境快速部署工具

## What This Is

一个 CLI 工具，帮助开发者快速搭建 RealEvo-Stream 开发环境并管理日常开发工作流。支持 workspace 初始化、项目创建、设备配置的全流程自动化，以及工程编译调度和产物部署上传。面向新手提供引导式配置，面向经验开发者提供模板复用和单命令操作。

## Core Value

开发者能够在 5 分钟内从零开始完成一个可用的 SylixOS 开发环境搭建，并通过统一的 CLI 完成编译和部署工作流。

## Current Milestone: v2.0 编译与部署

**Goal:** 为 sydev 增加工程编译调度和产物上传功能，将工具从环境初始化扩展到日常开发工作流。

**Target features:**
- 工程编译调度（扫描 workspace 工程、单个/全部编译、进度显示、错误汇总）
- 产物上传（解析 .reproject XML、FTP 上传到目标设备）
- 编译和部署配置跟随 workspace 存储（非全局）

## Requirements

### Validated

- ✓ 自动检查 RealEvo-Stream 工具链和 rl 命令可用性 — v1.0
- ✓ 环境检查失败时提供清晰错误提示和修复建议 — v1.0
- ✓ 交互式向导配置 workspace/项目/设备参数 — v1.0
- ✓ 输入验证和即时错误提示 — v1.0
- ✓ 实时进度反馈（步骤、百分比、成功/失败提示） — v1.0
- ✓ --help 帮助信息和使用示例 — v1.0
- ✓ 清晰子命令结构（workspace/project/device/template） — v1.0
- ✓ 保存/列出/应用/删除配置模板（四种类型） — v1.0
- ✓ JSON 配置导入导出 — v1.0
- ✓ 单命令从配置文件完成全流程初始化 — v1.0

### Active

- [ ] 扫描 workspace 子目录识别工程列表
- [ ] 编译单个工程（进入工程目录执行 make all）
- [ ] 编译全部工程（批量编译 + 进度显示 + 错误汇总）
- [ ] 解析 .reproject XML 获取设备名和上传路径映射
- [ ] 替换 $(WORKSPACE_工程名) 变量为实际工程路径
- [ ] 匹配 sydev device 配置获取 FTP 连接信息
- [ ] FTP 上传产物到目标设备
- [ ] 编译/部署配置存储在 workspace 目录下

### Out of Scope

- Web UI — v1.0 曾实现但已移除，CLI 足以满足核心需求
- 代码编辑功能 — 专注于环境初始化，不做 IDE
- 实时构建监听（watch mode） — 不做文件监听自动编译，手动触发即可
- 设备固件管理 — 仅管理设备连接信息，不涉及固件烧录
- 多人协作功能 — 专注单用户本地使用

## Context

已发布 v1.0 (npm: @haawpc/sydev@0.2.4)，3,913 行 TypeScript。
技术栈：Node.js + TypeScript，Monorepo（apps/cli + packages/core）。
CLI 框架：Commander.js，交互：Inquirer 11.x，验证：Zod。
模板存储：全局目录 ~/.sydev/templates/。
已发布到 npm 和 GitHub。
v2.0 新增编译和部署功能，绕过 rl 命令直接调用 make，部署通过 FTP 上传。
编译/部署配置跟随 workspace 存储，不放全局目录。
.reproject 是 XML 格式（GB2312 编码），包含设备名、上传路径映射、构建输出路径等。

## Constraints

- **技术栈**: Node.js + TypeScript，ESM 模块
- **兼容性**: 必须兼容 RealEvo-Stream 现有的 rl 命令和配置文件格式
- **性能**: CLI 单命令初始化应在 2 分钟内完成（不含 Base 编译时间）
- **依赖**: 依赖 RealEvo-Stream 工具链已安装

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CLI-only（移除 Web UI） | Web UI 增加复杂度但核心用户更偏好 CLI 自动化 | ✓ Good — 大幅简化代码和维护 |
| 混合执行方式（直接操作 + rl 调用） | 直接操作配置文件提升速度，必要时调用 rl 保证兼容性 | ✓ Good |
| 模板系统支持四种类型 | 环境、项目、设备、全流程模板覆盖所有使用场景 | ✓ Good |
| Monorepo 架构（apps/cli + packages/core） | CLI 和未来扩展共享核心逻辑 | ✓ Good |
| 全局模板目录 ~/.sydev/templates/ | 跨项目共享模板，不污染项目目录 | ✓ Good |
| Zod 配置验证 | 类型安全 schema，自动类型推导，清晰错误信息 | ✓ Good |
| EventEmitter 进度报告 | 解耦事件驱动，支持多监听器 | ✓ Good |
| 中文错误信息和修复建议 | 面向中文用户，提供可操作的修复指导 | ✓ Good |

| 绕过 rl 编译，直接调用 make | rl 编译体验差、严重依赖工程结构，make all 更直接可控 | — Pending |
| 编译/部署配置跟随 workspace | 每个 workspace 工程组合和部署目标不同，全局配置不适用 | — Pending |
| FTP 部署而非 rl deploy | rl 部署命令不好用，直接解析 .reproject + FTP 更可靠 | — Pending |

---
*Last updated: 2026-03-17 after v2.0 milestone start*
