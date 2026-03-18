# sydev IDE Skill 集成指南

sydev 采用 **仅 CLI 接口**的设计。内部 API 不对外暴露，IDE Skill 应该通过**调用 sydev CLI 命令**来集成功能。

## 设计原则

- ⚠️ **@sydev/core 是��部库** - 仅供 sydev CLI 内部使用
- ✅ **通过 CLI 接口集成** - IDE Skill 应调用 `sydev` 命令
- 🎯 **清晰的职责边界** - CLI 负责交互，Skill 负责集成

---

## IDE Skill 集成方式

### 1. 通过子进程调用 CLI

#### 编译工程

```typescript
import { spawn } from 'child_process';

function buildProject(projectName: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const proc = spawn('sydev', ['build', projectName]);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Build failed: ${stderr}`));
      }
    });
  });
}
```

#### 上传产物

```typescript
function uploadProject(
  projectName: string,
  deviceName: string,
  quiet = false
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const args = ['upload', projectName, '--device', deviceName];
    if (quiet) args.push('--quiet');

    const proc = spawn('sydev', args);

    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}
```

#### 批量上传多个工程

```typescript
function uploadMultiple(
  projects: string[],
  deviceName: string
): Promise<boolean> {
  const projectList = projects.join(',');
  return new Promise((resolve, reject) => {
    const proc = spawn('sydev', [
      'upload',
      projectList,
      '--device',
      deviceName,
      '--quiet'
    ]);

    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}
```

### 2. JSON 格式化输出

使用 `--quiet` 或其他方式获取结构化结果（建议未来版本支持 `--json` 输出）。

---

## 常见集成场景

### 场景 1：IDE 编译按钮

```typescript
// IDE "Build Project" 按钮的处理器
async function onBuildButtonClick(projectName: string) {
  try {
    console.log(`Building ${projectName}...`);
    const success = await buildProject(projectName);
    if (success) {
      showNotification('✓ Build successful');
    } else {
      showError('Build failed');
    }
  } catch (err) {
    showError(`Build error: ${err.message}`);
  }
}
```

### 场景 2：IDE 上传菜单

```typescript
// IDE "Upload to Device" 菜单的处理器
async function onUploadMenuClick(projectName: string) {
  // 1. 获取可用设备列表（需要 sydev device list 的支持）
  const devices = await getDeviceList();

  // 2. 用户选择设备
  const device = await showDeviceSelector(devices);

  // 3. 执行上传
  try {
    console.log(`Uploading ${projectName} to ${device}...`);
    const success = await uploadProject(projectName, device);
    if (success) {
      showNotification('✓ Upload successful');
    } else {
      showError('Upload failed');
    }
  } catch (err) {
    showError(`Upload error: ${err.message}`);
  }
}
```

### 场景 3：IDE 工作流（编译 → 上传）

```typescript
// IDE "Build and Deploy" 菜单
async function onBuildAndDeployClick(projectName: string, deviceName: string) {
  try {
    // 第 1 步：编译
    console.log(`[1/2] Building ${projectName}...`);
    const buildSuccess = await buildProject(projectName);
    if (!buildSuccess) {
      showError('Build failed, skipping upload');
      return;
    }
    showNotification('✓ Build successful');

    // 第 2 步：上传
    console.log(`[2/2] Uploading to ${deviceName}...`);
    const uploadSuccess = await uploadProject(projectName, deviceName, true);
    if (uploadSuccess) {
      showNotification('✓ Build and deploy successful');
    } else {
      showError('Upload failed');
    }
  } catch (err) {
    showError(`Error: ${err.message}`);
  }
}
```

### 场景 4：进度监控

```typescript
// 实时监控编译进度
async function buildWithProgress(projectName: string) {
  return new Promise((resolve, reject) => {
    const proc = spawn('sydev', ['build', projectName]);

    // 显示实时输出
    proc.stdout.on('data', (data) => {
      console.log(data.toString());
      updateProgress(data.toString()); // 更新 IDE 进度显示
    });

    proc.stderr.on('data', (data) => {
      console.error(data.toString());
      showWarning(data.toString());
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}
```

---

## sydev CLI 命令速参

### 编译

```bash
# 编译单个工程
sydev build <project>

# 编译全部工程
sydev build --all

# 编译并显示详细信息
sydev build <project>  # 默认显示输出

# 编译 - 静默模式
sydev build <project> --quiet
```

### 上传

```bash
# 上传单个工程到指定设备
sydev upload <project> --device <device>

# 上传多个工程（逗号分隔）
sydev upload libcpu,libnet --device board1

# 上传全部工程
sydev upload --all --device <device>

# 静默模式（用于自动化）
sydev upload <project> --device <device> --quiet
```

### 设备管理

```bash
# 添加设备（交互式）
sydev device add

# 列出设备（假设后续版本支持）
sydev device list

# 配置查询
cat .realevo/config.json | jq '.devices'
```

### 工程管理

```bash
# 列出工程（从 workspace 扫描）
sydev build  # 会显示可用工程

# 获取项目列表（扫描 .project 文件）
find . -name ".project" -exec dirname {} \;
```

---

## 获取 sydev 状态信息

由于 API 不对外暴露，IDE Skill 需要通过以下方式获取信息：

### 1. 解析 JSON 配置文件

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

interface WorkspaceConfig {
  base?: string;
  platforms?: string[];
  devices?: Record<string, any>;
}

function loadWorkspaceConfig(workspaceRoot: string): WorkspaceConfig {
  try {
    const configPath = join(workspaceRoot, '.realevo', 'config.json');
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return {};
  }
}

// 使用
const config = loadWorkspaceConfig(process.cwd());
const devices = config.devices || {};
const deviceNames = Object.keys(devices);
```

### 2. 扫描工程目录

```typescript
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';

async function getProjects(workspaceRoot: string): Promise<string[]> {
  const items = await readdir(workspaceRoot);
  const projects = [];

  for (const item of items) {
    const projectPath = join(workspaceRoot, item);
    const projectFile = join(projectPath, '.project');
    const makeFile = join(projectPath, 'Makefile');

    if (existsSync(projectFile) && existsSync(makeFile)) {
      projects.push(item);
    }
  }

  return projects;
}

// 使用
const projects = await getProjects(process.cwd());
```

### 3. 解析 .reproject 配置

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ReprojectConfig {
  device?: string;
  uploadPaths?: Array<{ local: string; remote: string }>;
}

function parseReproject(projectPath: string): ReprojectConfig {
  const reprojPath = join(projectPath, '.reproject');
  if (!existsSync(reprojPath)) {
    return {};
  }

  try {
    const content = readFileSync(reprojPath, 'utf-8');
    const config: ReprojectConfig = {};

    // 解析设备名
    const deviceMatch = content.match(/<device>([^<]+)<\/device>/i);
    if (deviceMatch) {
      config.device = deviceMatch[1].trim();
    }

    // 解析上传路径
    const fileMatches = content.matchAll(
      /<file[^>]*local="([^"]*)"[^>]*remote="([^"]*)"/gi
    );
    config.uploadPaths = [];
    for (const match of fileMatches) {
      config.uploadPaths.push({
        local: match[1],
        remote: match[2]
      });
    }

    return config;
  } catch (err) {
    return {};
  }
}

// 使用
const reproj = parseReproject(projectPath);
console.log(`Default device: ${reproj.device}`);
console.log(`Upload files: ${reproj.uploadPaths?.length || 0}`);
```

---

## 最佳实践

1. **使用 --quiet 模式进行自动化**
   ```typescript
   await buildProject(projectName);  // 显示输出
   await buildProject(projectName, true);  // 静默模式
   ```

2. **捕获退出码判断成功**
   ```typescript
   const proc = spawn('sydev', [...args]);
   proc.on('close', (code) => {
     const success = code === 0;
   });
   ```

3. **直接读取配置文件而不是解析 CLI 输出**
   ```typescript
   // ✓ 好
   const config = JSON.parse(readFileSync('.realevo/config.json', 'utf-8'));

   // ✗ 不好
   const output = execSync('sydev device list');
   // （未来版本可能修改输出格式）
   ```

4. **提供用户友好的错误提示**
   ```typescript
   try {
     await uploadProject(...);
   } catch (err) {
     showError(err.message);
     showHelp('Check device configuration: sydev device list');
   }
   ```

---

## 建议的未来增强

为了更好地支持 IDE 集成，建议 sydev 未来版本提供：

- [ ] `sydev device list --json` - 获取设备列表（JSON 格式）
- [ ] `sydev build --json` - 获取编译结果（JSON 格式）
- [ ] `sydev upload --json` - 获取上传结果（JSON 格式）
- [ ] `sydev workspace info --json` - 获取工作空间信息（JSON 格式）

这样 IDE Skill 可以更方便地解析结果，而无需自己处理 JSON 文件解析。

---

## 相关文档

- [完整命令参考](./COMMANDS.md)
- [Upload 详细指南](./UPLOAD_GUIDE.md)
- [快速参考卡片](./QUICK_REFERENCE.md)
