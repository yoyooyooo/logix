# Implementation Plan: O-026 Trace 载荷 digest-first 精简

**Branch**: `107-o026-trace-digest-first` | **Date**: 2026-02-26 | **Spec**: `specs/107-o026-trace-digest-first/spec.md`  
**Input**: Feature specification from `specs/107-o026-trace-digest-first/spec.md`

## Source Traceability

- **Backlog Item**: O-026
- **Source File**: `docs/todo-optimization-backlog/items/O-026-trace-digest-first-payload.md`

## Summary

将 trace 事件切换到 digest-first：事件只保留 `staticIrDigest + anchor` 关键字段，详细结构按需回查静态 IR；以三端先适配、后切默认的顺序完成迁移。

## Technical Context

**Language/Version**: TypeScript 5.9.x  
**Primary Dependencies**: `@logixjs/core`, Devtools/Replay/Platform consumers  
**Storage**: N/A  
**Testing**: runtime trace tests + cross-consumer contract tests  
**Target Platform**: Node.js + browser consumers  
**Project Type**: pnpm workspace  
**Performance Goals**: bytes/event（p50）降幅 ≥30%、编码时延（p95）降幅 ≥15%、导出吞吐（p50）提升 ≥10%，且 digest 计算开销（p95）回归 ≤5%  
**Constraints**: Slim payload、可序列化、稳定锚点、forward-only  
**Scale/Scope**: `DebugSink`/`ReplayLog`/`evidenceCollector` 与消费端适配

## Constitution Check

_GATE: 进入实现前必须通过，Phase 1 后复核。_

- docs-first：先落 digest 合同与迁移文档。
- 性能预算（硬门）：必须量化 bytes/event（p50）、编码时延（p95）、导出吞吐（p50）、digest 计算开销（p95）；门槛分别为 `-30% / -15% / +10% / <= +5%`。
- 诊断约束：payload Slim 且可序列化；`missing`/`mismatch` 两类降级场景必须 100% 输出 `reasonCode + anchor`，可审计可解释。
- 锚点一致：`staticIrDigest + nodeId/stepId + instanceId/txnSeq/opSeq` 单一来源。
- forward-only：旧重载荷字段迁移后删除，不保留长期兼容。

### Gate Result (Pre-Design)

- PASS（文档计划阶段）

### Gate Result (Acceptance Criteria)

- 仅当以下条件全部满足才判定 PASS：
  - `pnpm perf diff` 输出 `meta.comparability.comparable=true` 且 `summary.regressions==0`。
  - bytes/event（p50）降幅 ≥30%。
  - 编码时延（p95）降幅 ≥15%。
  - 导出吞吐（p50）提升 ≥10%。
  - digest 计算开销（p95）回归 ≤5%。
  - `missing`/`mismatch` 降级路径均产出可序列化 `reasonCode + anchor` 记录。
- 任一条件不满足即 Gate Fail，禁止切 runtime 默认 digest-only。

## Perf Evidence Plan（MUST）

- Baseline 语义：before/after
- envId：`darwin-arm64.node20`
- profile：`default`
- 可比性前置：before/after 必须同 `envId + profile`；若报告包含 `meta.matrixId/matrixHash`，两侧必须一致。
- collect（before）：
  - `pnpm perf collect -- --profile default --out specs/107-o026-trace-digest-first/perf/before.<sha>.default.json`
- collect（after）：
  - `pnpm perf collect -- --profile default --out specs/107-o026-trace-digest-first/perf/after.<sha>.default.json`
- diff：
  - `pnpm perf diff -- --before specs/107-o026-trace-digest-first/perf/before.<sha>.default.json --after specs/107-o026-trace-digest-first/perf/after.<sha>.default.json --out specs/107-o026-trace-digest-first/perf/diff.before__after.default.json`
- PASS 判据：`meta.comparability.comparable=true` 且 `summary.regressions==0`，同时满足 `bytes/event p50 <= -30%`、`encode latency p95 <= -15%`、`export throughput p50 >= +10%`、`digest compute p95 <= +5%`。
- Failure Policy：若出现 `comparable=false`、`stabilityWarning`、`timeout`、`missing suite` 或任一阈值不达标，结论标注为 FAIL，并复测后再推进。

## Project Structure

### Documentation (this feature)

```text
specs/107-o026-trace-digest-first/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── digest-payload-contract.md
│   ├── replay-lookup-contract.md
│   └── migration.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── DebugSink.record.ts
├── ReplayLog.ts
└── ...

packages/logix-core/src/internal/observability/evidenceCollector.ts
packages/logix-devtools-react/
packages/logix-sandbox/
```

**Structure Decision**: 合同先行，消费端先适配，再切 runtime 默认 digest-first。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
