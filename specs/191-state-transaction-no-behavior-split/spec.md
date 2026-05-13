# 191 StateTransaction No-Behavior Split Specification

**Status:** Implemented  
**Priority:** P0  
**Created:** 2026-05-11  
**Depends On:** 190

## Purpose

把 StateTransaction 事务事实源继续拆成 focused modules，为 dirtyPlan 单事实源语义收口留出安全修改空间。

## Scope

当前已有 `StateTransaction.dirty.ts`、`StateTransaction.patch.ts`、`StateTransaction.snapshot.ts`，主文件仍持有上下文创建、事务生命周期、dirty marking、commit/abort 等多个职责。本需求只做 no-behavior split：移动代码、保持导出兼容、让 decomposition guard 证明主文件不再重新膨胀。

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** `StateTransaction.types.ts` must own type-only exports that are currently declared in `StateTransaction.ts`.
- **FR-002:** `StateTransaction.context.ts` must own `makeContext` and initial state construction only.
- **FR-003:** `StateTransaction.lifecycle.ts` must own `beginTransaction`, `updateDraft`, `commitWithState`, `commit`, and `abort` only.
- **FR-004:** `StateTransaction.ts` must become a compatibility barrel plus minimal constants only; consumers should not need import changes outside this folder.
- **FR-005:** No behavior, emitted transaction shape, dirtyPlan shape, patch count, or list evidence behavior may change.
## Non-Goals
- **NG-001:** Do not change dirtyPlan authority semantics.
- **NG-002:** Do not optimize allocations.
- **NG-003:** Do not add fallback reasons or counters in this PR.
## Acceptance Criteria
- **AC-001:** Existing transaction, dirty plan, patch, and list evidence tests pass unchanged.
- **AC-002:** Decomposition guard enforces `StateTransaction.ts` as a narrow facade and prevents reintroducing lifecycle logic into the barrel.
- **AC-003:** `git diff` shows code movement plus imports only; no semantic branch changes.
## Target Files

### Create
- `packages/logix-core/src/internal/runtime/core/StateTransaction.context.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.lifecycle.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.types.ts`
### Modify
- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/test/internal/Runtime/StateTransaction.decomposition.guard.test.ts`
- `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
### Focused Tests
- `packages/logix-core/test/internal/Runtime/StateTransaction.decomposition.guard.test.ts`
- `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.RefList.ChangedIndicesFromTxnEvidence.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.TransactionBoundary.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
