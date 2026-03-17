# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-17
**Phases:** 3 | **Plans:** 17 | **Sessions:** ~10

### What Was Built
- CLI 环境健康检查（RealEvo-Stream 工具链检测、版本验证）
- 交互式配置向导（workspace/project/device 三大流程）
- 模板系统（四种类型：环境/项目/设备/全流程，CRUD + 导入导出）
- InitOrchestrator 全流程编排器（单命令初始化）
- 帮助系统和子命令结构
- Web UI（已实现后移除）

### What Worked
- Monorepo 架构（apps/cli + packages/core）使核心逻辑复用清晰
- Zod schema 验证贯穿全栈，类型安全且错误信息友好
- EventEmitter 进度报告解耦了 UI 层和业务逻辑
- 全局模板目录（~/.sydev/templates/）跨项目共享

### What Was Inefficient
- Phase 3 Web UI 完整实现后被移除，5 个 plan 的工作量浪费
- 应在规划阶段更早确认 Web UI 是否为核心需求
- Phase 1 有 4 个 gap closure plans（06-09），说明初始规划粒度不够

### Patterns Established
- 中文错误信息 + 具体修复建议命令
- slugify 保留中文字符用于模板 ID
- 全局配置目录 ~/.sydev/ 存储模板和用户数据

### Key Lessons
1. 在投入大量实现前，先验证功能是否真正需要（Web UI 教训）
2. Gap closure plans 说明初始 phase 规划需要更细致的 success criteria 验证
3. CLI 工具对目标用户群（SylixOS 开发者）已足够，不需要 Web UI

### Cost Observations
- Model mix: 主要 sonnet 执行，opus 规划
- Sessions: ~10 sessions over 3 days
- Notable: Phase 3 全部工作后被砍，约 30% 工作量浪费

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~10 | 3 | 首次里程碑，建立基础流程 |

### Top Lessons (Verified Across Milestones)

1. 先验证需求再大量实现，避免整个 phase 被砍
