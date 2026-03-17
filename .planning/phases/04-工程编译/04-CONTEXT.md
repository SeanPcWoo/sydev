# Phase 4: 工程编译 - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

用户通过 `sydev build` 命令扫描、选择和编译 workspace 中的工程，获得实时进度反馈和错误汇总。同时支持 `sydev build init` 生成独立 Makefile，脱离 sydev 也能直接 make 编译。

Phase 5（产物上传）和 Phase 6（工作流配置）不在本 phase 范围内。

</domain>

<decisions>
## Implementation Decisions

### 工程扫描策略
- 判断标准：子目录同时存在 `.project` 和 `Makefile` 文件，才认为是一个工程
- 扫描深度：只扫描 workspace 的一级子目录，不递归
- 排除规则：跳过 `.` 开头的隐藏目录，以及 `Debug`、`Release` 等已知构建输出目录
- 无参数行为：运行 `sydev build` 不带参数时，列出扫描到的工程，通过 Inquirer 交互式让用户选择要编译的工程

### 编译输出与进度
- 单工程默认透传 make 全部输出，加 `--quiet` 选项切换静默模式
- 批量编译（`--all`）默认静默，只显示每个工程的状态行；加 `--verbose` 切换为逐个透传
- 批量静默时进度格式：`[1/5] libcpu ✓`，实时逐行推进，当前工程显示"编译中..."
- Ctrl+C 中断：单工程直接终止退出；批量编译时提示用户是否继续编译剩余工程
- 支持透传自定义 make 参数，通过 `--` 分隔符传入，例如 `sydev build libcpu -- -j4`
- 默认使用 `bear -- make` 编译以生成 `compile_commands.json`；检测 bear 不可用时自动降级为普通 make，给出提示

### 错误汇总格式
- 单工程编译失败：原样输出 make 的完整输出，末尾追加红色高亮错误摘要（错误行数 + 关键 `error:` 行）
- 批量编译汇总：表格式，列出每个工程名 + 状态（✓/✗）+ 耗时 + 失败工程的首条错误信息
- Exit code：单工程失败 exit 1；批量编译 exit code = 失败工程数（0 = 全部成功）

### Makefile 生成（BUILD-09）
- `sydev build init` 在 workspace 根目录生成独立 Makefile
- 每个工程对应三个 target：
  - `libcpu` — build
  - `clean-libcpu` — clean
  - `rebuild-libcpu` — clean + build
- 额外生成 `cp-<工程名>` target，但路径留模板注释，用户手动填写
- 不生成全局 `all`/`clean`/`rebuild` target；批量操作由 sydev 配置驱动
- 编译时自动注入 `WORKSPACE_<工程名>` 环境变量（所有工程的路径映射）

### Claude's Discretion
- bear 降级时的提示措辞
- 进度行的具体格式（宽度、对齐、颜色方案）
- Makefile 注释和模板的具体格式
- 工程扫描失败（workspace 未初始化）时的错误提示

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProgressReporter` (EventEmitter) + `createCliProgressReporter` (ora + chalk)：已有进度报告基础设施，可扩展用于 build 进度
- `BatchExecutor`：已有批量执行 + 重试模式，可参考其结构实现批量编译
- `executeRlCommand`（spawn + 超时 + 输出捕获）：可参考其子进程执行模式实现 make 调用
- `ConfigManager`（Zod 验证）：可用于验证 build 相关配置

### Established Patterns
- Commander.js 命令文件模式：每个命令一个文件（`commands/build.ts`），注册到 `index.ts`
- Inquirer 11.x 交互选择：已在多个 wizard 中使用，用于工程选择交互
- chalk + ora：进度和状态展示的标准方式
- 中文错误信息和修复建议：项目约定的用户提示风格

### Integration Points
- `index.ts`：需要 `import { buildCommand }` 并 `program.addCommand(buildCommand)`
- 环境检查 hook：`preAction` 中需决定 build 命令是否跳过或包含在环境检查中（make 不依赖 rl，但 bear 需要检测）
- workspace 检测：沿用 `.realevo` 目录判断是否在 workspace 中

</code_context>

<specifics>
## Specific Ideas

- 进度格式参考：`[1/5] libcpu ✓  2.3s`，`[2/5] bsp-rk3568 编译中...`
- 批量汇总参考：表格式，类似 CI 构建报告，清晰展示成功/失败分布
- Makefile 中 `WORKSPACE_` 变量注入方式：在 Makefile 顶部 export，每行一个变量
- `cp-libcpu` target 示例：
  ```makefile
  cp-libcpu:
      # TODO: cp $(OUTPUT) /path/to/destination
  ```

</specifics>

<deferred>
## Deferred Ideas

- 并行编译（`-j` 多工程并行）— Out of Scope，v2.0 顺序执行
- 编译缓存管理 — 由 make 自身处理，sydev 不介入
- watch mode（文件变化自动触发编译）— Out of Scope
- 全局 `make all` target — 批量操作由 Phase 6 工作流配置驱动

</deferred>

---

*Phase: 04-工程编译*
*Context gathered: 2026-03-17*
