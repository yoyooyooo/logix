# 194 DirtyPlan Converge Single Source Specification

**Status:** Implemented  
**Priority:** P0  
**Created:** 2026-05-11  
**Depends On:** 190, 191

## Purpose

把 converge 正常热路径从 dirtyPlan 优先推进到 dirtyPlan 唯一事实源，legacy dirty handoff 只保留在 adapter/fallback。

## Scope

`ConvergePlanRequest` 当前同时有 `dirtyPlan` 和 legacy `dirtyAllReason/dirtyPaths/dirtyPathsKeyHash/dirtyPathsKeySize`。本需求把 production `planConverge` request 收窄为 dirtyPlan-only，并新增 explicit legacy adapter 供旧 tests 或特殊 compatibility 使用。dirtyPlan 存在时，legacy 输入不得改变 mode、reason、planKeyHash 或 affected steps。

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** `ConvergePlanRequest` must not expose `dirtyPaths`, `dirtyAllReason`, `dirtyPathsKeyHash`, or `dirtyPathsKeySize` on the normal production path.
- **FR-002:** Create `planConvergeFromLegacyDirtyInput` or equivalent adapter in `converge-legacy-dirty-adapter.ts` for compatibility-only callers.
- **FR-003:** `planConverge` must derive dirty all/exact empty/exact roots only from `TxnDirtyPlanSnapshot`.
- **FR-004:** Plan cache key must use `dirtyPlan.rootKeyHash`, `rootCount`, `authority`, and scheduling scope; legacy hashes cannot participate in normal keying.
- **FR-005:** Execution must not recompute dirty roots from raw dirty paths when a committed/phase dirtyPlan is present.
## Non-Goals
- **NG-001:** Do not change convergence semantics or computed values.
- **NG-002:** Do not change budget policy.
- **NG-003:** Do not add perf claims.
## Acceptance Criteria
- **AC-001:** A test proves conflicting legacy dirty input cannot override a precise dirtyPlan.
- **AC-002:** A test proves exact empty dirtyPlan remains noop even when legacy dirty paths are non-empty in the adapter case.
- **AC-003:** Converge existing correctness, rollback, unknown write, and stable hash tests pass.
## Target Files

### Create
- `packages/logix-core/src/internal/field-kernel/converge-legacy-dirty-adapter.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.LegacyDirtyInputGuard.test.ts`
### Modify
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`
- `packages/logix-core/src/internal/field-kernel/converge.types.ts`
- `packages/logix-core/src/internal/field-kernel/plan-cache.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
### Focused Tests
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.ExactEmptyDirtyPlan.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.UnknownWriteCoverage.test.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.GenerationInvalidation.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
