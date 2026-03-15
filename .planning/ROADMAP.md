# Roadmap: SylixOS 开发环境快速部署工具

**Created:** 2026-03-14
**Granularity:** Coarse (3-5 phases)
**Mode:** YOLO

## Phases

- [x] **Phase 1: CLI 核心功能** - 可工作的 CLI 工具，支持基本初始化、环境检查、交互式向导 (completed 2026-03-14)
- [ ] **Phase 2: 模板与配置系统** - 模板系统、配置导入导出、单命令快速初始化
- [ ] **Phase 3: Web UI 与批量操作** - Web 可视化界面、批量操作、性能优化

## Phase Details

### Phase 1: CLI 核心功能
**Goal**: 用户可以通过 CLI 交互式向导完成 workspace、项目、设备的初始化，并获得清晰的进度反馈和错误提示

**Depends on**: Nothing (first phase)

**Requirements**: CLI-ENV-01, CLI-ENV-02, CLI-ENV-03, CLI-WIZARD-01, CLI-WIZARD-02, CLI-WIZARD-03, CLI-WIZARD-04, CLI-FEEDBACK-01, CLI-FEEDBACK-02, CLI-FEEDBACK-03, CLI-HELP-01, CLI-HELP-02, CLI-HELP-03, CLI-STRUCT-01, CLI-STRUCT-02

**Success Criteria** (what must be TRUE):
1. 用户运行工具时自动检查 RealEvo-Stream 工具链和 rl 命令，环境问题时收到清晰的错误提示和修复建议
2. 用户可以通过交互式向导逐步配置 workspace、项目、设备参数，输入错误时立即收到验证提示
3. 用户在初始化过程中看到实时进度反馈（当前步骤、进度百分比），每个步骤完成时看到成功提示
4. 用户在操作失败时看到清晰的错误信息和堆栈跟踪
5. 用户可以通过 --help 查看所有命令的帮助信息和使用示例
6. 用户可以使用清晰的子命令结构（workspace、project、device）完成操作

**Plans:** 9 plans

Plans:
- [x] 01-01-PLAN.md — 项目 Monorepo 基础架构和环境健康检查
- [x] 01-02-PLAN.md — 核心业务逻辑（配置管理器、rl 包装器、进度报告器）
- [x] 01-03-PLAN.md — CLI 框架和帮助系统
- [x] 01-04-PLAN.md — 交互式向导（workspace、project、device）
- [x] 01-05-PLAN.md — Shell 命令自动补全
- [x] 01-06-PLAN.md — 修复环境检查器命令检测和错误消息（gap closure）
- [x] 01-07-PLAN.md — 重构 Project 创建向导（gap closure）
- [x] 01-08-PLAN.md — 修复 Device 配置向导（gap closure）
- [ ] 01-09-PLAN.md — 修复 workspace 路径传递（gap closure）

---

### Phase 2: 模板与配置系统
**Goal**: 用户可以保存和复用配置模板，通过单条命令从配置文件完成全流程初始化

**Depends on**: Phase 1

**Requirements**: CLI-TEMPLATE-01, CLI-TEMPLATE-02, CLI-TEMPLATE-03, CLI-TEMPLATE-04, CLI-CONFIG-01, CLI-CONFIG-02, CLI-CONFIG-03

**Success Criteria** (what must be TRUE):
1. 用户可以保存当前配置为模板（环境模板、项目模板、设备模板、全流程模板）
2. 用户可以列出所有已保存的配置模板，并从模板快速初始化环境
3. 用户可以删除不需要的配置模板
4. 用户可以将配置导出为 JSON 文件，并从 JSON 配置文件导入配置
5. 用户可以通过单条命令（如 `tool init --config config.json`）从配置文件完成全流程初始化

**Plans:** 2/3 plans executed

Plans:
- [x] 02-01-PLAN.md — Schema 定义 + TemplateManager CRUD 逻辑
- [ ] 02-02-PLAN.md — InitOrchestrator 全流程初始化编排器
- [ ] 02-03-PLAN.md — CLI 命令层（template 子命令 + init --config）

---

### Phase 3: Web UI 与批量操作
**Goal**: 用户可以通过 Web 界面可视化配置环境，查看状态，管理模板，并执行批量操作

**Depends on**: Phase 1, Phase 2

**Requirements**: WEB-CONFIG-01, WEB-CONFIG-02, WEB-CONFIG-03, WEB-CONFIG-04, WEB-STATUS-01, WEB-STATUS-02, WEB-STATUS-03, WEB-TEMPLATE-01, WEB-TEMPLATE-02, WEB-TEMPLATE-03, WEB-TEMPLATE-04, WEB-TEMPLATE-05, WEB-EXPORT-01, WEB-EXPORT-02, BATCH-01, BATCH-02, BATCH-03

**Success Criteria** (what must be TRUE):
1. 用户可以通过 Web 界面可视化配置 workspace、项目、设备参数，输入错误时立即看到验证提示
2. 用户可以在 Web 界面查看当前 workspace 状态、项目列表、设备列表
3. 用户可以在 Web 界面创建、编辑、导入、导出、删除配置模板
4. 用户可以从 Web 界面导出 CLI 配置文件和复制 CLI 命令
5. 用户可以通过配置文件一次性创建多个项目或配置多个设备，并看到每个操作的独立进度反馈

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CLI 核心功能 | 8/9 | In progress | - |
| 2. 模板与配置系统 | 2/3 | In Progress|  |
| 3. Web UI 与批量操作 | 0/0 | Not started | - |

---
*Last updated: 2026-03-15*
