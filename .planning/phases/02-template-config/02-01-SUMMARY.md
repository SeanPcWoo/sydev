---
phase: 02-template-config
plan: 01
subsystem: template
tags: [zod, template, schema, crud, vitest]

requires:
  - phase: 01-cli-core
    provides: "zod schemas (workspace/project/device), ConfigManager, project structure"
provides:
  - "TemplateManager class with save/list/load/delete/exists/slugify"
  - "templateContentSchema (discriminatedUnion for 4 template types)"
  - "fullConfigSchema with schemaVersion for config import/export"
  - "templateMetaSchema, templateIndexSchema for index validation"
affects: [02-template-config, 03-web-ui]

tech-stack:
  added: []
  patterns: ["TDD for core business logic", "discriminatedUnion for type-safe template content", "slug-based ID with Chinese character support"]

key-files:
  created:
    - packages/core/src/schemas/template-schema.ts
    - packages/core/src/schemas/full-config-schema.ts
    - packages/core/src/template-manager.ts
    - packages/core/src/template-manager.test.ts
  modified:
    - packages/core/src/schemas/index.ts
    - packages/core/src/index.ts

key-decisions:
  - "fullConfigSchema 独立文件，template-schema 通过 import 引用"
  - "slugify 保留中文字符用于模板 ID"
  - "load() 自动清理孤立索引条目（内容文件丢失时）"
  - "save() 支持覆盖已有同 ID 模板，保留 createdAt"

patterns-established:
  - "discriminatedUnion pattern: type 字段区分不同 schema 变体"
  - "index.json + {id}.json 双文件模板存储模式"

requirements-completed: [CLI-TEMPLATE-01, CLI-TEMPLATE-02, CLI-TEMPLATE-04, CLI-CONFIG-01, CLI-CONFIG-02]

duration: 2min
completed: 2026-03-15
---

# Phase 2 Plan 1: Template Schema + TemplateManager Summary

**Zod schema 定义四种模板类型 (workspace/project/device/full) + TemplateManager CRUD 操作 + fullConfigSchema 完整配置验证**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T10:33:16Z
- **Completed:** 2026-03-15T10:35:42Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 6

## Accomplishments
- template-schema.ts 定义 templateContentSchema (discriminatedUnion) 验证四种模板内容
- full-config-schema.ts 定义 fullConfigSchema 含 schemaVersion 默认值 1
- TemplateManager 实现 save/list/load/delete/exists/slugify 全部 CRUD 操作
- 15 个单元测试全部通过，覆盖所有 behavior 用例

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Schema + 失败测试** - `8212980` (test)
2. **Task 1 GREEN: TemplateManager 实现** - `dfe257b` (feat)

## Files Created/Modified
- `packages/core/src/schemas/template-schema.ts` - 模板类型/元数据/索引/内容 schema
- `packages/core/src/schemas/full-config-schema.ts` - 完整配置 schema (schemaVersion + workspace + projects + devices)
- `packages/core/src/schemas/index.ts` - 新增 template/fullConfig schema 导出
- `packages/core/src/template-manager.ts` - TemplateManager 类，模板 CRUD 操作
- `packages/core/src/template-manager.test.ts` - 15 个单元测试
- `packages/core/src/index.ts` - 新增 TemplateManager 和 schema 导出

## Decisions Made
- fullConfigSchema 放在独立文件 full-config-schema.ts，template-schema.ts 通过 import 引用，避免循环依赖
- slugify 保留中文字符 (\u4e00-\u9fff)，适配中文用户的模板命名习惯
- load() 发现内容文件丢失时自动清理索引中的孤立条目
- save() 对已存在的同 ID 模板执行覆盖更新，保留原始 createdAt

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TemplateManager 和所有 schema 已就绪，可供 02-02 (InitOrchestrator) 和 02-03 (CLI template 命令) 使用
- fullConfigSchema 可用于 `sydev init --config` 的配置验证

---
*Phase: 02-template-config*
*Completed: 2026-03-15*

## Self-Check: PASSED

All 7 files found. All 2 commits verified.
