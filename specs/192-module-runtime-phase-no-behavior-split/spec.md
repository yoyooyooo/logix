# 192 ModuleRuntime Phase No-Behavior Split Specification

**Status:** Implemented  
**Priority:** P0  
**Created:** 2026-05-11  
**Depends On:** 190

## Purpose

把 ModuleRuntime.impl 的 transaction/post-commit/run wiring 拆出主 make 文件，降低后续语义修改风险。

## Scope

`ModuleRuntime.impl.ts` 是运行时中心文件，任何 dirty/source/selector/lifecycle 修改都会碰它。本需求只按既有边界提取：make option normalization、transaction phase orchestration、post-commit publishing、field-kernel installation glue。不得改变 Runtime.make、module runtime object shape 或 scheduling semantics。

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** `ModuleRuntime.makeOptions.ts` must own defaults, option normalization, and instance id helpers.
- **FR-002:** `ModuleRuntime.postCommit.ts` must own post-commit phase timing/publish helpers currently embedded in transaction flow.
- **FR-003:** `ModuleRuntime.fieldKernelInstall.ts` must own field program installation wiring and no runtime public surface.
- **FR-004:** `ModuleRuntime.impl.ts` must remain the make coordinator, not a dumping ground for phase logic.
- **FR-005:** No behavior change is allowed in transaction queue, readiness, lanes, async escape guard, source sync, validate, or selector commit.
## Non-Goals
- **NG-001:** Do not change scheduling policy.
- **NG-002:** Do not change transaction phase order.
- **NG-003:** Do not add new runtime diagnostics.
## Acceptance Criteria
- **AC-001:** Focused ModuleRuntime lifecycle, transaction, lane, and readiness tests pass.
- **AC-002:** New decomposition guard fails if `ModuleRuntime.impl.ts` re-imports moved internal helpers by copy/paste rather than delegating.
- **AC-003:** No public Runtime or Module types change.
## Target Files

### Create
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.makeOptions.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.postCommit.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.fieldKernelInstall.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.decomposition.guard.test.ts`
### Modify
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.RunAfterReadiness.contract.test.ts`
### Focused Tests
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.RunAfterReadiness.contract.test.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.RunDoesNotBlockReady.contract.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
