# sydev 项目记忆库

## 项目定位

**sydev** 是一个命令行工具，用于快速部署 SylixOS 开发环境。

**重要声明**: 不提供二次开发 API。是纯命令行工具，后续 SKILL 开发基于命令行接口。

## 8 个主命令体系

### 1. sydev workspace — workspace 管理
- `workspace init` — 交互式初始化 + 非交互模式（--cwd, --platforms, --version 等）
- `workspace status` — 检查 workspace 初始化状态（检查 `.realevo/` 目录）

### 2. sydev project — 项目管理
- `project create` — 交互式创建 + 非交互模式（支持 import/create 模式）
- `project list` — 列出 workspace 中的所有项目（通过 `.rlproject` 标记文件）

### 3. sydev build — 工程编译
- `build [project]` — 编译指定项目（项目名精确匹配）
- `build` — 无参数时交互式多选编译
- `build init` — 生成/更新 `.sydev/Makefile`
- **选项**: `--quiet` (静默模式), `-- <args>` (透传 make 参数)
- **自动机制**: 首次自动生成 Makefile，包含所有项目 target、Base 自动添加、.PHONY 声明

### 4. sydev clean — 清理构建产物
- `clean [project]` — 清理指定项目
- `clean` — 无参数时交互式多选清理
- **选项**: `--quiet`, `-- <args>`

### 5. sydev rebuild — 清理+重新编译
- `rebuild [project]` — 重新编译指定项目（clean + build）
- `rebuild` — 无参数时交互式多选
- **选项**: `--quiet`, `-- <args>`

### 6. sydev device — 设��管理
- `device add` — 交互式添加设备 + 非交互模式（--name, --ip, --platforms, SSH/FTP/GDB 端口等）
- `device list` — 列出已配置设备（后续实现）

### 7. sydev template — 配置模板管理
- `template save` — 保存当前配置为模板（选择类型：workspace/project/device/full）
- `template list [-t TYPE]` — 列出所有模板，支持按类型过滤
- `template apply <ID>` — 从模板初始化（支持 full 模板部分应用）
- `template delete <ID>` — 删除模板（需确认）
- `template export [-o FILE]` — 导出配置为 JSON（默认 `sydev-config.json`）
- `template import <FILE>` — 导入 JSON 配置并可选保存为模板

### 8. sydev init — 全流程初始化
- `init --config FILE` — 从 JSON 配置文件一键初始��整个环境
- **特点**: 配置缺少 cwd/basePath 时交互提示，支持 `{ type: "full", data: {...} }` 格式

## v0.4.0 新增：非交互模式

所有交互式命令都支持完整的非交互模式，支持以下三种方式：

### 参数模式 (--flag style)
```bash
sydev workspace init --cwd /path --version default --platforms ARM64_GENERIC,X86_64 --os sylixos --debug-level release --create-base --build
sydev project create --mode import --name myapp --source https://xxx.git --branch main --make-tool make
sydev device add --name dev1 --ip 192.168.1.100 --platforms ARM64_GENERIC --username root --password root --ssh 22 --telnet 23 --ftp 21 --gdb 1234
```

### JSON 配置模式 (--config style)
```bash
sydev workspace init --config workspace.json
sydev project create --config project.json
sydev device add --config device.json
```

### 混合模式 (文件 + 命令行覆盖)
```bash
sydev workspace init --config base.json --platforms X86_64,ARM64_A53
```

### 参数解析框架
- **文件**: `apps/cli/src/options/` 目录
- **核心**: `BaseOptionParser` — 通用参数解析器，支持验证、合并、默认值
- **具体**: `WorkspaceOptionParser`, `ProjectOptionParser`, `DeviceOptionParser`, `TemplateSaveOptionParser`
- **功能**: 参数验证、类型转换、错误消息、JSON 配置加载

### 示例配置文件
- `examples/workspace-config.json` — workspace 配置示例
- `examples/project-import-config.json` — 导入项目配置示例
- `examples/project-create-config.json` — 新建项目配置示例
- `examples/device-config.json` — 设备配置示例

## 关键设计细节

### Build/Clean/Rebuild 通用特性
- **参数交互**: 无参数时使用 inquirer 的 checkbox 多选界面
- **make 参数传递**: `-- <args>` 后的所有参数直接传给 make（支持 -j8 并行）
- **错误摘要**: 编译失败时显示错误行数和具体错误信息

### Template 存储位置
- 所有模板保存在 `~/.sydev/` 用户主目录下
- 全局可用，不限制 workspace

### Workspace 平台配置
- 平台字段为 **数组**（支持多选：ARM64_GENERIC、ARM64_A53、X86_64 等）
- Makefile 中 PLATFORM_NAME 自动从 config.mk 插入（仅首次插入，不覆盖）

### Makefile 自动生成规则
- 包含所有项目的 build target
- Base 工程自动添加到项目列表
- `.PHONY` 声明确保每次重新编译
- `bear --append` 命令捕获编译信息
- clean target 汇总所有项目 clean

## 交互模式向导重构 (v0.4.0)

所有 wizard 函数提取核心初始化逻辑为独立函数，支持非交互模式调用：

- `runWorkspaceInit()` — workspace 初始化核心逻辑（workspace-wizard.ts）
- `runProjectInit()` — project 初始化核心逻辑（project-wizard.ts）
- `runDeviceInit()` — device 初始化核心逻辑（device-wizard.ts）

这些函数可被命令层直接调用（跳过 inquirer），实现完整的非交互支持。

## 内部库架构（不提供公开 API）

### @sydev/core 的定位
- 仅供 CLI 内部使用
- 位于 `packages/core/src/`
- 包含编译、配置、模板等核心逻辑

### CLI 导入模式（v0.4.0 后）
直接导入模块，不通过 index.ts（因为 index.ts 已移除所有 public exports）：

```typescript
import { BuildRunner } from '@sydev/core/build-runner.js';
import { TemplateManager } from '@sydev/core/template-manager.js';
import { ConfigManager } from '@sydev/core/config-manager.js';
```

## 文档说明

- **README.md** — 用户使用文档（所有命令、参数、示例）
- **CONTRIBUTING.md** — 贡献者指南（想要参与 sydev 开发的人）
- **不再有开发文档** — 不提供二次开发相关文档

## SKILLS 开发建议

基于 sydev 命令行接口开发 SKILL（而非代码 API）：
1. **sydev-quick-build** — 快速编译单个或多个项目
2. **sydev-config-gen** — 快速生成配置 JSON
3. **sydev-env-deploy** — 一键部署完整环境
4. **sydev-build-monitor** — 监控编译进度
5. **sydev-template-manager** — 增强模板管理
