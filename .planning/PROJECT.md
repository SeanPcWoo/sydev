# SylixOS 开发环境快速部署工具

## What This Is

一个支持 Web 和 CLI 的 SylixOS 开发环境初始化工具，通过配置模板和智能化流程，帮助开发者快速搭建 RealEvo-Stream 开发环境。工具面向新手和经验开发者，提供可视化配置界面和命令行自动化能力，大幅简化 workspace、Base、项目、设备的初始化流程。

## Core Value

开发者能够在 5 分钟内从零开始完成一个可用的 SylixOS 开发环境搭建，包括 workspace 初始化、项目创建和设备配置。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 用户可以通过 Web 界面可视化配置 workspace 参数（Base 版本、平台、构建选项）
- [ ] 用户可以通过 Web 界面可视化配置项目参数（名称、类型、模板）
- [ ] 用户可以通过 Web 界面可视化配置设备连接信息（IP、端口、凭证）
- [ ] 用户可以创建、编辑、保存配置模板（环境模板、项目模板、设备模板、全流程模板）
- [ ] 用户可以导入和导出配置模板（JSON 格式）
- [ ] 用户可以在 Web 界面查看当前环境状态（workspace、项目列表、设备列表）
- [ ] 用户可以从 Web 界面导出 CLI 配置文件
- [ ] 用户可以通过 CLI 从配置文件一键初始化完整环境
- [ ] 用户可以通过 CLI 交互式向导逐步配置环境
- [ ] 用户可以通过 CLI 单条命令完成全流程初始化
- [ ] 用户可以通过 CLI 管理配置模板（列表、应用、删除）
- [ ] 工具能够智能判断何时直接操作配置文件、何时调用 rl 命令，优化执行速度
- [ ] 工具能够并行执行独立的初始化步骤（如多个项目创建）
- [ ] 工具提供清晰的进度反馈和错误提示

### Out of Scope

- 代码编辑功能 — 专注于环境初始化，不做 IDE
- 实时构建和调试 — 初始化完成后由 RealEvo-Stream 原生工具处理
- 设备固件管理 — 仅管理设备连接信息，不涉及固件烧录
- 多人协作功能 — v1 专注单用户本地使用

## Context

**技术背景：**
- RealEvo-Stream 提供 `rl` 命令行工具用于 SylixOS 开发环境管理
- 核心命令包括：`rl-workspace`（工作空间）、`rl-project`（项目）、`rl-device`（设备）、`rl-build`（构建）
- 配置存储在 `.realevo` 目录和 `.rlproject` 目录中
- 支持多种项目类型：C/C++（cmake/realevo）、Python、Cython、JavaScript、Go、ROS2
- 支持多种平台：ARM64_GENERIC、X86_64 等

**现有问题：**
- 现有 sylixos-dev skill 初始化流程长，需要多次交互
- 配置不够灵活，缺少预设模板
- 常见场景需要重复配置
- rl 命令执行较慢

**用户需求：**
- 新手需要引导式配置，避免参数错误
- 经验开发者需要快速复用配置，批量操作
- 团队需要标准化的环境配置模板

## Constraints

- **技术栈**:
  - Web: 现代前端框架（React/Vue/Svelte），后端 Node.js 或 Python
  - CLI: Node.js 或 Python，确保跨平台兼容
- **兼容性**: 必须兼容 RealEvo-Stream 现有的 rl 命令和配置文件格式
- **性能**: CLI 单命令初始化应在 2 分钟内完成（不含 Base 编译时间）
- **依赖**: 依赖 RealEvo-Stream 工具链已安装

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 支持 Web + CLI 双模式 | Web 适合新手和可视化配置，CLI 适合自动化和批量操作 | — Pending |
| 混合执行方式（直接操作 + rl 调用） | 直接操作配置文件提升速度，必要时调用 rl 保证兼容性 | — Pending |
| 模板系统支持四种类型 | 环境、项目、设备、全流程模板覆盖所有使用场景 | — Pending |

---
*Last updated: 2026-03-14 after initialization*
