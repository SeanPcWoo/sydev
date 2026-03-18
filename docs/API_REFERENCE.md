# sydev API 参考

本文档提供 sydev 核心模块的 API 参考，用于集成 IDE Skill 或自定义工具。

## 目录

- [UploadRunner](#uploadrunner)
- [BuildRunner](#buildrunner)
- [WorkspaceScanner](#workspacescanner)
- [类型定义](#类型定义)

---

## UploadRunner

上传工程产物到 FTP 设备。

### 位置

```typescript
import { UploadRunner } from '@sydev/core/upload-runner.js';
```

### 构造器

```typescript
constructor(
  projects: ScannedProject[],
  workspaceRoot: string,
  devices: Map<string, DeviceConfig>
)
```

**参数**：
- `projects`: 工作空间中的工程列表
- `workspaceRoot`: 工作空间根目录路径
- `devices`: 设备配置映射（设备名 → 设备配置）

### 方法

#### uploadOne(project, options?): Promise<UploadProjectResult>

上传单个工程产物。

**参数**：

```typescript
interface UploadOptions {
  device?: string;      // 目标设备名
  quiet?: boolean;      // 静默模式（不输出进度）
}
```

**返回值**：

```typescript
interface UploadProjectResult {
  name: string;              // 工程名
  success: boolean;          // 是否成功
  durationMs: number;        // 耗时（毫秒）
  message: string;           // 状态消息
  filesUploaded?: number;    // 上传的文件数
  device?: string;           // 上传的设备名
}
```

**示例**：

```typescript
const runner = new UploadRunner(projects, workspaceRoot, devices);

const result = await runner.uploadOne(project, {
  device: 'board1',
  quiet: false
});

if (result.success) {
  console.log(`✓ 上传成功 (${result.filesUploaded} 文件)`);
} else {
  console.error(`✗ 上传失败: ${result.message}`);
}
```

### 事件

#### progress 事件

监听上传进度。

```typescript
runner.on('progress', (event: UploadProgressEvent) => {
  switch (event.type) {
    case 'file-upload':
      console.log(`Uploading: ${event.file} → ${event.remotePath}`);
      break;
    case 'start':
      console.log(`Starting upload to ${event.device}`);
      break;
    case 'done':
      console.log(`Upload done: ${event.result.message}`);
      break;
  }
});
```

**事件类型**：

```typescript
type UploadProgressEvent =
  | {
      type: 'start';
      projectName: string;
      device: string;
    }
  | {
      type: 'file-upload';
      projectName: string;
      file: string;              // 本地文件路径
      remotePath: string;        // 远端路径
    }
  | {
      type: 'done';
      result: UploadProjectResult;
    };
```

### 自动特性

- **自动添加 base 工程**：如果存在 base SDK 且有 `.reproject`，自动添加到工程列表
- **自动创建远端目录**：上传前自动在 FTP 创建必要的目录树
- **路径变量替换**：
  - `$(WORKSPACE_<project>)` → 工程路径
  - `$(Output)` → Debug/Release（从 config.mk DEBUG_LEVEL）
  - Base 路径特殊处理（libsylixos 关键字）

---

## BuildRunner

编译工程产物。

### 位置

```typescript
import { BuildRunner } from '@sydev/core/build-runner.js';
```

### 构造器

```typescript
constructor(
  projects: ScannedProject[],
  workspaceRoot: string
)
```

### 方法

#### ensureMakefile(): void

确保 `.sydev/Makefile` 存在且最新（增量更新）。

```typescript
const runner = new BuildRunner(projects, workspaceRoot);
runner.ensureMakefile();
```

#### buildOne(project, options?): Promise<BuildProjectResult>

编译单个工程。

```typescript
const result = await runner.buildOne(project, {
  quiet: false,
  extraArgs: ['-j4']
});
```

#### cleanOne(project, options?): Promise<BuildProjectResult>

清理单个工程。

```typescript
const result = await runner.cleanOne(project);
```

#### rebuildOne(project, options?): Promise<BuildProjectResult>

重新编译单个工程（clean + build）。

```typescript
const result = await runner.rebuildOne(project);
```

#### parseUserTemplates(): string[]

从 Makefile 中提取用户自定义的编译模板。

```typescript
const templates = runner.parseUserTemplates();
// → ['__demo', '__release']
```

### 类型

```typescript
interface BuildProjectResult {
  name: string;
  success: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  errorSummary?: string;        // 首条错误行
  errorLines?: string[];        // 最多 10 条错误
}

interface BuildOptions {
  extraArgs?: string[];         // make 参数
  quiet?: boolean;              // 静默模式
  verbose?: boolean;            // 详细输出
}
```

---

## WorkspaceScanner

扫描工作空间中的工程。

### 位置

```typescript
import { WorkspaceScanner } from '@sydev/core/workspace-scanner.js';
```

### 构造器

```typescript
constructor(workspaceRoot: string)
```

### 方法

#### scan(): ScannedProject[]

扫描工作空间并返回工程列表。

```typescript
const scanner = new WorkspaceScanner(process.cwd());
const projects = scanner.scan();

// → [
//     { name: 'base', path: '/path/to/sylixos' },
//     { name: 'libcpu', path: '/workspace/libcpu' },
//     { name: 'libnet', path: '/workspace/libnet' }
//   ]
```

**扫描规则**：
- 查找工作空间子目录中同时包含 `.project` 和 `Makefile` 的目录
- 自动添加 base 工程（如果 .realevo/config.json 中配置了 base 路径）

---

## 类型定义

### ScannedProject

```typescript
interface ScannedProject {
  name: string;        // 工程名（目录名）
  path: string;        // 工程完整路径
}
```

### DeviceConfig

```typescript
interface DeviceConfig {
  name: string;                    // 设备名
  ip: string;                      // IP 地址
  platform: string[];              // 支持的平台列表
  ssh: number;                     // SSH 端口 (默认 22)
  telnet: number;                  // Telnet 端口 (默认 23)
  ftp: number;                     // FTP 端口 (默认 21)
  gdb: number;                     // GDB 端口 (默认 1234)
  username: string;                // FTP 用户名
  password?: string;               // FTP 密码 (可选)
}
```

### WorkspaceConfig

```typescript
interface WorkspaceConfig {
  cwd: string;              // 工作空间路径
  basePath: string;         // Base SDK 路径
  platform: string[];       // 支持的平台列表
  version: string;          // Base SDK 版本
  createbase: boolean;      // 初始化时创建 base
  build: boolean;           // 初始化时编译 base
  debugLevel: 'debug' | 'release';
  os: 'sylixos' | 'linux';
}
```

---

## 使用示例

### 完整的编译和上传工作流

```typescript
import { BuildRunner } from '@sydev/core/build-runner.js';
import { UploadRunner } from '@sydev/core/upload-runner.js';
import { WorkspaceScanner } from '@sydev/core/workspace-scanner.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function buildAndUpload() {
  const workspaceRoot = process.cwd();

  // 1. 扫描工程
  const scanner = new WorkspaceScanner(workspaceRoot);
  const projects = scanner.scan();
  console.log(`Found ${projects.length} projects`);

  // 2. 编译
  const buildRunner = new BuildRunner(projects, workspaceRoot);
  buildRunner.ensureMakefile();

  for (const project of projects.filter(p => p.name !== 'base')) {
    console.log(`Building ${project.name}...`);
    const result = await buildRunner.buildOne(project);
    if (!result.success) {
      console.error(`Build failed: ${result.errorSummary}`);
      continue;
    }
    console.log(`✓ ${project.name} built`);
  }

  // 3. 加载设备���置
  const configPath = join(workspaceRoot, '.realevo', 'config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const devices = new Map(
    Object.entries(config.devices || {})
      .map(([name, device]) => [name, device])
  );

  // 4. 上传
  const uploadRunner = new UploadRunner(projects, workspaceRoot, devices);

  uploadRunner.on('progress', (event) => {
    if (event.type === 'file-upload') {
      console.log(`  ↑ ${event.file}`);
    }
  });

  for (const project of projects.filter(p => p.name !== 'base')) {
    console.log(`Uploading ${project.name}...`);
    const result = await uploadRunner.uploadOne(project, {
      device: 'board1'
    });
    if (result.success) {
      console.log(`✓ ${project.name} uploaded (${result.filesUploaded} files)`);
    } else {
      console.error(`Upload failed: ${result.message}`);
    }
  }
}

buildAndUpload().catch(console.error);
```

### IDE Skill 集成示例

```typescript
// myskill/index.ts
export interface SydevSkillAPI {
  // 获取当前工作空间的工程列表
  getProjects(): Promise<ScannedProject[]>;

  // 构建工程
  build(projectName: string, options?: BuildOptions): Promise<BuildProjectResult>;

  // 上传工程
  upload(projectName: string, deviceName: string): Promise<UploadProjectResult>;

  // 获取设备列表
  getDevices(): Promise<DeviceConfig[]>;

  // 获取编译输出目录
  getOutputDir(projectPath: string): Promise<string>; // 'Debug' or 'Release'
}
```

---

## 错误处理

所有异步方法都会返回 `result` 对象，包含 `success` 标志和详细的错误信息。

```typescript
const result = await runner.buildOne(project);

if (!result.success) {
  // 处理失败
  console.error(`Error: ${result.errorSummary}`);
  console.error(`Details: ${result.errorLines?.join('\n')}`);
}
```

---

## 环境变量

sydev 支持以下环境变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `SYDEV_VERSION` | 覆盖版本信息 | `SYDEV_VERSION=0.4.0` |
| `WORKSPACE_ROOT` | 工作空间根目录 | `WORKSPACE_ROOT=/path/to/workspace` |

---

## 更多信息

- [完整命令参考](./COMMANDS.md)
- [Upload 详细指南](./UPLOAD_GUIDE.md)
