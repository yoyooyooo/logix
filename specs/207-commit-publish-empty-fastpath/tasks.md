# 207 Commit Publish Empty Fast Path Tasks

**Priority:** P1
**Depends On:** 203, 206 recommended before this spec

## Tasks

- [x] **T001 Write empty publish guard:** Add a test that empty publish path does not iterate or clone subscriber/hook structures.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Write active subscriber guard:** Add a test that active selectors/topics still receive exactly one coherent commit notification.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Implement empty publish predicate:** Compute and use a small internal predicate for no subscribers/no topics/no hooks/no rowId sync.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Preserve hook ordering:** Ensure onCommit before/after hooks still run in documented order when present.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Run no-tearing and selector suites:** Run RuntimeStore/useSelector/no-tearing tests; record any tail cost migration.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] Commit with no subscribers, no topics, no hooks, and no rowId sync requirement does not iterate empty collections or clone hook arrays.
- [x] Existing selector/no-tearing/topic retain-release tests pass unchanged.
- [x] The fast path does not suppress commit state update when state actually changed.
- [x] The dispatch-shell evidence can report commitPublishCommitMs and hook timings without off-path allocation.

## Implementation Notes

- The production change only skips `PubSub.publish(commitHub, ...)` when `ModuleRuntime.impl.ts` reports zero commit-hub subscribers.
- RuntimeStore / selector `onCommit` glue remains intact because it also owns tick/no-tearing notification semantics.
- No commit was created because this workspace forbids automatic `git add` / `git commit` unless the user explicitly asks.
