# Implementation Plan: O-025 DevtoolsHub 投影分层（light/full）

**Branch**: `106-o025-devtoolshub-tiered-projection` | **Date**: 2026-02-26 | **Spec**: `specs/106-o025-devtoolshub-tiered-projection/spec.md`  
**Input**: Feature specification from `specs/106-o025-devtoolshub-tiered-projection/spec.md`

## Source Traceability

- **Backlog Item**: O-025
- **Source File**: `docs/todo-optimization-backlog/items/O-025-devtoolshub-tiered-projection.md`

## Summary

在 DevtoolsHub 引入 light/full 投影分层：full 保持完整重资产，light 仅输出摘要与降级原因；消费端先适配 degraded 语义后再切默认 light。

## Technical Context

**Language/Version**: TypeScript 5.9.x  
**Primary Dependencies**: `@logixjs/core`, Devtools/Replay/Evidence 消费端  
**Storage**: N/A  
**Testing**: runtime tests + consumer matrix tests  
**Target Platform**: Node.js + browser consumers  
**Project Type**: pnpm workspace  
**Performance Goals**: light 写入成本显著低于 full  
**Constraints**: Slim 诊断、可序列化、单一锚点、forward-only  
**Scale/Scope**: `DevtoolsHub.ts` 与消费端协同迁移

## Constitution Check

_GATE: 进入实现前必须通过，Phase 1 后复核。_

- docs-first：先更新规格与 contracts，再改实现。
- 诊断成本预算：
  - degraded 原因码必须可解释（`code/message/recommendedAction`），并可序列化。
  - 运行时需保留 `exportBudget(dropped/oversized)` 以量化投影裁剪成本。
- 性能预算：
  - light/full 对比必须有可复现证据（同 workload、同 envId、同 profile）。
  - 验收信号优先看写入体积差（`latest*` 写入规模）与时延比值。
- IR / Anchor 漂移控制：
  - 统一锚点为 `staticIrDigest`，通过 `summary.converge.staticIrByDigest` 保持可解释链路。
  - light 模式不得引入第二事实源，不回填 `latestStates/latestTraitSummaries` 重资产。
- 稳定标识约束：
  - `runtimeLabel/moduleId/instanceId/txnSeq/eventSeq` 必须稳定、可复现、可追踪。
  - snapshot 读模型依赖 `snapshotToken` 触发一致性更新。
- 迁移与回滚说明：
  - Stage 1：消费端先适配 degraded 语义与 projection tier。
  - Stage 2：默认策略再切到 light。
  - 回滚：统一通过 `mode: 'full'` 回退，不引入长期兼容层。
- forward-only：消费端通过迁移说明完成适配，不做长期兼容层。

### Gate Result

- PASS（文档计划阶段）

## Perf Evidence Plan（MUST）

- Baseline 语义：light vs full 对照
- envId：`darwin-arm64.node20`
- profile：`default`
- collect：
  - `pnpm perf collect -- --profile default --out specs/106-o025-devtoolshub-tiered-projection/perf/light.<sha>.json`
  - `pnpm perf collect -- --profile default --out specs/106-o025-devtoolshub-tiered-projection/perf/full.<sha>.json`
- diff：
  - `pnpm perf diff -- --before specs/106-o025-devtoolshub-tiered-projection/perf/full.<sha>.json --after specs/106-o025-devtoolshub-tiered-projection/perf/light.<sha>.json --out specs/106-o025-devtoolshub-tiered-projection/perf/diff.full__light.json`

## Project Structure

### Documentation (this feature)

```text
specs/106-o025-devtoolshub-tiered-projection/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── projection-tier-contract.md
│   ├── consumer-degraded-contract.md
│   └── migration.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts
packages/logix-devtools-react/
packages/logix-sandbox/
apps/docs/content/docs/
```

**Structure Decision**: 分层语义在 DevtoolsHub 落地，消费者按 staged 方式升级。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
