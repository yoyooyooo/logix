# Diagnostics and Instrumentation Zero-Alloc Sentinels Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent instrumentation added for phase proof from becoming a new hot-path allocation tax.

**Architecture:** This spec isolates one part of the runtime transaction fixed-cost wave. The implementation must keep public API stable, preserve transaction semantics, and make phase/tax movement observable rather than hidden. It uses focused tests and sentinel-style evidence before any hard performance claim.

**Tech Stack:** TypeScript 5.x, Effect, Vitest, pnpm monorepo, Logix core/react perf-boundary harness.

---

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not bypass transaction queue semantics. Fast paths must be branch-shape optimizations, not semantic shortcuts.
- Do not move correctness ownership to React, Playground, Devtools, CLI, or examples.
- Do not claim performance success from `quick`, dirty, unstable, or non-comparable evidence.
- Do not introduce public runtime config for test-only A/B switches.
- Do not add diagnostics/debug payload construction on `diagnostics=off`.
- Do not put IO, `await`, timers, or write escape hatches inside the transaction window.
- Do not use destructive git operations: `git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`.
- Keep each member spec as a small PR. Commit after each focused task group passes.
- If a focused test reveals a pre-existing unrelated failure, record it in `handoff.md`; do not hide it with broad changes.

## File Structure / Responsibility Map

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

### Focused Tests

- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- `pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- `pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts`
- `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`

## Implementation Notes

- Start with tests or checklist/preflight material.
- Keep code edits within the listed files unless inspection proves a narrower adjacent file is the true owner.
- If another file is required, record the reason in `handoff.md` before editing it.
- Do not turn measurements into production payload allocation.

## Chunk 1: Implementation Tasks


### Task 1: Define internal sentinel contract

**Task ID:** T001

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Create: `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Modify: `packages/logix-core/test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Test: `pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Create txnHotPathSentinels.ts or equivalent test-only helper; keep it internal and tree-shakeable/off by default.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Define internal sentinel contract`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T001>
  git commit -m "chore(runtime): diagnostics-instrumentation-zero-alloc-sentinels t001"
  ```


### Task 2: Write diagnostics-off guard

**Task ID:** T002

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Create: `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Modify: `packages/logix-core/test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Test: `pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test that diagnostics=off leaves debugEventAllocCount at 0 during repeated dispatch.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write diagnostics-off guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T002>
  git commit -m "chore(runtime): diagnostics-instrumentation-zero-alloc-sentinels t002"
  ```


### Task 3: Write instrumentation-light guard

**Task ID:** T003

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Create: `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Modify: `packages/logix-core/test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Test: `pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Add a test that patch/snapshot object materialization counters stay 0 in instrumentation=light.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Write instrumentation-light guard`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T003>
  git commit -m "chore(runtime): diagnostics-instrumentation-zero-alloc-sentinels t003"
  ```


### Task 4: Wire minimal counters

**Task ID:** T004

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Create: `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Modify: `packages/logix-core/test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Test: `pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Increment counters only at forbidden materialization points; avoid allocations to record the counter itself.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Wire minimal counters`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T004>
  git commit -m "chore(runtime): diagnostics-instrumentation-zero-alloc-sentinels t004"
  ```


### Task 5: Run off/light tests

**Task ID:** T005

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Create: `packages/logix-core/src/internal/runtime/core/txnHotPathSentinels.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Modify: `packages/logix-core/test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts`
- Test: `pnpm -C packages/logix-core test test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- Test: `pnpm -C packages/logix-core test test/observability/DebugSink.record.off.test.ts`
- Test: `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.transaction.AsyncEscapeGuard.Perf.off.test.ts`

- [ ] **Step 1: Inspect the current code path**

  Read only the target files for this task. Identify the smallest symbol/function boundary to change. Do not edit yet.

- [ ] **Step 2: Write the failing guard or checklist entry**

  Expected before implementation: FAIL for the intended missing behavior, or a checklist/preflight gap is visible.

  ```text
  Run focused diagnostics and transaction tests; record any counter names in handoff.md.
  ```

- [ ] **Step 3: Run the narrow command**

  Run:

  ```bash
  pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts
  ```

  Expected: FAIL for the intended reason if this task adds a new guard; otherwise PASS/known current result recorded in `handoff.md`.

- [ ] **Step 4: Implement the minimal change**

  Implement only `Run off/light tests`. Do not widen public API. Do not collect broad perf. Do not hide tax migration.

- [ ] **Step 5: Run focused tests**

  Run the relevant commands listed above. Expected: PASS, or pre-existing unrelated failure explicitly recorded.

- [ ] **Step 6: Update handoff and commit**

  ```bash
  git add <changed-files-for-T005>
  git commit -m "chore(runtime): diagnostics-instrumentation-zero-alloc-sentinels t005"
  ```


## Completion Gate

- [ ] diagnostics=off does not construct debug event payloads or phase trace objects.
- [ ] instrumentation=light does not materialize patch/snapshot objects at call sites.
- [ ] Sentinel counters are test/internal only or disabled by default; they do not become public API.
- [ ] A guard fails if join/split roundtrips, rest-arg allocation, or P1 dirtyAll fallback reappears in covered hot paths.

## Final Verification

Run the focused command set for this spec. If this spec changes shared runtime internals, also run:

```bash
pnpm typecheck
pnpm typecheck:test
```

Update `handoff.md` with pass/fail evidence and the next recommended spec.
