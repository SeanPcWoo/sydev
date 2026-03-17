# Roadmap: SylixOS 开发环境快速部署工具

**Created:** 2026-03-14

## Milestones

- ✅ **v1.0 MVP** — Phases 1-3 (shipped 2026-03-17)
- 🚧 **v2.0 编译与部署** — Phases 4-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-3) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: CLI 核心功能 (9/9 plans) — completed 2026-03-14
- [x] Phase 2: 模板与配置系统 (3/3 plans) — completed 2026-03-15
- [x] Phase 3: Web UI 与批量操作 (5/5 plans) — completed 2026-03-15 (code later removed)

</details>

### 🚧 v2.0 编译与部署 (In Progress)

- [ ] **Phase 4: 工程编译** — 用户可以扫描、编译 workspace 中的工程并获得清晰的进度和错误反馈
- [ ] **Phase 5: 产物上传** — 用户可以解析部署配置并通过 FTP 上传编译产物到目标设备
- [ ] **Phase 6: 工作流配置** — 用户可以定义编译流水线和命名上传目标，配置持久化到 workspace

## Phase Details

### Phase 4: 工程编译
**Goal**: 用户可以通过 sydev build 命令编译 workspace 中的工程，获得实时进度和错误汇总
**Depends on**: Phase 3 (v1.0 基础设施)
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-09
**Success Criteria** (what must be TRUE):
  1. 用户在 workspace 目录运行 sydev build 可以看到自动识别的工程列表
  2. 用户运行 `sydev build <工程名>` 可以编译指定工程并看到实时输出
  3. 用户运行 `sydev build --all` 可以批量编译所有工程，看到逐个工程的进度状态
  4. 编译完成后用户可以看到错误汇总（哪些工程失败、失败原因）
  5. 编译过程自动注入所有 WORKSPACE_工程名 环境变量，无需用户手动配置
  6. 用户运行 `sydev build init` 可以生成/更新 workspace 总 Makefile，脱离 sydev 也能直接 make 编译
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Core build engine: WorkspaceScanner + BuildRunner in @sydev/core
- [ ] 04-02-PLAN.md — CLI build command: interactive/single/--all + build init Makefile generation

### Phase 5: 产物上传
**Goal**: 用户可以通过 sydev upload 命令将编译产物上传到目标设备
**Depends on**: Phase 4
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04, UPLOAD-05, UPLOAD-06
**Success Criteria** (what must be TRUE):
  1. 用户运行 `sydev upload <工程名>` 可以将指定工程产物上传到对应设备
  2. 用户运行 `sydev upload --all` 可以批量上传所有工程产物
  3. 上传路径从 .reproject XML 自动解析，$(WORKSPACE_工程名) 变量自动替换为实际路径
  4. FTP 连接信息从 sydev device 配置自动匹配，无需重复输入
  5. 上传过程显示进度和结果汇总（成功/失败/跳过）
**Plans**: TBD

### Phase 6: 工作流配置
**Goal**: 用户可以定义可复用的编译流水线和命名上传目标，配置持久化到 workspace
**Depends on**: Phase 4, Phase 5
**Requirements**: BUILD-07, BUILD-08, UPLOAD-07, UPLOAD-08
**Success Criteria** (what must be TRUE):
  1. 用户可以定义编译流水线（指定工程编译顺序和编译后动作如 cp 产物）
  2. 用户可以保存命名的上传目标（一条命令批量上传指定工程组合到指定设备）
  3. 流水线配置和上传目标配置保存在 workspace 目录下，跟随项目而非全局
  4. 用户可以通过一条命令执行完整的编译+部署流程
**Plans**: TBD

## Progress

**Execution Order:** Phases 4 → 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. CLI 核心功能 | v1.0 | 9/9 | Complete | 2026-03-14 |
| 2. 模板与配置系统 | v1.0 | 3/3 | Complete | 2026-03-15 |
| 3. Web UI 与批量操作 | v1.0 | 5/5 | Complete (removed) | 2026-03-15 |
| 4. 工程编译 | v2.0 | 0/2 | In progress | - |
| 5. 产物上传 | v2.0 | 0/? | Not started | - |
| 6. 工作流配置 | v2.0 | 0/? | Not started | - |

---
*Last updated: 2026-03-17 after phase 4 planning*
