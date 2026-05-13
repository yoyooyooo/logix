# 197 Selector RuntimeStore Lifecycle Cleanup Specification

**Status:** Implemented  
**Priority:** P1  
**Created:** 2026-05-11  
**Depends On:** 190, 195

## Purpose

收紧 SelectorGraph / RuntimeStore / React RuntimeExternalStore 的 retain-release、readQuery snapshot、runSync fallback 和 hot lifecycle cleanup。

## Scope

Core continues to own selector route and topic lifecycle. React external stores consume RuntimeStore snapshots and topic retention only. This requirement adds lifecycle guards and narrows fallback runSync to hydration/missing snapshot cases, then proves unmount/hot dispose does not retain topic stores. No new React hook family is allowed.

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** ReadQuery external store snapshot must read RuntimeStore committed module state before `runtime.runSync(moduleRuntime.getState)`.
- **FR-002:** Fallback `runSync` must be observable in tests through an internal test hook or counter, and must be zero after committed snapshot exists.
- **FR-003:** Topic retain/release counts must return to zero after unmount and hot lifecycle dispose.
- **FR-004:** React `useSelector` must continue consuming `RuntimeContracts.Selector.route`; it must not reintroduce local lane/eligibility policy.
- **FR-005:** No new public React selector hooks or host laws may appear.
## Non-Goals
- **NG-001:** Do not redesign selector fingerprinting.
- **NG-002:** Do not add public selector descriptors.
- **NG-003:** Do not claim render isolation or perf improvement.
## Acceptance Criteria
- **AC-001:** SelectorGraph topic retain contract proves release is idempotent and no negative counts occur.
- **AC-002:** React external store cleanup test proves retained store/topic count reaches zero after unmount/hot dispose.
- **AC-003:** React guard tests continue to reject local selector route policy.
## Target Files

### Create
- `packages/logix-react/test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx`
### Modify
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts`
- `packages/logix-react/src/internal/hooks/useSelector.ts`
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- `packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
### Focused Tests
- `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.topicRetain.contract.test.ts`
- `packages/logix-core/test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts`
- `packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- `packages/logix-react/test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorStoreResidue.guard.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
