# Requirements: SylixOS 开发环境快速部署工具

**Defined:** 2026-03-17
**Core Value:** 开发者能够在 5 分钟内从零开始完成一个可用的 SylixOS 开发环境搭建，并通过统一的 CLI 完成编译和部署工作流

## v2.0 Requirements

Requirements for v2.0 milestone. Each maps to roadmap phases.

### 编译 (BUILD)

- [ ] **BUILD-01**: 用户可以扫描 workspace 子目录自动识别工程列表
- [ ] **BUILD-02**: 用户可以编译单个指定工程（`sydev build <工程名>`）
- [ ] **BUILD-03**: 用户可以编译全部工程（`sydev build --all`）
- [ ] **BUILD-04**: 编译时自动注入 workspace 所有 `WORKSPACE_工程名` 环境变量
- [ ] **BUILD-05**: 编译过程实时进度显示（当前工程、成功/失败状态）
- [ ] **BUILD-06**: 编译完成后错误汇总（失败工程、失败原因）
- [ ] **BUILD-07**: 用户可以定义编译流水线（工程依赖顺序、编译后动作如 cp 产物）
- [ ] **BUILD-08**: 编译流水线配置保存在 workspace 目录下

### 上传 (UPLOAD)

- [ ] **UPLOAD-01**: 用户可以上传单个工程产物（`sydev upload <工程名>`）
- [ ] **UPLOAD-02**: 用户可以上传全部工程产物（`sydev upload --all`）
- [ ] **UPLOAD-03**: 解析 .reproject XML 获取设备名和上传路径映射
- [ ] **UPLOAD-04**: 自动替换 `$(WORKSPACE_工程名)` 变量为实际工程路径
- [ ] **UPLOAD-05**: 从 DeviceSetting 匹配 sydev device 配置获取 FTP 连接信息
- [ ] **UPLOAD-06**: FTP 上传进度显示和结果汇总
- [ ] **UPLOAD-07**: 用户可以保存命名的上传目标（一条命令批量上传指定组合）
- [ ] **UPLOAD-08**: 上传目标配置保存在 workspace 目录下

## Future Requirements

暂无

## Out of Scope

| Feature | Reason |
|---------|--------|
| 实时构建监听（watch mode） | 不做文件监听自动编译，手动触发即可 |
| 并行编译多个无依赖工程 | v2.0 先顺序执行，后续可优化 |
| SSH/SCP 部署方式 | 目标设备使用 FTP，暂不需要其他协议 |
| 编译缓存/增量编译管理 | 由 make 自身处理，sydev 不介入 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | — | Pending |
| BUILD-02 | — | Pending |
| BUILD-03 | — | Pending |
| BUILD-04 | — | Pending |
| BUILD-05 | — | Pending |
| BUILD-06 | — | Pending |
| BUILD-07 | — | Pending |
| BUILD-08 | — | Pending |
| UPLOAD-01 | — | Pending |
| UPLOAD-02 | — | Pending |
| UPLOAD-03 | — | Pending |
| UPLOAD-04 | — | Pending |
| UPLOAD-05 | — | Pending |
| UPLOAD-06 | — | Pending |
| UPLOAD-07 | — | Pending |
| UPLOAD-08 | — | Pending |

**Coverage:**
- v2.0 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16 ⚠️

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after initial definition*
