---
phase: 01-cli-core
plan: 09
subsystem: cli-wizards
tags: [bugfix, gap-closure, uat-fix, cwd-parameter]
dependency_graph:
  requires: [01-07, 01-08]
  provides: [workspace-path-propagation]
  affects: [project-wizard, device-wizard, rl-wrapper]
tech_stack:
  added: []
  patterns: [parameter-passing, working-directory-control]
key_files:
  created: []
  modified:
    - packages/core/src/rl-wrapper.ts
    - apps/cli/src/wizards/project-wizard.ts
    - apps/cli/src/wizards/device-wizard.ts
decisions:
  - "Add cwd as optional parameter to ProjectCreateOptions and DeviceAddOptions interfaces"
  - "Pass config.cwd to executeRlCommand in both createProject() and addDevice() methods"
  - "Propagate user-selected workspace path from wizards to RlWrapper methods"
metrics:
  duration_seconds: 63
  tasks_completed: 3
  files_modified: 3
  commits: 3
  completed_date: "2026-03-15"
requirements_completed: [CLI-WIZARD-02, CLI-WIZARD-03]
---

# Phase 01 Plan 09: 修复 workspace 路径传递问题

**一句话总结:** 为 RlWrapper 方法添加 cwd 参数并在向导中正确传递，确保 rl 命令在用户指定的 workspace 目录下执行

## 执行概览

**目标:** 解决 UAT 测试中 "Go to the workspace directory and run this command" 错误，使向导收集的 workspace 路径真正生效。

**结果:** 成功为 `ProjectCreateOptions` 和 `DeviceAddOptions` 接口添加 `cwd?: string` 字段，修改 `createProject()` 和 `addDevice()` 方法将 cwd 传递给 `executeRlCommand()`，并更新两个向导正确传递用户选择的路径。

## 任务执行记录

| 任务 | 名称 | 提交 | 文件 |
|------|------|------|------|
| 1 | 为 RlWrapper 方法添加 cwd 参数 | 3343a06 | packages/core/src/rl-wrapper.ts |
| 2 | 更新 project-wizard 传递 cwd 参数 | 1184487 | apps/cli/src/wizards/project-wizard.ts |
| 3 | 更新 device-wizard 传递 cwd 参数 | 1466697 | apps/cli/src/wizards/device-wizard.ts |

## 实现细节

### Task 1: 为 RlWrapper 方法添加 cwd 参数

**修改内容:**
- 在 `ProjectCreateOptions` 接口添加 `cwd?: string` 字段
- 在 `DeviceAddOptions` 接口添加 `cwd?: string` 字段
- 修改 `createProject()` 方法，将 `config.cwd` 作为第 4 个参数传递给 `executeRlCommand('rl-project', ...)`
- 修改 `addDevice()` 方法，将 `config.cwd` 作为第 4 个参数传递给 `executeRlCommand('rl-device', ...)`

**关键代码变更:**
```typescript
// Line 101: ProjectCreateOptions 接口
export interface ProjectCreateOptions {
  // ... existing fields
  cwd?: string;  // 新增
}

// Line 114: DeviceAddOptions 接口
export interface DeviceAddOptions {
  // ... existing fields
  cwd?: string;  // 新增
}

// Line 155: createProject 方法
const result = await executeRlCommand('rl-project', args, this.progressReporter, config.cwd);

// Line 178: addDevice 方法
const result = await executeRlCommand('rl-device', args, this.progressReporter, config.cwd);
```

### Task 2: 更新 project-wizard 传递 cwd 参数

**修改内容:**
- 在 `runProjectWizard()` 函数中调用 `createProject()` 时，添加 `cwd: phase1.cwd` 字段

**关键代码变更:**
```typescript
// Line 244-252
const result = await rlWrapper.createProject({
  name: config.name,
  template: config.template,
  type: config.type,
  source: config.source,
  branch: config.branch,
  debugLevel: config.debugLevel,
  makeTool: config.makeTool,
  cwd: phase1.cwd  // 新增：传递用户选择的 workspace 路径
});
```

### Task 3: 更新 device-wizard 传递 cwd 参数

**修改内容:**
- 在 `runDeviceWizard()` 函数中调用 `addDevice()` 时，添加 `cwd: answers.cwd` 字段

**关键代码变更:**
```typescript
// Line 183-193
const result = await rlWrapper.addDevice({
  name: config.name,
  ip: config.ip,
  platform: config.platform,
  ssh: config.ssh,
  telnet: config.telnet,
  ftp: config.ftp,
  gdb: config.gdb,
  username: config.username,
  password: config.password,
  cwd: answers.cwd  // 新增：传递用户选择的 workspace 路径
});
```

## 验证结果

### 类型系统验证
- ✅ TypeScript 编译通过，无类型错误
- ✅ 所有接口定义正确包含 cwd 字段

### 测试套件验证
- ✅ 所有 37 个单元测试通过
- ✅ 无回归问题

### 代码路径验证
```bash
# 接口定义包含 cwd
17:  cwd?: string (executeRlCommand 参数)
101:  cwd?: string; (ProjectCreateOptions)
114:  cwd?: string; (DeviceAddOptions)

# createProject 传递 cwd
155:    const result = await executeRlCommand('rl-project', args, this.progressReporter, config.cwd);

# addDevice 传递 cwd
178:    const result = await executeRlCommand('rl-device', args, this.progressReporter, config.cwd);

# project-wizard 传递 cwd
252:    cwd: phase1.cwd

# device-wizard 传递 cwd
193:    cwd: answers.cwd
```

## 偏差记录

无偏差 — 计划完全按照预期执行。

## UAT 影响

**修复的问题:**
- ✅ UAT Test 6 (Project Create) 的 "Go to the workspace directory and run this command" 错误将被解决
- ✅ UAT Test 7 (Device Add) 的 "Go to the workspace directory and run this command" 错误将被解决

**预期行为:**
- 用户在向导中选择 workspace 路径后，`rl-project` 和 `rl-device` 命令将在该路径下执行
- 用户不再需要手动切换到 workspace 目录
- 向导收集的路径信息真正生效

## 关键决策

1. **使用可选参数而非必需参数:** `cwd?: string` 设计为可选字段，保持向后兼容性，未传递时 `executeRlCommand()` 使用当前工作目录
2. **在接口层面添加字段:** 在 Options 接口中添加 cwd 字段，而非在方法签名中添加额外参数，保持 API 一致性
3. **复用现有 executeRlCommand 参数:** `executeRlCommand()` 已支持 cwd 参数（第 4 个参数），无需修改底层实现

## 后续工作

1. 重新运行 UAT 测试验证修复效果
2. 如果 UAT 全部通过，Phase 01 可以标记为完成
3. 考虑为 workspace-wizard 添加类似的 cwd 参数传递（如果需要）

## Self-Check: PASSED

验证所有声明的文件和提交：

```bash
# 文件存在性检查
FOUND: packages/core/src/rl-wrapper.ts
FOUND: apps/cli/src/wizards/project-wizard.ts
FOUND: apps/cli/src/wizards/device-wizard.ts

# 提交存在性检查
FOUND: 3343a06 (feat(01-09): add cwd parameter to RlWrapper methods)
FOUND: 1184487 (feat(01-09): pass cwd to createProject in project-wizard)
FOUND: 1466697 (feat(01-09): pass cwd to addDevice in device-wizard)
```

所有文件已修改，所有提交已创建，计划执行完成。
