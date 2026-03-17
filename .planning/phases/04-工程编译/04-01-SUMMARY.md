---
phase: 04-工程编译
plan: "01"
subsystem: build
tags: [make, bear, child_process, spawn, workspace-scanner, build-runner, typescript]

requires: []
provides:
  - WorkspaceScanner class — 扫描 workspace 一级子目录，过滤 .project + Makefile 工程
  - BuildRunner class — bear/make 子进程编译器，含 WORKSPACE_ 环境变量注入和进度事件
  - BuildProgressEvent 联合类型 — project-start / project-done / stdout-line / warning
affects:
  - 05-CLI-build命令
  - 任何需要批量编译工程的功能

tech-stack:
  added: []
  patterns:
    - "EventEmitter pattern: BuildRunner extends EventEmitter, emit('progress', BuildProgressEvent)"
    - "bear 降级模式: checkBear() via which，不可用时 emit warning 并降级为 make"
    - "WORKSPACE_ env 注入: WORKSPACE_<PROJECT_NAME_UPPER> = project.path，附加到 process.env"

key-files:
  created:
    - packages/core/src/workspace-scanner.ts
    - packages/core/src/build-runner.ts
  modified:
    - packages/core/src/index.ts

key-decisions:
  - "BuildRunner 直接使用 child_process.spawn 而非 executeRlCommand，原因：需要流式输出"
  - "批量编译默认 quiet=true，verbose=true 时透传 stdout-line 事件"
  - "SIGINT 处理：监听 process.SIGINT，kill 子进程后 reject Promise，让 CLI 层处理"

patterns-established:
  - "子进程编译模式: spawn + stdout pipe + line-by-line emit，cwd = project.path"
  - "错误摘要提取: stdout+stderr 合并后过滤 /error:/i，取前 10 条"

requirements-completed: [BUILD-01, BUILD-04, BUILD-05, BUILD-06]

duration: 2min
completed: 2026-03-17
---

# Phase 4 Plan 01: 工程扫描与编译执行器 Summary

**WorkspaceScanner + BuildRunner 实现工程目录扫描、WORKSPACE_ 环境变量注入和 bear/make 子进程编译，通过 EventEmitter emit 批量进度事件**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T06:09:36Z
- **Completed:** 2026-03-17T06:11:42Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- WorkspaceScanner.scan() 扫描一级子目录，跳过隐藏目录和构建输出目录，只返回含 .project + Makefile 的工程
- BuildRunner 实现 checkBear()/buildEnv()/buildOne()/buildAll()，支持 bear 降级、WORKSPACE_ 注入、流式 stdout 事件
- @sydev/core index.ts 导出 WorkspaceScanner、BuildRunner 及全部相关类型，0 个 TS 编译错误

## Task Commits

1. **Task 1: WorkspaceScanner** - `850af98` (feat)
2. **Task 2: BuildRunner** - `8143788` (feat)
3. **Task 3: index.ts 导出** - `bdda543` (feat)

## Files Created/Modified

- `packages/core/src/workspace-scanner.ts` - WorkspaceScanner 类，扫描工程目录
- `packages/core/src/build-runner.ts` - BuildRunner 类，make/bear 子进程执行器
- `packages/core/src/index.ts` - 追加导出 WorkspaceScanner 和 BuildRunner 的所有类型

## Decisions Made

- BuildRunner 直接使用 child_process.spawn 而非 executeRlCommand，因为需要流式输出（实时 stdout-line 事件）
- 批量编译默认 quiet=true，只有 verbose=true 时才透传 stdout-line 事件
- SIGINT 处理在 buildOne 层：kill 子进程后 reject，由 CLI 层决定如何展示中断信息

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WorkspaceScanner 和 BuildRunner 已就绪，CLI build 命令可直接调用
- BuildProgressEvent 类型完整定义，CLI 层只需 on('progress', handler) 处理展示逻辑

---
*Phase: 04-工程编译*
*Completed: 2026-03-17*
