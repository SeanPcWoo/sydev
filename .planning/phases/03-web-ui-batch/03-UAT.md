---
status: testing
phase: 03-web-ui-batch
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md
started: 2026-03-16T00:24:00+08:00
updated: 2026-03-16T00:28:00+08:00
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  运行 `sydev web`（或 `pnpm --filter @sydev/cli exec tsx src/index.ts web`）启动服务器。
  服务器在端口 3456 启动无报错，终端显示监听信息。
  浏览器访问 http://localhost:3456/api/health 返回正常响应。
  前端页面（如通过 Vite dev server）能正常加载，显示侧边栏布局。
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: 运行 `sydev web` 启动服务器，端口 3456 无报错，/api/health 返回正常，前端页面加载显示侧边栏布局
result: issue
reported: "http://localhost:3456/api/health ok，但 http://localhost:3456 提示 Cannot GET /"
severity: major
fix: web 命令未传 staticDir 给 createWebServer，已修复（传入 apps/web/dist 路径）

### 2. Sidebar Navigation
expected: 侧边栏显示 4 个导航项（配置/状态/模板/批量操作），点击各项切换到对应页面，URL 路由正确变化
result: [pending]

### 3. Workspace Config Form
expected: 配置页面 Workspace Tab 显示完整表单（平台按架构分组、版本选择、createbase/build 复选框等），填写后提交调用 API
result: [pending]

### 4. Project Config Form
expected: 配置页面 Project Tab 显示表单（8 种模板 + 8 种构建类型选择、Git 源码导入字段），填写后提交调用 API
result: [pending]

### 5. Device Config Form
expected: 配置页面 Device Tab 显示表单（IPv4 验证、4 个端口字段自动转数字、密码字段），失焦时字段级验证生效
result: [pending]

### 6. Status Dashboard
expected: 状态页面显示三个卡片（Workspace/Projects/Devices），有数据时展示详情，无数据时显示空状态和跳转链接，刷新按钮可用
result: [pending]

### 7. Template List & Create
expected: 模板页面显示卡片网格列表（按类型颜色标签区分），点击创建按钮弹出对话框，填写名称和 JSON 配置后保存成功
result: [pending]

### 8. Template Edit & Delete
expected: 点击模板卡片编辑按钮弹出编辑对话框（预填已有值），修改后保存成功；点击删除按钮删除模板，列表更新
result: [pending]

### 9. Template Import (JSON Upload)
expected: 模板页面支持拖拽或点击上传 JSON 文件，解析后预览内容和名称，确认后保存为新模板
result: [pending]

### 10. Template Export (JSON Download)
expected: 点击模板卡片导出按钮，浏览器下载该模板的 JSON 文件
result: [pending]

### 11. Batch Project Creation
expected: 批量操作页面 Tabs 切换项目/设备，逐个添加项目到列表，点击执行后 WebSocket 实时显示每个项目的进度状态
result: [pending]

### 12. Batch Failure & Retry
expected: 批量执行中某项失败时跳过继续执行其余项，最后汇总失败项，失败项旁显示重试按钮
result: [pending]

### 13. CLI Export Panel
expected: 导出面板提供两个功能：下载 FullConfig JSON 文件 + 复制 `sydev init --config <path>` 命令到剪贴板
result: [pending]

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0

## Gaps

[none yet]
