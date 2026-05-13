# 190 Kernel Patch Assimilation Preflight Tasks

**Priority:** P0  
**Depends On:** none

## Tasks

- [x] **T001 Inspect current worktree:** Run `git status --short` and record whether the previous patch has already been applied.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Apply or verify previous patch:** If not already applied, unzip `logix-kernel-hotpath-convergence-patch-bundle.zip` and run its `inspect_patch_context.sh` then `apply_patch.sh`.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Run focused tests:** Run the six focused test files listed in this spec; record output.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Fix only assimilation errors:** Resolve compile/test conflicts caused by the patch; do not introduce new behavior.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Write preflight note:** Create `docs/next/kernel-stabilization-preflight.md` with commands, outcomes, and blockers.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Focused test commands listed in handoff either pass or have a documented blocker with exact failing assertion.
- [x] No public root export or React host hook surface changes are introduced.
- [x] `docs/next/kernel-stabilization-preflight.md` exists and is concise enough for the next agent to resume without re-discovery.
