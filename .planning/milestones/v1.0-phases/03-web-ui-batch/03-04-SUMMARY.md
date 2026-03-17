---
phase: 03-web-ui-batch
plan: 04
subsystem: web
tags: [react, express, template, crud, dialog, radix-ui, file-upload]

# Dependency graph
requires:
  - phase: 03-web-ui-batch
    provides: "Express API skeleton, React+Vite+shadcn/ui scaffold, sidebar layout"
  - phase: 01-cli-core
    provides: "TemplateManager CRUD, templateContentSchema validation"
provides:
  - "Template CRUD API endpoints (7 routes)"
  - "Template management page with card grid"
  - "Template create/edit dialog with JSON editor"
  - "Template import via JSON file upload (drag-and-drop)"
  - "Template export as JSON download"
affects: [03-web-ui-batch]

# Tech tracking
tech-stack:
  added: [@radix-ui/react-dialog]
  patterns: [Dialog component pattern, card grid layout, file upload with drag-and-drop]

key-files:
  created:
    - packages/core/src/api-routes.ts
    - apps/web/src/components/ui/dialog.tsx
    - apps/web/src/components/template/TemplateGrid.tsx
    - apps/web/src/components/template/TemplateEditDialog.tsx
    - apps/web/src/components/template/TemplateImport.tsx
    - apps/web/src/pages/TemplatePage.tsx
  modified:
    - apps/web/src/App.tsx

key-decisions:
  - "Import route registered before :id routes to avoid Express param conflict"
  - "JSON textarea for template config data (simpler than per-type forms)"
  - "registerApiRoutes accepts optional cwd for TemplateManager base directory"

patterns-established:
  - "API route pattern: try/catch with error message inspection for status codes"
  - "Page pattern: top action bar + grid content + dialog overlays"

requirements-completed: [WEB-TEMPLATE-01, WEB-TEMPLATE-02, WEB-TEMPLATE-03, WEB-TEMPLATE-04, WEB-TEMPLATE-05]

# Metrics
duration: 7min
completed: 2026-03-15
---

# Phase 03 Plan 04: 模板管理界面 Summary

**模板 CRUD API 7 端点 + 卡片网格列表 + 创建/编辑对话框 + JSON 文件拖拽导入 + 导出下载**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-15T14:31:55Z
- **Completed:** 2026-03-15T14:39:47Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- 7 个模板 API 端点实现（列表、创建、读取、更新、删除、导入、导出）
- 模板卡片网格列表，按类型颜色标签区分（蓝/绿/橙/紫）
- 创建/编辑对话框，JSON textarea 编辑配置数据
- 拖拽/点击上传 JSON 文件导入模板，带预览和名称修改
- 导出下载 JSON 文件（Content-Disposition header）
- 类型过滤 Select 筛选模板列表

## Task Commits

Each task was committed atomically:

1. **Task 1: 模板 CRUD API 端点实现** - `7329544` (feat)
2. **Task 2: 模板管理页面 + 卡片网格 + 编辑对话框 + 导入组件** - `33d0ddc` (feat)

## Files Created/Modified
- `packages/core/src/api-routes.ts` - 模板 CRUD 7 端点 + 导入验证 + 导出下载
- `apps/web/src/components/ui/dialog.tsx` - shadcn/ui Dialog 组件（radix-ui）
- `apps/web/src/components/template/TemplateGrid.tsx` - 卡片网格列表，类型标签，操作按钮
- `apps/web/src/components/template/TemplateEditDialog.tsx` - 创建/编辑对话框，JSON textarea
- `apps/web/src/components/template/TemplateImport.tsx` - 拖拽上传 JSON 文件导入
- `apps/web/src/pages/TemplatePage.tsx` - 模板管理页面，状态管理，CRUD 操作
- `apps/web/src/App.tsx` - /templates 路由指向 TemplatePage
- `apps/web/package.json` - 添加 @radix-ui/react-dialog 依赖

## Decisions Made
- Import 路由注册在 :id 路由之前，避免 Express 将 "import" 当作 id 参数
- 模板配置数据使用 JSON textarea 编辑（比按类型渲染表单更简洁通用）
- registerApiRoutes 接受可选 cwd 参数，用于 TemplateManager 基目录

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 模板管理界面完整可用，支持全部 CRUD + 导入导出
- Dialog 组件可复用于后续批量操作等页面
- API 路由模式（try/catch + 状态码映射）可复用于其他端点实现

---
*Phase: 03-web-ui-batch*
*Completed: 2026-03-15*

## Self-Check: PASSED

- All 7 key files verified present
- Commit 7329544 (Task 1) verified
- Commit 33d0ddc (Task 2) verified
