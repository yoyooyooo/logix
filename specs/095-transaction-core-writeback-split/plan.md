# Implementation Plan: Transaction Core Writeback Split（O-002）

**Branch**: `095-transaction-core-writeback-split` | **Date**: 2026-02-25 | **Spec**: `specs/095-transaction-core-writeback-split/spec.md`
**Input**: `specs/095-transaction-core-writeback-split/spec.md`

## Summary

本阶段只做“结构切分 + 可解释阶段化”，不做行为重写：

- 在 `ModuleRuntime.transaction.ts` 抽出 post-commit 统一入口（建议 `runPostCommitPhases`）。
- 保持事务提交语义、事件顺序、`txnId/txnSeq` 稳定性不变。
- 通过测试证明“重构等价”。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）
**Primary Dependencies**: effect v3、logix-core runtime internals
**Testing**: Vitest + `@effect/vitest`（非 watch）
**Project Type**: pnpm workspace
**Scope**:

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`（仅必要时）
- `packages/logix-core/test/internal/Runtime/**`（transaction/post-commit 相关）

## Constitution Check

_GATE: Must pass before implementation. Re-check after Phase 1._

- 性能与可诊断优先：本轮变更必须可复现验证，且不破坏诊断链。
- 统一最小 IR / 稳定锚点：不引入新真相源，不变更稳定标识语义。
- 事务窗口禁止 IO：不引入事务内 IO/await。
- forward-only：允许结构性重构；若后续行为变更，走迁移说明而非兼容层。

### Gate Result

- PASS（进入第一阶段）

## Perf Evidence Plan

- 第一阶段目标：语义等价重构，以“最小验证 + 可复现实验命令”为证据。
- 命令建议：
  - `pnpm --filter @logixjs/core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.test.ts`
  - `pnpm --filter @logixjs/core typecheck:test`
- 若发现性能异常，再补 collect/diff 证据到 `specs/095-transaction-core-writeback-split/perf/`。

## Phase Plan

### Phase 0 - Spec Artifacts

- 完成 `spec.md / plan.md / tasks.md`。

### Phase 1 - Post-Commit Phase Extraction

- 把 commit 后逻辑提取为显式阶段入口，保持顺序不变。

### Phase 2 - Behavior Lock & Verification

- 补/改顺序断言与标识稳定性测试。
- 跑最小测试与类型门禁并记录结果。

## Project Structure

```text
specs/095-transaction-core-writeback-split/
├── spec.md
├── plan.md
└── tasks.md

packages/logix-core/src/internal/runtime/core/
├── ModuleRuntime.transaction.ts
└── StateTransaction.ts (optional)

packages/logix-core/test/internal/Runtime/
└── ** (transaction/post-commit related)
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| None | N/A | N/A |
