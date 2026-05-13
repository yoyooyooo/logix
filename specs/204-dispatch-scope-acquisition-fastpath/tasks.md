# 204 Dispatch Scope Acquisition Fast Path Tasks

**Priority:** P1
**Depends On:** 203

## Tasks

- [x] **T001 Write acquisition reuse guard:** Add a test proving repeated dispatch against the same acquired runtime does not reconstruct the acquisition carrier.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Write isolation guard:** Add or update a hierarchical/imported-module test proving cached acquisition cannot cross provider/runtime boundaries.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Introduce internal acquisition cache:** Add the smallest internal cache or bound executor reuse point in ModuleRuntime.dispatch/registry; keep it instance-scoped.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Expose harness breakdown:** Ensure dispatch-shell.runtime.ts still reports resolveScopeMsPerDispatch for reuseScope and resolveEach.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Run focused tests and record tax movement:** Run tests and record whether the suspected next tax point is queue, bodyShell, or commit publish.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] A focused guard proves bound runtime acquisition is reused when the same module runtime is already resolved.
- [x] A focused guard proves imported module and hierarchical override resolution still isolate correctly.
- [x] `resolveEach` remains semantically distinct in the perf harness but does not pay avoidable repeated construction cost.
- [x] No public config or public API is added for acquisition caching.

## Implementation Notes

- The true owner for repeated `$.use(Module)` / `$.use(Module.tag)` handle reconstruction is `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`, not `ModuleRuntime.dispatch.ts` or `ModuleRuntime.registry.ts`.
- `packages/logix-react/test/browser/perf-boundaries/dispatch-shell.runtime.ts` already reports `runtime.resolveScopeMsPerDispatch` for both `reuseScope` and `resolveEach`; no harness change was needed in 204.
- No commit was created because this workspace forbids automatic `git add` / `git commit` unless the user explicitly asks.
