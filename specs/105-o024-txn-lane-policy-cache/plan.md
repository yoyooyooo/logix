# Implementation Plan: O-024 Txn Lane 策略前移缓存

**Branch**: `105-o024-txn-lane-policy-cache` | **Date**: 2026-02-26 | **Spec**: `specs/105-o024-txn-lane-policy-cache/spec.md`  
**Input**: Feature specification from `specs/105-o024-txn-lane-policy-cache/spec.md`

## Source Traceability

- **Backlog Item**: O-024
- **Source File**: `docs/todo-optimization-backlog/items/O-024-txn-lane-policy-cache.md`

## Summary

将 `ResolvedTxnLanePolicy` 计算前移到 capture 阶段并缓存，减少热路径 merge 税；同步明确 override 仅在 capture/re-capture 生效的时序语义，并补齐诊断与迁移文档。

## Technical Context

**Language/Version**: TypeScript 5.9.x  
**Primary Dependencies**: `@logixjs/core`, `effect`, Vitest  
**Storage**: N/A  
**Testing**: runtime policy tests + performance regression checks  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace  
**Performance Goals**: merge.count/duration 明显下降，p95/p99 回归 <= 5%  
**Constraints**: forward-only、事务窗口禁 IO、稳定标识、诊断 Slim  
**Scale/Scope**: `ModuleRuntime.txnLanePolicy` / `txnQueue` / 诊断协议与文档

## Constitution Check

_GATE: 进入实现前必须通过，Phase 1 后复核。_

### 补强项（高影响项必填）

- **API breaking**:
  - 行为变化：override 不再运行中即时生效，改为 capture/re-capture 语义。
  - 影响对象：控制面调用方、测试预期、调试流程。
- **性能预算**:
  - 热路径：policy merge、txn queue 调度。
  - 预算：merge 指标显著下降；p95/p99 回归 <= 5%。
- **诊断代价**:
  - `txn_lane_policy::resolved` 事件保持 Slim；diagnostics=off 接近零成本。
- **IR/锚点漂移**:
  - 策略决策锚点单一来源。
  - 漂移点：capture 时间戳、policy 来源、override 生效轮次。
- **稳定标识**:
  - `instanceId/txnSeq/opSeq/policySeq` 稳定可复现。
- **迁移说明**:
  - `contracts/migration.md` 必须包含新时序模型、操作手册与失败降级。
  - 无兼容层/无弃用期。

### Gate Result

- PASS（文档计划阶段）

## Perf Evidence Plan（MUST）

- Baseline 语义：before/after
- envId：`darwin-arm64.node20`
- profile：`default`
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/105-o024-txn-lane-policy-cache/perf/before.<sha>.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/105-o024-txn-lane-policy-cache/perf/after.<sha>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/105-o024-txn-lane-policy-cache/perf/before.<sha>.default.json --after specs/105-o024-txn-lane-policy-cache/perf/after.<sha>.default.json --out specs/105-o024-txn-lane-policy-cache/perf/diff.before__after.default.json`
- Failure Policy：不可比或不稳定必须复测。

## Project Structure

### Documentation (this feature)

```text
specs/105-o024-txn-lane-policy-cache/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── policy-cache-contract.md
│   ├── diagnostics.md
│   └── migration.md
├── checklists/
│   ├── requirements.md
│   └── migration.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── ModuleRuntime.txnLanePolicy.ts
├── ModuleRuntime.impl.ts
└── ModuleRuntime.txnQueue.ts

packages/logix-core/test/
docs/ssot/runtime/
```

**Structure Decision**: 改造集中在 txn lane policy 解析与 queue 调度层；文档同步控制面语义。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
