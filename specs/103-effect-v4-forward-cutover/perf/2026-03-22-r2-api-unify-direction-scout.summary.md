# 2026-03-22 · R-2 API unify direction scout · evidence summary

- scope: `docs/evidence-only`
- worktree: `v4-perf.scout-r2-api-unify`
- decision: `single_recommendation_selected`
- selected_direction: `R2-U PolicyPlan contract reorder`
- primary_doc: `docs/perf/2026-03-22-r2-api-unify-direction-scout.md`
- design_package: `docs/perf/2026-03-22-r2-u-policyplan-design-package.md`

## Gate snapshot

- Gate-A (new product SLA): `pending`
- Gate-B (widening insufficient evidence): `pending`
- Gate-C (clean/comparable probe): `pass(clear_unstable)`
- Gate-D (migration readiness): `ready_in_doc`
- Gate-E (open-line override decision): `pending`

## Why this direction

- targets structural tax directly: `dual API families + runtime field-level merge`
- allows hot-path simplification: `compiled profile table + O(1) lookup`
- keeps diagnostics deterministic: `profileId/scope/fingerprint` from compiled artifact

## Impact surface for future implementation line

- `packages/logix-core/src/Runtime.ts`
- `packages/logix-core/src/internal/runtime/core/env.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`

结论：维持 `R-2` watchlist；后续仅围绕 `R2-U PolicyPlan contract reorder` 开 implementation line，不再扩散到并行候选。
