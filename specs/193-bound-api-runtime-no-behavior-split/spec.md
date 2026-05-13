# 193 BoundApiRuntime No-Behavior Split Specification

**Status:** Implemented  
**Priority:** P0  
**Created:** 2026-05-11  
**Depends On:** 190

## Purpose

把 BoundApiRuntime 的 readiness、direct state write metadata、Logic builder factory 和 facade assembly 拆开，避免生命周期/authoring 后续改动污染热路径。

## Scope

`BoundApiRuntime.ts` 已有 `BoundApiRuntime.readiness.ts`，但仍同时承载 direct state write metadata、Logic builder factory、state/action facade assembly。本需求不改 Bound API 行为，只把职责拆成 focused internal modules，并用 existing tests 保证 readiness/logic authoring 不漂移。

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** Direct state write symbol and metadata helpers must move to `BoundApiRuntime.directStateWrite.ts`.
- **FR-002:** Logic builder factory must move to `BoundApiRuntime.logicBuilder.ts` and preserve sealed `$.readyAfter` semantics.
- **FR-003:** Facade assembly helpers must move to `BoundApiRuntime.facade.ts` without adding public families.
- **FR-004:** `BoundApiRuntime.ts` must remain a make coordinator and compatibility entry.
- **FR-005:** No new `$.startup.*`, `$.ready.*`, or lifecycle authoring namespace may appear.
## Non-Goals
- **NG-001:** Do not redesign lifecycle readiness.
- **NG-002:** Do not change Logic authoring shape.
- **NG-003:** Do not add new public convenience API.
## Acceptance Criteria
- **AC-001:** Readiness and Logic lifecycle contract tests pass unchanged.
- **AC-002:** Decomposition guard enforces moved responsibilities.
- **AC-003:** Text sweep continues to reject lifecycle API family drift.
## Target Files

### Create
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.directStateWrite.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.logicBuilder.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.facade.ts`
### Modify
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.readiness.ts`
- `packages/logix-core/test/internal/Runtime/BoundApiRuntime.decomposition.guard.test.ts`
- `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`
### Focused Tests
- `packages/logix-core/test/internal/Runtime/BoundApiRuntime.decomposition.guard.test.ts`
- `packages/logix-core/test/Contracts/LogicLifecycleAuthoringSurface.contract.test.ts`
- `packages/logix-core/test/Contracts/LogicLifecycleTextSweep.contract.test.ts`
- `packages/logix-core/test/Logic/LogicPhaseAuthoringContract.test.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/ModuleRuntime.ReadinessRequirement.contract.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
