# sydev Skill / IDE 集成指南

本文档面向脚本、IDE、Agent、CI 等自动化调用场景。

## 集成原则

- 把 `sydev` CLI 视为稳定入口
- 不要把 `@sydev/core` 当作对外稳定 API
- 自动化场景尽量避免交互式命令
- 优先使用：
  - 完整命令行参数
  - `--config` JSON 文件
  - `template apply ... -y`
  - `sydev init --config ...`

## 推荐的非交互命令

### 初始化 workspace

```bash
sydev workspace init --config workspace.json
```

### 创建项目

```bash
sydev project create --config project.json
```

### 添加设备

```bash
sydev device add --config device.json
```

### 编译项目

```bash
sydev build libcpu --quiet -- -j4
```

### 上传项目

```bash
sydev upload libcpu --device board1 --quiet
sydev upload libcpu,libnet --device board1 --quiet
```

### 应用配置模板

```bash
sydev template apply env.json --cwd /path/to/ws --base-path /path/to/base -y
```

### 全流程初始化

```bash
sydev init --config full-config.json
```

## TypeScript 调用示例

### 推荐使用 `execFile`

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function runSydev(args: string[], cwd = process.cwd()) {
  const { stdout, stderr } = await execFileAsync('sydev', args, { cwd });
  return { stdout, stderr };
}
```

### 编译单个项目

```typescript
async function buildProject(projectName: string, cwd: string) {
  await runSydev(['build', projectName, '--quiet'], cwd);
}
```

### 上传单个项目

```typescript
async function uploadProject(projectName: string, deviceName: string, cwd: string) {
  await runSydev(['upload', projectName, '--device', deviceName, '--quiet'], cwd);
}
```

### 批量上传多个项目

```typescript
async function uploadProjects(projects: string[], deviceName: string, cwd: string) {
  await runSydev(['upload', projects.join(','), '--device', deviceName, '--quiet'], cwd);
}
```

### 应用 full 配置文件

```typescript
async function applyTemplate(configPath: string, workspacePath: string, basePath: string) {
  await runSydev([
    'template',
    'apply',
    configPath,
    '--cwd',
    workspacePath,
    '--base-path',
    basePath,
    '-y',
  ]);
}
```

## 读取状态信息

### workspace 状态

```bash
sydev workspace status
```

适合人读，不适合直接做结构化解析。

### 项目列表

```bash
sydev project list
```

如果你需要稳定的机器可读结果，建议直接扫描 workspace 一级子目录，规则与 CLI 一致：

- 目录存在
- 同时包含 `.project` 和 `Makefile`

### 设备信息

`sydev device list` 的输出是给人看的。自动化场景如果需要结构化设备数据，建议直接读取：

1. `.realevo/devicelist.json`
2. `.realevo/config.json`

### 不建议依赖的东西

- `sydev` 终端输出的具体排版
- 彩色字符、emoji 或行前缀
- 内部包的类和方法名

## 目前没有稳定 JSON 输出

当前 CLI 没有统一的 `--json` 输出模式，因此自动化集成建议：

- 执行动作时依赖退出码
- 读取配置时直接读 JSON 文件
- 需要静默日志时使用 `--quiet`

## 适合脚本化的命令

| 命令 | 适合程度 | 备注 |
| --- | --- | --- |
| `workspace init --config ...` | 高 | 适合新环境创建 |
| `project create --config ...` | 高 | 适合批量项目创建 |
| `device add --config ...` | 高 | 适合写入设备配置 |
| `build <project> --quiet` | 高 | 退出码可直接判断成功失败 |
| `upload <projects> --device ... --quiet` | 高 | 多项目时始终显式传 `--device` |
| `template apply <json> ... -y` | 高 | 适合 CI / 脚本复用环境 |
| `init --config ...` | 高 | 一次性执行整套初始化 |
| 纯交互式命令 | 低 | 不适合无人值守环境 |

## 推荐实践

### 1. 自动化环境里总是显式传路径

```bash
sydev template apply env.json --cwd /ws --base-path /ws/.realevo/base -y
```

### 2. 多项目上传时总是显式传设备

```bash
sydev upload libcpu,libnet --device board1 --quiet
```

### 3. 把配置写入 JSON 文件，而不是拼很长的命令

优先使用：

- `workspace.json`
- `project.json`
- `device.json`
- `full-config.json`

格式见 [CONFIG_FILES.md](./CONFIG_FILES.md)。

### 4. 依赖退出码，不依赖 stdout 文案

- `0` 表示成功
- 非 `0` 表示失败

## 相关文档

- [完整命令参考](./COMMANDS.md)
- [配置文件参考](./CONFIG_FILES.md)
- [Upload 使用指南](./UPLOAD_GUIDE.md)
- [快速参考卡片](./QUICK_REFERENCE.md)
