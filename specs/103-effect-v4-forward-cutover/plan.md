# Implementation Plan: Effect v4 全仓迁移主线（当前已完成 runtime-core slice）

**Branch**: `103-effect-v4-forward-cutover` | **Date**: 2026-03-07 | **Spec**: `specs/103-effect-v4-forward-cutover/spec.md`

## Summary

本计划恢复 `103` 的主线定位：

- `103` 继续代表“全仓 Effect v4 迁移主线”；
- 当前已完成的只有一个阶段性 slice：runtime-core Stage 2 收口 + gate truthfulness；
- Stage 1 / 3 / 4 / 5 / 6 仍是主线剩余任务；
- 历史 perf / diagnostics / release artifacts 继续保留，但不能被误读为当前整体完成。

## Why This Reset Is Necessary

- 当前 workspace 仍然使用 `effect` 3.19.x；
- `Gate-A/B` 已通过，但 `G1` 仍是 truthful `NOT_PASS`；
- `G5` 的历史 PASS 绑定旧 snapshot，不对应当前 `HEAD`；
- 仓库策略禁止未授权的 `rebase` / 压历史，因此 `T103/T104` 不能自动完成；
- 当前 dirty worktree 的新增测试与 runtime-core 改动显然属于 Stage 2 收口，而不是 Stage 3/4/5/6。

## 当前已完成 Slice

### A. Validate landed Stage 2 code

- `packages/logix-core/src/internal/serviceId.ts`
- `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`
- `packages/logix-core/src/Runtime.ts`
- `packages/logix-core/src/ExternalStore.ts`
- `packages/logix-query/src/Query.ts`
- `scripts/checks/schema-v4-legacy.ts`

### B. Validate supporting evidence/tests

- `packages/logix-core/test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts`
- `packages/logix-core/test/internal/Runtime/Runtime.ExecVmModeReference.test.ts`
- `packages/logix-core/test/internal/ServiceId.TagRegistry.test.ts`
- `scripts/checks/schema-v4-legacy.test.ts`
- `specs/103-effect-v4-forward-cutover/diagnostics/s2.stage0-comparison.md`

### C. Rewrite spec bundle to match reality

- `spec.md`
- `plan.md`
- `tasks.md`
- `checklists/requirements.md`
- `inventory/perf-prerequisite.md`
- `inventory/gate-g1-0.md`
- `inventory/gate-c.md`
- `inventory/gate-g2.md`
- `inventory/gate-g3.md`
- `inventory/gate-g4.md`
- `inventory/gate-g5.md`
- `inventory/checkpoint-decision-log.md`
- `research.md`

## 主线剩余阶段

以下项目仍属于 `103` 主线，只是当前尚未完成：

- 真正的 `effect/@effect/*` v4 依赖升级与 `G1.0` 放行；
- STM PoC / `Gate-C` / `G2`；
- `packages/logix-react`、`packages/logix-sandbox`、`packages/i18n`、`packages/logix-query`、`packages/logix-form`、`packages/domain`、`packages/logix-cli` 的全量迁移；
- `apps/*`、`examples/*`、`apps/docs/*`、`docs/ssot/*` 的 v4-only 收口；
- `rebase main` / 单提交 `V4_DELTA` / release history surgery。

## Constitution Check

- **Forward-only**: PASS。本计划仍不引入兼容层。
- **IR / stable ids**: PASS。当前代码改动未改变这组不变量。
- **Txn window no IO**: PASS。当前 closure 不放宽禁令。
- **Diagnostics explainability**: PASS。以 `diagnostics/s2.stage0-comparison.md` 和相关回归测试作为证据。
- **Perf truthfulness**: PASS。当前主线重点之一是不再误宣称 `G1/G5` 已过线。
- **Git safety**: PASS。当前 closure 不触发未授权的历史改写动作。

## Verification Plan

### Required

```bash
pnpm check:schema-v4-legacy
pnpm -C packages/logix-core exec vitest run test/internal/ExternalStore/ExternalStore.RuntimeBoundary.test.ts test/internal/Runtime/Runtime.ExecVmModeReference.test.ts test/internal/ServiceId.TagRegistry.test.ts
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-query typecheck:test
pnpm typecheck
pnpm typecheck:test
pnpm lint
pnpm test:turbo
```

### Read-only truth checks

```bash
git rev-parse --short HEAD
git rev-parse --short origin/main
git rev-parse --short origin/feat/perf-dynamic-capacity-maxlevel
git rev-list --count origin/main..HEAD
git rev-list --count origin/main..origin/feat/perf-dynamic-capacity-maxlevel
```

## Completion Rule

本 plan 当前阶段的完成条件是：

1. 主线定位重新校正为“全仓迁移主线”；
2. 当前已落地 Stage 2 子轨有验证证据；
3. 剩余 Stage 1/3/4/5/6 被明确保留为主线待办；
4. 历史 `G5 PASS` 不再被误用为当前 `HEAD` 放行。
