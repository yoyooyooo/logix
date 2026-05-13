# 205 Txn Queue and Lane Empty Fast Path Tasks

**Priority:** P1
**Depends On:** 203

## Tasks

- [x] **T001 Write direct-idle semantic guard:** Add a test that no-backlog urgent/default transactions preserve enqueue order and queue timing shape.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Write backlog escape guard:** Add a test proving nonUrgent/backlog/visibility-window cases do not take the empty fast path.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Move invariant policy work out of hot branch:** Precompute or memoize default lane policy where possible without changing overrides.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Thin direct-idle branch:** Implement the minimal no-backlog branch inside txnQueue while retaining queue-owned handoff.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Run focused lane suite:** Run lane and queue tests; record any tax migration to commit publish/body shell.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] A direct-idle no-backlog dispatch still enters the queue boundary and emits equivalent transaction order semantics.
- [x] The fast path records or exposes zero/near-zero backpressure and wait timing without fabricating trace payloads when diagnostics are off.
- [x] Backlog, nonUrgent lane, visibility window, and override cases continue to use the full path.
- [x] No scheduling starvation or priority inversion is introduced.

## Implementation Notes

- The production change is limited to `ModuleRuntime.txnQueue.ts`.
- Direct-idle acquisition still owns `currentWaiter/currentLane`, records the same queue start trace, and releases through `advanceQueue(...)` plus backpressure slot release.
- The branch avoids awaiting its own start Deferred and records no backpressure timing for immediately acquired slots.
- No `ModuleRuntime.txnLanePolicy.ts` or `ModuleRuntime.transaction.ts` changes were needed.
- No commit was created because this workspace forbids automatic `git add` / `git commit` unless the user explicitly asks.
