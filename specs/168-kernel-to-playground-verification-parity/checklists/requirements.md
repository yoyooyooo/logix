# Requirements Checklist: Kernel-to-Playground Verification Parity

**Spec**: [spec.md](../spec.md)  
**Created**: 2026-04-30  
**Status**: First implementation slice checked

## Spec Quality

- [x] Current role is explicit.
- [x] Imported authority is listed.
- [x] In scope and out of scope are separated.
- [x] Terminal decisions are stated as authority candidates.
- [x] Requirements are labelled.
- [x] Success criteria are observable.
- [x] Reopen bar is defined.

## Owner Boundary

- [x] Runtime control-plane authority remains in 09 and core.
- [x] CLI transport authority remains in 15 / 160 / 162.
- [x] Workbench projection authority remains in 165.
- [x] Playground product authority remains in 17 / 166.
- [x] Reflection manifest authority remains in 167.
- [x] No new public Reflection, Workbench, Playground, Driver or Scenario facade is introduced.

## Authenticity

- [x] Fake diagnostics are explicitly forbidden.
- [x] Visual pressure fixtures are separated from runtime authority.
- [x] Run failure and Trial diagnostics are shape-separated.
- [x] Unknown reflection/payload facts produce evidence gaps.
- [x] Scenario playback remains product output until core scenario executor exists.
- [x] Lossy Run value projection is explicitly modelled.
- [x] Summary text is forbidden as stable Workbench identity.
- [x] Preview-only failure is forbidden as Runtime run-result truth.

## Dominance Gate

- [x] Existing implementation can be challenged despite prior closure claims.
- [x] Disposition vocabulary is defined.
- [x] Existing paths requiring audit are listed.
- [x] `VerificationDependencyCause` is treated as the first dependency spine candidate.
- [x] Broad `DependencyClosureIndex` is rejected by default until proven necessary.

## Implementation Gate

- [x] Dominance audit table is recorded in [../notes/verification.md](../notes/verification.md).
- [x] Blocking discussion items in [discussion.md](../discussion.md) are closed or deferred.
- [ ] plan-optimality-loop review has either reached consensus or produced an accepted bounded plan.
- [x] Tasks are rewritten to implementation-ready slices after review.
- [x] Owner SSoT writeback targets are confirmed.

## Verification Gate

- [x] Core focused tests identified.
- [x] CLI focused tests identified.
- [x] Playground focused tests identified.
- [x] Browser route proofs identified.
- [x] Negative sweep command identified.
- [x] Perf proof trigger is documented.
