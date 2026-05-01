# Discussion: 168 Kernel-to-Playground Verification Parity

**Status**: First implementation slice closed  
**Date**: 2026-04-30  
**Authority refs**: [spec](./spec.md), [plan](./plan.md), [research](./research.md), [data model](./data-model.md)

`discussion.md` is not authority. When an item closes, move the adopted decision into `spec.md`, `plan.md`, `tasks.md` or the owning SSoT/spec, then remove or demote the item here.

## Closed For First Implementation Slice

### D168-001: Dependency Spine Dominance

Decision:

- Adopt existing `VerificationDependencyCause` as the minimal dependency spine across Trial, CLI, Workbench and Playground.
- Do not add `DependencyClosureIndex` in 168 first slice.
- Follow-up only if the spine cannot express a concrete owner-approved declaration gap.

Writeback:

- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/168-kernel-to-playground-verification-parity/notes/verification.md`

### D168-002: `Runtime.run` Failure Carrier

Decision:

- Run failure is carried as result-face failure projection from Playground runtime evidence.
- Workbench consumes accepted failure as `run-failure-facet`.
- Owner detail missing or host-only failure degrades to evidence gap.

Writeback:

- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/17-playground-product-workbench.md`
- `specs/165-runtime-workbench-kernel/spec.md`
- `specs/166-playground-driver-scenario-surface/spec.md`

### D168-005: Workbench Projection Rewrite Scope

Decision:

- Report identity is rewritten away from summary text.
- Preview-only and host compile failures are demoted out of `run-result` truth input.
- Run-result value lossiness and accepted run-failure facet are preserved.
- Reflection action, payload and dependency nodes are expanded through the 167-owned Workbench bridge.
- Missing manifest, unknown payload schema, stale manifest digest and fallback source regex are evidence gaps.

Writeback:

- `specs/165-runtime-workbench-kernel/spec.md`
- `docs/ssot/runtime/17-playground-product-workbench.md`

### D168-009: Real Diagnostics Demo Matrix

Decision:

- Keep existing missing service/config/import and check-import diagnostics routes as real runtime authority demos.
- Add Run null value, Run undefined value and Run failure diagnostics routes.
- Mark pressure fixtures as `visual-pressure-only`.

Writeback:

- `docs/ssot/runtime/17-playground-product-workbench.md`
- `specs/166-playground-driver-scenario-surface/spec.md`

### D168-010: Lossy Run Value Projection

Decision:

- Runtime result projection carries `valueKind / lossy / lossReasons`.
- Playground distinguishes business `null`, projected `undefined`, stringification, truncation and run failure.
- Core Workbench run-result input accepts the same metadata.

Writeback:

- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/17-playground-product-workbench.md`
- `specs/165-runtime-workbench-kernel/spec.md`
- `specs/166-playground-driver-scenario-surface/spec.md`

### D168-011: Existing Implementation Dominance Table

Decision:

- Dominance table is recorded in `notes/verification.md`.
- Classifications: core dependency cause spine keep, Workbench run-failure facet keep, Workbench authority id rewrite-under-owner, Playground run projection rewrite-under-owner, Playground workbench projection rewrite-under-owner, pressure fixtures demote-to-host-state.

Writeback:

- `specs/168-kernel-to-playground-verification-parity/notes/verification.md`

### D168-012: Check Dependency Semantics

Decision:

- `runtime.check` remains a static gate and does not perform startup validation.
- Startup-only missing service/config/import failures stay under `runtime.trial(mode="startup")`.
- Declared dependency risk finding remains deferred until a core owner exposes declaration-time dependency data.

Writeback:

- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/168-kernel-to-playground-verification-parity/tasks.md`

### D168-013: Payload Validator Carrier

Decision:

- Payload validator availability and stable issue projection are held by 167 repo-internal reflection.
- Workbench consumes payload metadata nodes and unknown-schema evidence gaps through reflection bridge.
- Playground route coverage adds a payload validator unavailable diagnostics demo.

Writeback:

- `specs/167-runtime-reflection-manifest/spec.md`
- `docs/ssot/runtime/17-playground-product-workbench.md`

### D168-014: Playground Compare Capture Model

Decision:

- Playground captures Check reports, Trial startup reports and Run failure projections as host-state refs.
- Compare-compatible proof is harness-level in this slice and consumes captured report refs only.
- Product scenario result remains excluded from compare authority.

Writeback:

- `docs/ssot/runtime/17-playground-product-workbench.md`
- `specs/168-kernel-to-playground-verification-parity/data-model.md`

### D168-015: Scenario Executor Minimum Viable Shape

Decision:

- Product scenario playback stays product output until core-owned `fixtures/env + steps + expect` executor lands.
- CLI `trial --mode scenario` returns structured failure and does not emit a `trialReport`.

Writeback:

- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `specs/168-kernel-to-playground-verification-parity/tasks.md`

## Deferred / Non-Blocking

### D168-006: CLI / Playground Adapter Contract Name And Owner

Deferred as a naming/export question. Current first slice uses core internal Workbench law plus package-local adapters without adding public surface.

### D168-101: Public Reflection Surface

Deferred because 167 keeps reflection repo-internal. Reopen only after Playground, CLI and Devtools consumption stabilizes.

### D168-102: Raw Evidence Full Compare

Deferred because 09 keeps raw evidence full compare out of default v1. Reopen only with a concrete compare use case that cannot be expressed through reports and evidence summaries.

### D168-103: Browser Host Deep Verification

Deferred because host projection precision requires explicit host evidence artifacts. Reopen after core control-plane parity and Playground report capture are complete.

### D168-104: Final Devtools UI Layout

Deferred because 165 owns projection law and 159 owns DVTools cutover. 168 only needs parity inputs and projection outputs.

## Proposed Plan-Optimality-Loop Contract

Suggested review contract for the next step:

```yaml
artifact_kind: ssot-contract
review_goal: design-closure
challenge_scope: open
target_claim: >
  168 is the correct terminal planning contract for aligning core verification,
  reflection, CLI transport, Workbench projection and Playground diagnostics
  without adding public surface or fake authority.
target_refs:
  - specs/168-kernel-to-playground-verification-parity/spec.md
  - specs/168-kernel-to-playground-verification-parity/plan.md
  - specs/168-kernel-to-playground-verification-parity/discussion.md
  - specs/168-kernel-to-playground-verification-parity/data-model.md
  - specs/160-cli-agent-first-control-plane-cutover/spec.md
  - specs/162-cli-verification-transport/spec.md
  - specs/165-runtime-workbench-kernel/spec.md
  - specs/166-playground-driver-scenario-surface/spec.md
  - specs/167-runtime-reflection-manifest/spec.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/15-cli-agent-first-control-plane.md
  - docs/ssot/runtime/17-playground-product-workbench.md
write_policy: allow edits only under specs/168-kernel-to-playground-verification-parity and necessary owner writebacks after adoption
ledger_target: docs/review-plan/runs/
stop_condition: consensus
```

Reviewers should explicitly challenge:

- Whether 168 is still too defensive toward existing 166/167 completion claims.
- Whether `VerificationDependencyCause` is the right dependency spine, or a broader closure object is truly necessary.
- Whether current Workbench projection should be rewritten before adding reflection/dependency expansion.
- Whether Run value projection lossiness must be pushed into core.
- Whether Playground compare should be first-slice UI or harness-only.
- Whether scenario executor deferral weakens terminal direction.
