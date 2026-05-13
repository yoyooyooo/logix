# 198 ExternalStore Scheduler Lifecycle Closure Specification

**Status:** Implemented  
**Priority:** P1  
**Created:** 2026-05-11  
**Depends On:** 190, 196

## Purpose

收紧 field-kernel externalStore writeback coordinator 的 coalescing、cancel、dispose 和 urgent/low-priority 关系。

## Scope

The existing coordinator stages writebacks and schedules flushes through HostScheduler. This requirement adds lifecycle-safe cancellation and structural counters in tests only. It must not alter externalStore public authoring shape or source semantics. Urgent transactions must not be delayed by low-priority external store storms. Sink/counter recording is internal only. 

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** Scheduled flush must be cancellable on coordinator close/dispose.
- **FR-002:** Same-tick burst should coalesce into one transaction for a field/coordinator when policy allows it.
- **FR-003:** `coalesceWindowMs > 0` must not schedule duplicate flushes for the same generation.
- **FR-004:** Low-priority externalStore writebacks must not block urgent runtime transaction enqueue/commit ordering.
- **FR-005:** Internal structural counters may be used in tests, but no benchmark/perf collection scripts may be added.
## Non-Goals
- **NG-001:** Do not change externalStore public DSL.
- **NG-002:** Do not rewrite HostScheduler.
- **NG-003:** Do not add runtime telemetry.
## Acceptance Criteria
- **AC-001:** Dispose-cancel test proves pending scheduled flush is not executed after unsubscribe/dispose.
- **AC-002:** Coalesce tests prove one transaction for same tick/window where expected.
- **AC-003:** Urgent interleave test proves urgent state write completes even under queued low-priority externalStore writes.
## Target Files

### Create
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.DisposeCancelsFlush.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.UrgentInterleave.test.ts`
### Modify
- `packages/logix-core/src/internal/field-kernel/external-store.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.TxnWindow.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.Ownership.test.ts`
- `packages/logix-react/test/internal/store/RuntimeExternalStore.lowPriority.test.ts`
### Focused Tests
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.TxnWindow.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.DisposeCancelsFlush.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.UrgentInterleave.test.ts`
- `packages/logix-react/test/internal/store/RuntimeExternalStore.lowPriority.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
