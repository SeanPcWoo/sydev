---
phase: 2
slug: template-config
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | none — uses package.json scripts |
| **Quick run command** | `pnpm --filter @sydev/core test -- --run` |
| **Full suite command** | `pnpm test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @sydev/core test -- --run`
- **After every plan wave:** Run `pnpm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | CLI-TEMPLATE-01 | unit | `pnpm --filter @sydev/core test -- --run src/template-manager.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | CLI-TEMPLATE-02 | unit | `pnpm --filter @sydev/core test -- --run src/template-manager.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | CLI-TEMPLATE-03 | unit | `pnpm --filter @sydev/core test -- --run src/init-orchestrator.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | CLI-TEMPLATE-04 | unit | `pnpm --filter @sydev/core test -- --run src/template-manager.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | CLI-CONFIG-01 | unit | `pnpm --filter @sydev/core test -- --run src/config-manager.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | 0 | CLI-CONFIG-02 | unit | `pnpm --filter @sydev/core test -- --run src/config-manager.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | 0 | CLI-CONFIG-03 | unit | `pnpm --filter @sydev/core test -- --run src/init-orchestrator.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/src/template-manager.test.ts` — stubs for CLI-TEMPLATE-01, 02, 04
- [ ] `packages/core/src/init-orchestrator.test.ts` — stubs for CLI-TEMPLATE-03, CLI-CONFIG-03
- [ ] `packages/core/src/schemas/template-schema.ts` — schema definitions needed before tests
- [ ] `packages/core/src/schemas/full-config-schema.ts` — full config schema for init --config

*Existing infrastructure covers CLI-CONFIG-01, CLI-CONFIG-02 (extend existing config-manager.test.ts).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 模板冲突时交互式提示 | CLI-TEMPLATE-01 | inquirer 交互无法自动化 | 保存同名模板，验证提示覆盖/重命名/取消选项 |
| 应用模板时部分应用选择 | CLI-TEMPLATE-03 | inquirer 交互无法自动化 | 应用 full 模板，验证可选择只应用部分配置 |
| init --config 失败后进度显示 | CLI-CONFIG-03 | 需要观察终端输出格式 | 使用无效配置运行 init --config，验证已完成步骤和错误信息 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
