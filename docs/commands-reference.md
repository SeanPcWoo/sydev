# sydev 命令参考指南 — SKILL 开发者手册

## 文件位置
- **主 README**: `/home/sean/project/sydev/README.md`
- **命令实现**:
  - `apps/cli/src/commands/workspace.ts`
  - `apps/cli/src/commands/project.ts`
  - `apps/cli/src/commands/build.ts`
  - `apps/cli/src/commands/clean.ts`
  - `apps/cli/src/commands/rebuild.ts`
  - `apps/cli/src/commands/device.ts`
  - `apps/cli/src/commands/template.ts`
  - `apps/cli/src/commands/init.ts`

## 命令 API 参考

### 1. workspace init
```bash
sydev workspace init
```
**交互流程**:
1. 选择 workspace 路径
2. 选择 Base 版本：default / ecs_3.6.5 / lts_3.6.5 / lts_3.6.5_compiled / research / custom
3. 多选平台：ARM64_GENERIC / ARM64_A53 / ARM64_A55 / ARM64_A57 / ARM64_A72 / X86_64 / RISCV_GC64 / LOONGARCH64
4. 选择操作系统：sylixos / linux
5. 选择调试级别：release / debug
6. 确认是否创建 Base
7. 确认是否编译 Base

**核心类**: `WorkspaceWizard` in `apps/cli/src/wizards/workspace-wizard.ts`

### 2. workspace status
```bash
sydev workspace status
```
**逻辑**: 检查 `process.cwd()/.realevo` 是否存在

### 3. project create
```bash
sydev project create
```
**交互流程**:
- **模式 1 (导入)**:
  1. 输入 Git 仓库地址
  2. 输入分支名（自动验证）
  3. 输入项目名（≥3 字符）
  4. 选择构建工具：make / ninja

- **模式 2 (新建)**:
  1. 输入项目名（≥3 字符）
  2. 选择项目模板
  3. 选择构建类型
  4. 选择调试级别
  5. 选择构建工具

**核心类**: `ProjectWizard` in `apps/cli/src/wizards/project-wizard.ts`

### 4. project list
```bash
sydev project list
```
**逻辑**: 遍历 `process.cwd()` 子目录，查找包含 `.rlproject` 的目录

### 5. build [project] [--quiet] [-- args]
```bash
# 单项目编译
sydev build libcpu

# 多项目交互式编译
sydev build

# 初始化 Makefile
sydev build init

# 传递 make 参数
sydev build libcpu -- -j4

# 静默模式
sydev build libcpu --quiet
```

**核心类**: `BuildRunner` in `packages/core/src/build-runner.ts`

**API**:
```typescript
// 初始化
const runner = new BuildRunner(projects, process.cwd());
runner.ensureMakefile(); // 生成 Makefile

// 编译单个项目
const result = await runner.buildOne(project, {
  quiet?: boolean,
  extraArgs?: string[]
});

// 监听进度
runner.on('progress', (event: BuildProgressEvent) => {
  if (event.type === 'stdout-line') { ... }
  else if (event.type === 'warning') { ... }
});
```

**结果对象**:
```typescript
interface BuildProjectResult {
  success: boolean;
  durationMs: number;
  stdout?: string;
  stderr?: string;
  errorLines?: string[];
}
```

### 6. clean [project] [--quiet] [-- args]
```bash
# 清理单个项目
sydev clean libcpu

# 交互式多选清理
sydev clean
```

**API**:
```typescript
const result = await runner.cleanOne(project, {
  quiet?: boolean,
  extraArgs?: string[]
});
```

### 7. rebuild [project] [--quiet] [-- args]
```bash
# 重新编译单个
sydev rebuild libcpu

# 交互式多选
sydev rebuild
```

**API**:
```typescript
const result = await runner.rebuildOne(project, {
  quiet?: boolean,
  extraArgs?: string[]
});
```

### 8. device add
```bash
sydev device add
```
**交互流程**:
1. 设备名称
2. IP 地址（IPv4 验证）
3. 多选平台
4. 用户名（默认 root）
5. 密码（默认 root）
6. SSH 端口（默认 22）
7. Telnet 端口（默认 23）
8. FTP ���口（默认 21）
9. GDB 端口（默认 1234）

**核心类**: `DeviceWizard` in `apps/cli/src/wizards/device-wizard.ts`

### 9. device list
```bash
sydev device list
```
**状态**: 功能在后续版本实现

### 10. template save
```bash
sydev template save
```
**交互流程**:
1. 输入模板名称
2. 输入模板描述（可空）
3. 选择模板类型：workspace / project / device / full
4. 收集相应配置内容
5. 如果模板已存在，选择：覆盖 / 重命名 / 取消

**核心类**: `TemplateManager` in `packages/core/src/template-manager.ts`

**全局目录**: `~/.sydev/`

### 11. template list [-t TYPE]
```bash
sydev template list
sydev template list -t workspace
sydev template list -t full
```

**选项**: `-t, --type <type>` (workspace/project/device/full)

### 12. template apply <ID>
```bash
sydev template apply my_env
```
**交互流程**:
1. 输入 workspace 路径
2. 输入 Base 目录路径
3. 如果是 full 模板，多选要应用的部分

### 13. template delete <ID>
```bash
sydev template delete my_env
```
**交互**: 需要确认（确认前不删除）

### 14. template export [-o FILE]
```bash
sydev template export
sydev template export -o my-config.json
```
**选项**: `-o, --output <file>` (默认 `sydev-config.json`)

**JSON 格式**:
```json
{
  "schemaVersion": 1,
  "type": "full",
  "workspace": { ... },
  "projects": [ ... ],
  "devices": [ ... ]
}
```

### 15. template import <FILE>
```bash
sydev template import config.json
```
**自动检测格式**:
- `{ type: "full", workspace: {...}, ... }` → full
- `{ type: "workspace", workspace: {...} }` → workspace
- `{ type: "project", project: {...} }` → project

### 16. init --config FILE
```bash
sydev init --config env.json
```

**必选**: `--config <file>`

**配置文件格式**:
```json
{
  "workspace": {
    "cwd": "/path/to/workspace",
    "basePath": "/path/to/base",
    "platform": ["ARM64_GENERIC", "X86_64"],
    "version": "default",
    "debugLevel": "release",
    "os": "sylixos",
    "createbase": true,
    "build": false
  },
  "projects": [ ... ],
  "devices": [ ... ]
}
```

**核心类**: `InitOrchestrator` in `packages/core/src/init-orchestrator.ts`

## 核心数据类型

### WorkspaceConfig
```typescript
{
  cwd: string;
  basePath: string;
  platform: string[];  // 数组，支持多选
  version: string;     // 'default' | 'ecs_3.6.5' | ...
  debugLevel: string;  // 'release' | 'debug'
  os: string;          // 'sylixos' | 'linux'
  createbase?: boolean;
  build?: boolean;
}
```

### ProjectConfig
```typescript
{
  name: string;
  source?: string;     // Git URL (import mode)
  branch?: string;
  path?: string;       // Local path
  template?: string;   // 'app' | 'lib' | ...
  type?: string;       // 'cmake' | 'automake' | ...
  debugLevel?: string;
  makeTool?: string;   // 'make' | 'ninja'
  isTemplate?: boolean;
}
```

### DeviceConfig
```typescript
{
  name: string;
  ip: string;
  platform: string[];  // 数组
  username?: string;
  password?: string;
  ssh?: number;
  telnet?: number;
  ftp?: number;
  gdb?: number;
}
```

## Makefile 生成细节

**调用方式**:
```typescript
const runner = new BuildRunner(projects, process.cwd());
runner.ensureMakefile();  // 生成 .sydev/Makefile
```

**生成内容**:
```makefile
.PHONY: libcpu my-app clean rebuild

libcpu:
	cd libcpu && make

my-app:
	cd my-app && make

clean:
	cd libcpu && make clean
	cd my-app && make clean

rebuild: clean
	cd libcpu && make
	cd my-app && make
```

**特点**:
- `.PHONY` 声明确保每次都重新编译
- Base 工程自动添加到项目列表
- 支持 `bear --append` 捕获编译命令
- PLATFORM_NAME 从 config.mk 自动插入（仅首次）

## 项目扫描逻辑

### WorkspaceScanner
```typescript
const scanner = new WorkspaceScanner(process.cwd());
const projects = scanner.scan();
// 返回 { name: string, path: string }[]

// 扫描规则:
// 1. 遍历当前目录子目录
// 2. 查找同时包含 .project 和 Makefile 的目录
// 3. 目录名作为项目名
```

## 环保检查

**在 cli 入口跳过检查的命令**:
- `--version`, `--help`
- `build`, `clean`, `rebuild`
- `template` (除 apply 外)
- `init`

**需要检查的命令**:
- `workspace init/status`
- `project create/list`
- `device add/list`
- `template apply`

## 常用 SKILL 开发模式

### 1. 快速编译 SKILL
```typescript
// 获取项目列表
const scanner = new WorkspaceScanner(cwd);
const projects = scanner.scan();

// 创建 runner
const runner = new BuildRunner(projects, cwd);
runner.ensureMakefile();

// 编译
const result = await runner.buildOne(project, { extraArgs: ['-j8'] });
```

### 2. 批量操作 SKILL
```typescript
// 遍历编译多个项目
for (const project of selectedProjects) {
  const result = await runner.buildOne(project, { quiet: true });
  if (!result.success) {
    // 处理失败
  }
}
```

### 3. 配置管理 SKILL
```typescript
// 使用 TemplateManager
const tm = new TemplateManager(getGlobalTemplateDir());
const templates = tm.list('full');
const loaded = tm.load(id);
```

### 4. 一键部署 SKILL
```typescript
// 使用 InitOrchestrator
const orchestrator = new InitOrchestrator(rlWrapper, progressReporter);
const result = await orchestrator.execute(config);
```

## 测试命令参考

```bash
# 初始化
sydev workspace init
sydev project create
sydev device add

# 编译工作流
sydev build init
sydev build
sydev clean
sydev rebuild

# 模板操作
sydev template save
sydev template list
sydev template export -o test.json
sydev template import test.json

# 全流程初始化
sydev init --config test.json
```
