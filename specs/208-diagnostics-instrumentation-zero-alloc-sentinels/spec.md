# Feature Specification: Diagnostics and Instrumentation Zero-Alloc Sentinels

**Feature Branch**: `208-diagnostics-instrumentation-zero-alloc-sentinels`
**Created**: 2026-05-11
**Status**: Planned
**Priority**: P1
**Input**: Runtime transaction fixed-cost wave handoff.

## Summary

This spec installs focused sentinel counters/guards for diagnostics=off and instrumentation=light. The point is not to claim total zero allocation from timing alone; it is to make object materialization, debug event allocation, implicit arrays, join/split roundtrips, and dirtyAll fallback visible as test failures where the contract says they are forbidden.

## Goal

Prevent instrumentation added for phase proof from becoming a new hot-path allocation tax.

## Dependencies

203; can run in parallel with 204-207 if code ownership is coordinated

## Tax Points Covered

- debugEventAllocCount.off
- patchObjectMaterializeCount.light
- snapshotObjectMaterializeCount.light
- joinSplitInTxnWindowCount
- dirtyAllFallbackCount.p1Gate

## Functional Requirements

- **FR-001**: The implementation MUST target only the tax points listed above for this spec.
- **FR-002**: The implementation MUST preserve public API shape and runtime transaction semantics.
- **FR-003**: The implementation MUST add or update a focused guard before changing production code.
- **FR-004**: The implementation MUST record command outcomes and unresolved blockers in `handoff.md`.
- **FR-005**: The implementation MUST keep evidence fields stable enough for the later tax migration report.

## Non-Functional Requirements

- **NFR-001**: `diagnostics=off` MUST NOT allocate debug/trace payload objects.
- **NFR-002**: Transaction window code MUST remain synchronous and MUST NOT introduce IO, `await`, timers, or write escape hatches.
- **NFR-003**: If any evidence is non-comparable, has stability warnings, or is collected with `quick`, it MUST be labelled as a clue only.
- **NFR-004**: Any optimization that lowers total time but raises another phase MUST be recorded as tax migration, not success.
- **NFR-005**: The work MUST be reviewable as a single spec-sized PR.

## Target Files

### Create

- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`

### Modify

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- `packages/logix-core/test/observability/DebugSink.record.off.test.ts`

## Focused Tests / Commands

```bash
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts
pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts
pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts
pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts
```

## Acceptance Criteria

- **AC-001**: diagnostics=off does not construct debug event payloads or phase trace objects.
- **AC-002**: instrumentation=light does not materialize patch/snapshot objects at call sites.
- **AC-003**: Sentinel counters are test/internal only or disabled by default; they do not become public API.
- **AC-004**: A guard fails if join/split roundtrips, rest-arg allocation, or P1 dirtyAll fallback reappears in covered hot paths.

## Non-Goals

- Do not add public root exports or public submodules.
- Do not add user-facing config for test-only measurement switches.
- Do not make broad performance claims from this spec alone.
- Do not run destructive git commands.
- Do not batch unrelated tax points into this spec.

## Handoff Requirements

The local agent must update `handoff.md` with:

- changed files;
- focused commands and outcome;
- any phase/tax migration observed;
- any evidence files written;
- next recommended spec.
