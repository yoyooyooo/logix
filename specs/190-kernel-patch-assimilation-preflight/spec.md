# 190 Kernel Patch Assimilation Preflight Specification

**Status:** Implemented  
**Priority:** P0  
**Created:** 2026-05-11  
**Depends On:** none

## Purpose

把上一波 hotpath convergence patch 纳入本地工作树，并建立本轮需求的共同前置条件。

## Scope

这是一个前置稳定化需求，不引入新语义。它只负责应用上一波补丁、修复类型/测试冲突、证明 public surface 没有漂移，并把本轮后续需求的基准状态写入本地 handoff。

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** The previous patch bundle must apply cleanly or conflict resolutions must be documented file-by-file.
- **FR-002:** Focused tests covering converge planner, source dirty gate, selector dirty fallback, core public surface, and React selector route ownership must pass before any semantic follow-up starts.
- **FR-003:** Any type error introduced by patch assimilation must be fixed without widening public API or weakening tests.
- **FR-004:** A local preflight note must list the exact commit/worktree state, conflicts resolved, focused commands run, and remaining known failures if any.
## Non-Goals
- **NG-001:** No benchmark or perf evidence collection.
- **NG-002:** No refactor beyond what is necessary to assimilate the existing patch.
- **NG-003:** No new diagnostics families.
## Acceptance Criteria
- **AC-001:** Focused test commands listed in handoff either pass or have a documented blocker with exact failing assertion.
- **AC-002:** No public root export or React host hook surface changes are introduced.
- **AC-003:** `docs/next/kernel-stabilization-preflight.md` exists and is concise enough for the next agent to resume without re-discovery.
## Target Files

### Create
- `docs/next/kernel-stabilization-preflight.md`
### Modify
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
### Focused Tests
- `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorStoreResidue.guard.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
