# 209 Txn Buffer Clear and Key Materialization Sentinels Tasks

**Priority:** P1
**Depends On:** 208 recommended before this spec

## Tasks

- [x] **T001 Write large-then-small sentinel:** Add a test that simulates large dirty burst followed by repeated one-field txns and records clear/key counters.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Write dirtyPlan cache identity guard:** Assert same-phase repeated materializeDirtyPlanSnapshot returns cached identity/equivalent counters.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Wire key materialization counters:** Instrument transaction-window Array.from/join/split/key materialization points with internal counters.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Do not over-optimize prematurely:** Only add generation stamping/touched-word clear if sentinel shows clear tax; otherwise leave implementation unchanged and document.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Run dirtyPlan/converge tests:** Run focused tests and document whether this spec only added sentinels or also changed buffers.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] Repeated small transactions after one large transaction do not pay full previous-capacity clear cost without visibility.
- [x] DirtyPlanSnapshot repeated reads within the same phase hit cache and do not recreate root/list arrays.
- [x] String join/split or Array.from in the transaction window is either absent or counted as a failing sentinel in covered paths.
- [x] If generation stamping or touched-word clear is introduced, it is justified by the sentinel and covered by behavior tests.
