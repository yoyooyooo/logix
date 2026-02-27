# Implementation Plan: O-023 Flow `run(config)` 命名收敛

**Branch**: `104-o023-flow-run-config` | **Date**: 2026-02-26 | **Spec**: `specs/104-o023-flow-run-config/spec.md`  
**Input**: Feature specification from `specs/104-o023-flow-run-config/spec.md`

## Source Traceability

- **Backlog Item**: O-023
- **Source File**: `docs/todo-optimization-backlog/items/O-023-flow-run-config-unification.md`

## Summary

统一 Flow 执行入口到 `run(config)`，把旧 `run*` 命名族迁移为配置语义，最终删除旧符号并保持并发行为、诊断与性能稳定。

## Technical Context

**Language/Version**: TypeScript 5.9.x  
**Primary Dependencies**: `@logixjs/core`, `effect`, Vitest  
**Storage**: N/A  
**Testing**: Flow runtime tests + `@effect/vitest`  
**Target Platform**: Node.js 20+  
**Project Type**: pnpm workspace  
**Performance Goals**: `run(config)` 热路径回归 <= 5%  
**Constraints**: forward-only、稳定标识、事务窗口禁 IO、诊断 Slim  
**Scale/Scope**: `FlowRuntime`/`TaskRunner`/`BoundApiRuntime` + 文档迁移

## Constitution Check

_GATE: 进入实现前必须通过，Phase 1 后复核。_

### 补强项（高影响项必填）

- **API breaking**:
  - 旧 `runLatest/runParallel/runExhaust/run*Task` 将迁移并最终删除。
  - 新裁决：`run(config)` 为唯一推荐入口。
- **性能预算**:
  - 热路径：`run(config)` 解析 + 策略执行。
  - 预算：p95 与分配回归 <= 5%。
- **诊断代价**:
  - `run(config)` 模式决策事件保持 Slim 可序列化。
  - diagnostics=off 不新增常驻成本。
- **IR/锚点漂移**:
  - Flow trace 入口字段与决策字段必须单一来源。
  - 漂移点：模式映射、拒绝策略 code、task 语义标记。
- **稳定标识**:
  - 维持 `instanceId/txnSeq/opSeq/flowId` 稳定来源。
- **迁移说明**:
  - 必须交付 `contracts/migration.md`，记录别名阶段与最终删除策略。
  - 无兼容层/无弃用期。

### Gate Result

- PASS（文档计划阶段）

## Perf Evidence Plan（MUST）

- Baseline 语义：before/after
- envId：`darwin-arm64.node20`
- profile：`default`
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/104-o023-flow-run-config/perf/before.<sha>.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/104-o023-flow-run-config/perf/after.<sha>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/104-o023-flow-run-config/perf/before.<sha>.default.json --after specs/104-o023-flow-run-config/perf/after.<sha>.default.json --out specs/104-o023-flow-run-config/perf/diff.before__after.default.json`
- Failure Policy：`comparable=false` 或 `stabilityWarning` 时禁止结论并复测。

## Project Structure

### Documentation (this feature)

```text
specs/104-o023-flow-run-config/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── run-config-contract.md
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
├── FlowRuntime.ts
├── TaskRunner.ts
└── BoundApiRuntime.ts

packages/logix-core/test/
apps/docs/content/docs/
examples/logix/
```

**Structure Decision**: 语义收敛集中在 runtime core 的执行策略层；文档示例同步切换为 `run(config)`。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
