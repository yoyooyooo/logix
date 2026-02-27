# Implementation Plan: O-022 Action API 收敛到 ActionIntent

**Branch**: `103-o022-action-intent-api` | **Date**: 2026-02-26 | **Spec**: `specs/103-o022-action-intent-api/spec.md`  
**Input**: Feature specification from `specs/103-o022-action-intent-api/spec.md`

## Source Traceability

- **Backlog Item**: O-022
- **Source File**: `docs/todo-optimization-backlog/items/O-022-action-api-action-intent.md`

## Summary

按既定裁决收敛 Action API：

- `$.dispatchers` 保持一等公开高频类型安全入口；
- `ActionIntent` 作为内部统一执行内核，`$.action(token)` 为动态入口；
- `$.dispatch(type,payload)` 保留兼容/低阶定位，不作为默认推荐。

## Technical Context

**Language/Version**: TypeScript 5.9.x  
**Primary Dependencies**: `@logixjs/core`, `effect` v3, Vitest  
**Storage**: N/A  
**Testing**: `@effect/vitest` + vitest runtime tests  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace  
**Performance Goals**: 高频 dispatch 回归 <= 5%，`$.dispatchers` 零额外分配或接近零额外分配  
**Constraints**: forward-only、统一最小 IR、稳定标识、事务窗口禁 IO、诊断 Slim  
**Scale/Scope**: Action 入口层 + Bound API runtime + 文档示例迁移

## Constitution Check

_GATE: 进入实现前必须通过，Phase 1 后复核。_

### 补强项（高影响项必填）

- **API breaking**:
  - 分层裁决已冻结：`$.dispatchers`（主） > `ActionIntent/$.action(token)`（动态） > `$.dispatch`（兼容低阶）。
  - 若后续移除字符串入口，属于显式 breaking，需按迁移合同执行。
- **性能预算**:
  - 热路径：`$.dispatchers` 调用到 ActionIntent 内核。
  - 预算：p95 与分配回归 <= 5%，并以 before/after 证据验证。
- **诊断代价**:
  - 三入口诊断统一且 Slim。
  - diagnostics=off 档位不得引入常驻包装成本。
- **IR/锚点漂移**:
  - Action 相关动态 trace 仅保留单一真相源。
  - 漂移点：入口来源字段、token/type 映射字段、event code。
- **稳定标识**:
  - `instanceId/txnSeq/opSeq/actionId` 保持稳定来源，禁止随机默认值。
- **迁移说明**:
  - 必须交付 `contracts/migration.md`，说明字符串入口定位与替代路径。
  - 无兼容层/无弃用期。

### Gate Result

- PASS（文档计划阶段）

## Perf Evidence Plan（MUST）

- Baseline 语义：before/after
- envId：`darwin-arm64.node20`
- profile：`default`
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/103-o022-action-intent-api/perf/before.<sha>.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/103-o022-action-intent-api/perf/after.<sha>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/103-o022-action-intent-api/perf/before.<sha>.default.json --after specs/103-o022-action-intent-api/perf/after.<sha>.default.json --out specs/103-o022-action-intent-api/perf/diff.before__after.default.json`
- Failure Policy：
  - O-022 的**阻断门禁**是三入口专项微基准（`Bound.ActionIntent.Perf.off.test.ts` + `perf/entry.off.local.json`）；
    若 `p50DispatchersVsAction > 1.05` 或 `p50DispatchersOverDispatch > 1.2`，必须阻断并复测。
  - `perf/diff.before__after.quick.json` 在本任务中作为观察性补充证据（dirty worktree 下的趋势参考）；
    其中 `stabilityWarning` 不作为 O-022 阻断条件。
  - 若后续需要发布级横向对比，再在 clean worktree 复跑 before/after/diff 证据链。

## Project Structure

### Documentation (this feature)

```text
specs/103-o022-action-intent-api/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-surface.md
│   ├── action-intent-kernel.md
│   └── migration.md
├── checklists/
│   ├── requirements.md
│   └── api.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── BoundApiRuntime.ts
└── (action intent kernel related files)

packages/logix-core/src/internal/action.ts
packages/logix-core/test/
examples/logix/
apps/docs/content/docs/
```

**Structure Decision**: 实现集中在 action 内核与 Bound API runtime；文档迁移同步示例默认写法。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
