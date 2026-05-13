# Handoff: Dispatch Scope Acquisition Fast Path

**Spec:** `specs/204-dispatch-scope-acquisition-fastpath`
**Owner:** local agent
**Status:** Complete

## Implementation Summary

- Changed files:
  - `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts`
  - `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - `specs/204-dispatch-scope-acquisition-fastpath/tasks.md`
  - `specs/204-dispatch-scope-acquisition-fastpath/checklists/requirements.md`
  - `specs/204-dispatch-scope-acquisition-fastpath/handoff.md`

- Notes:
  - Added a focused guard proving repeated `$.use(Child)` / `$.use(Child.tag)` inside one BoundApi reuses one imported module handle while dispatching through the handle still works.
  - Added a focused isolation guard proving cached handles do not cross runtime roots for the same ModuleTag.
  - Implemented an internal `WeakMap<ModuleRuntime, ModuleHandle>` cache in the BoundApi instance closure.
  - The cache is keyed by resolved runtime object, not ModuleTag or process registry, so imports and multi-root isolation remain owner-scoped.
  - `BoundApiRuntime.ts` is the true owner for handle reconstruction. The spec target list named `ModuleRuntime.dispatch.ts` / registry / selection files, but those were not the reconstruction site.
  - `dispatch-shell.runtime.ts` already reports `runtime.resolveScopeMsPerDispatch` for both `reuseScope` and `resolveEach`, so no perf harness shape change was required in 204.
  - No public API, public config, root export, diagnostics surface, transaction order, queue/lane law, or registry fallback changed.

## Commands Run

| Command | Outcome | Notes |
| --- | --- | --- |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts` | FAIL | RED before implementation: repeated acquisition returned distinct handles and rebuilt the handle carrier. |
| `pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchScopeAcquisition.FastPath.test.ts` | PASS | 2 tests passed after internal BoundApi handle cache. |
| `pnpm -C packages/logix-core test test/internal/Runtime/HierarchicalInjector/hierarchicalInjector.strict-isolation.test.ts` | PASS | Strict isolation guard passed. |
| `pnpm -C packages/logix-core test test/Runtime/Runtime.openProgram.multiRoot.isolated.test.ts` | PASS | Multi-root imported module isolation guard passed. |
| `pnpm -C packages/logix-react test test/Hooks/useImportedModule.hierarchical.test.tsx` | PASS | React imported module hierarchical hook guard passed. |
| `pnpm -C packages/logix-core typecheck` | PASS | Production TypeScript passed. |
| `pnpm -C packages/logix-core typecheck:test` | FAIL | Existing test type drift outside this spec: verification carrier Scope envs, LiveBridge contracts, old `EffectOp.js` imports, old `StateOf` / `ActionOf` test imports, and event union narrowing errors. No failure pointed at the new 204 test or `BoundApiRuntime.ts`. |

## Tax Movement Notes

| Phase / Counter | Before | After / Observed | Interpretation |
| --- | --- | --- | --- |
| BoundApi imported handle reconstruction | each `$.use` rebuilt handle carrier | one handle carrier per resolved runtime inside one BoundApi | `tax_removed` for BoundApi acquisition carrier |
| Imported module / multi-root isolation | strict isolation required | strict isolation and multi-root tests passed | `not_migrated` |
| `runtime.resolveScopeMsPerDispatch` | harness field already present | harness field unchanged for `reuseScope` and `resolveEach` | `inconclusive`, no perf evidence collected in 204 |
| Next suspected tax | n/a | queue/lane context lookup remains the next owner from ledger | `205` follow-up |

## Evidence Files

- n/a. 204 only adds focused guards and an internal cache; formal before/after perf evidence is deferred to 211.

## Verification Layer Status

| Layer | Status | Evidence |
| --- | --- | --- |
| Structural sentinel status | not applicable | 204 reduces acquisition reconstruction; allocation sentinels are owned by 208/209. |
| A/B status | available from 210, not used for 204 hard claim | 204 relies on focused semantic guards. |
| Focused perf status | deferred | No default/soak dispatchShell diff collected in 204. |
| Tax migration classification | `tax_removed` locally for handle reconstruction, `inconclusive` for formal perf | Focused guard proves one handle carrier per resolved runtime; no comparable perf artifact. |
| Migrated risk | queue/lane tax remains possible | Next owner recorded as 205. |

## Claim Boundary

- Allowed claims:
  - Focused validation passed for instance-scoped BoundApi handle reuse and isolation.
  - Formal performance claim deferred until comparable default/soak evidence.
- Forbidden claims:
  - Runtime performance is fixed.
  - No regressions exist.
  - Production performance improved globally.
  - Transaction path is optimal.

## Blockers

- `packages/logix-core typecheck:test` currently fails on pre-existing test type drift outside this spec. Focused runtime tests and production `typecheck` passed.

## Next Recommended Spec

- `205-txn-queue-lane-empty-fastpath`
