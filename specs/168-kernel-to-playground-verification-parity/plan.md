# Implementation Plan: Kernel-to-Playground Verification Parity

**Branch**: `168-kernel-to-playground-verification-parity` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)

## Summary

168 sequences terminal pressure from core kernel to Playground. The plan is dominance-first:

```text
dominance audit
  -> cut / rewrite existing false or weak authority
    -> strengthen core verification spine
      -> rebuild adapters as projection-only
        -> prove Playground with real demos
```

The implementation slice is now closed. [discussion.md](./discussion.md) keeps closed decisions plus deferred adapter naming and public reflection follow-up items. Existing implementation remains subject to dominance audit if a later slice introduces a core scenario executor or public reflection surface.

Detailed execution steps live in [implementation-plan.md](./implementation-plan.md). This file remains the route and phase constraint document.

## Technical Context

**Language/Version**: TypeScript 5.9, Effect 4.0.0-beta.28  
**Core owners**: `packages/logix-core/src/internal/verification/**`, `packages/logix-core/src/internal/reflection/**`, `packages/logix-core/src/internal/workbench/**`  
**CLI owner**: `packages/logix-cli/**`  
**Playground owner**: `packages/logix-playground/**`, `examples/logix-react/src/playground/**`  
**Public surface**: unchanged  
**Primary proof route**: core unit tests, CLI transport tests, Playground browser route tests, parity snapshots

## Constitution Check

- Public API minimalism: pass only if no public Reflection, Workbench, Playground or Scenario facade is added.
- Runtime clarity: pass only if `Runtime.run`, `runtime.check`, `runtime.trial` and `runtime.compare` keep distinct authority roles.
- Diagnostics authority: pass only if Playground displays owner-backed report/failure/gap facts.
- Performance: required for any verification/reflection/workbench collection on hot runtime paths.
- Forward-only: remove fake or local-only authority shapes rather than preserving them.
- Owner lane: pass only if consumer adapters do not define their own terminal report, dependency or payload truth.
- Dominance: pass only if each existing implementation path is classified as keep, rewrite-under-owner, demote-to-host-state or delete.

## Phase 0: Dominance Audit

Goal: classify existing implementation before designing new objects.

Audit targets:

```text
packages/logix-core/src/Runtime.ts
packages/logix-core/src/ControlPlane.ts
packages/logix-core/src/internal/workbench/**
packages/logix-core/src/internal/reflection/**
packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts
packages/logix-playground/src/internal/runner/runProjection.ts
packages/logix-playground/src/internal/runner/runtimeEvidence.ts
packages/logix-playground/src/internal/summary/workbenchProjection.ts
examples/logix-react/src/playground/projects/diagnostics/**
examples/logix-react/src/playground/projects/pressure/**
```

Required classifications:

- keep
- rewrite-under-owner
- demote-to-host-state
- delete

Exit:

- `notes/verification.md` records the audit table.
- `discussion.md` records only genuine open design choices, not known implementation defects.
- `tasks.md` contains cut/rewrite tasks for every non-keep path.

## Phase 0A: Plan Review

Goal: use 168 as the review object for plan-optimality-loop before coding.

Inputs:

- [spec.md](./spec.md)
- [discussion.md](./discussion.md)
- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)
- [research.md](./research.md)
- dominance audit table from [notes/verification.md](./notes/verification.md)

Exit:

- `discussion.md` has no blocking pre-implementation decision.
- `spec.md` terminal decisions reflect adopted review result.
- `tasks.md` phases are updated to implementation-ready granularity.

Closure note:

- Plan-optimality-loop review was closed under the repository subagent policy by direct dominance review in `notes/verification.md` and this plan.
- The closed decisions were taken through owner tests and verified code changes.
- Remaining design questions are explicitly deferred in `discussion.md`.

## Phase 1: Core Verification Spine

Target owner areas:

```text
packages/logix-core/src/internal/verification/**
packages/logix-core/src/internal/reflection/**
packages/logix-core/src/internal/workbench/**
```

Work items:

- Promote `VerificationDependencyCause` as the first dependency spine candidate.
- Reject or defer broad `DependencyClosureIndex` unless the spine demonstrably cannot serve check/trial/run/CLI/Playground parity.
- Ensure startup dependency failures carry stable owner coordinates.
- Ensure `Runtime.run` failure cannot be projected as successful null result by hosts.
- Define run-failure facet contract consumed by Workbench projection, with lossiness metadata for value projection.
- Decide whether `runtime.check` can emit declared dependency risks.
- Keep scenario trial success path blocked until core-owned scenario executor lands.

Required proof:

- Missing service/config/import examples produce stable trial findings.
- `VerificationDependencyCause` contains enough owner coordinate and focusRef information for CLI and Playground drilldown.
- Run failure output is shape-separated from trial report.
- `undefined`, truncation and non-JSON run values expose projection lossiness.
- Check does not perform startup trial implicitly.
- No new public facade appears.

First-slice result:

- `VerificationDependencyCause` is adopted as the dependency spine.
- Workbench run-result input preserves `valueKind / lossy / lossReasons`.
- Run failure projects as result-face failure and Workbench `run-failure-facet`.
- `Runtime.check` has tests proving it does not run startup validation or emit startup-only missing dependency findings.
- CLI scenario trial remains structured failure until core scenario executor exists.

## Phase 2: Reflection Manifest Expansion

Target owner areas:

```text
packages/logix-core/src/internal/reflection/**
packages/logix-core/src/internal/reflection-api.ts
```

Work items:

- Link reflection manifest to dependency cause spine where owner-approved.
- Expand action/payload schema carrier beyond current minimum slice.
- Expose validator availability and stable payload issue projection.
- Include sourceRef/focusRef/budget/degradation markers for drilldown.
- Produce manifest artifact usable by CLI and Playground adapters.

Required proof:

- Unknown payload schema yields evidence gap.
- Invalid payload value yields reflection-owned validation issue.
- Manifest digest is deterministic under same source/declaration input.
- Source regex remains fallback-only and visible as evidence gap.
- Reflection bridge expands nodes instead of only carrying manifest artifact refs.

Implementation result:

- Reflection bridge now projects action nodes, payload metadata nodes and dependency nodes.
- Payload validator availability and stable validation issue projection remain reflection-owned.
- Missing manifest, unknown payload schema, stale manifest digest and `fallback-source-regex` project as evidence gaps.
- Runtime reflection manifest digest has byte-stability proof for identical Program input.

## Phase 3: CLI Transport Parity

Target owner areas:

```text
packages/logix-cli/**
packages/logix-cli/src/schema/commands.v1.json
```

Work items:

- Ensure CLI check/trial/compare output covers the same report authority as core.
- Export reflection/dependency artifacts when available without making `CommandResult` report truth.
- Keep scenario mode structured failure until core scenario executor exists.
- Preserve artifact key and primary report output key invariants.
- Add parity fixtures shared with Playground route demos where possible.

Required proof:

- CLI trial missing dependency report matches core trial report and Playground diagnostics projection.
- CLI compare consumes before/after report refs and rejects inadmissible pairs through control-plane authority.
- `CommandResult` remains transport-only.

First-slice result:

- CLI startup missing dependency fixture proves core report authority, primary report link and dependency cause preservation.
- CLI workbench parity fixture proves the same report can feed Workbench authority bundle.

## Phase 4: Workbench Projection Expansion

Target owner areas:

```text
packages/logix-core/src/internal/workbench/**
packages/logix-playground/src/internal/summary/**
```

Work items:

- Expand `RuntimeWorkbenchAuthorityBundle` adapters for CLI and Playground.
- Project full check/trial findings, run-failure facets, reflection nodes, dependency nodes and evidence gaps.
- Keep host view state out of projection ids and findings.
- Replace summary-text-derived ids with owner coordinates, runId, focusRef, artifact output keys or stable digest.
- Demote preview-only failure from run-result truth to host state, preview artifact or evidence gap.
- Gate compile failure classification through transport/pre-control-plane authority.
- Add projection snapshots for same authority from CLI and Playground inputs.

Required proof:

- Same control-plane report produces equivalent finding projection in CLI and Playground routes.
- Missing manifest, unknown schema and stale source digest become evidence gaps.
- Workbench Kernel does not execute Program or generate report.
- Workbench finding ids remain stable when report summary wording changes.
- Preview-only failure cannot create a `run-failure-facet`.

First-slice result:

- Control-plane report authority ids no longer depend on summary wording.
- Preview-only and host compile failures become evidence gaps.
- Runtime evidence Run failure becomes `run-failure-facet`.
- Reflection nodes from owner manifest become Workbench browse artifacts without adding public surface.

## Phase 5: Playground Runtime Parity

Target owner areas:

```text
packages/logix-playground/**
examples/logix-react/src/playground/**
```

Work items:

- Route Run failures into result-face failure or Workbench run-failure facet.
- Capture Check/Trial reports and Run failure projections with stable refs.
- Add compare-compatible before/after capture UI or test harness.
- Replace non-real diagnostics demo rows with real core-triggering demos or visual-only pressure fixtures.
- Add curated routes for CLI-detectable errors missing from Playground coverage.
- Split every mixed pressure demo into explicit authority class lanes or separate routes.

Required proof:

- Browser route: missing dependency Trial produces real diagnostics.
- Browser route: same missing dependency Run does not show successful null result.
- Browser route: diagnostics-dense authority lane contains only owner-backed facts.
- Browser route: visual pressure fixtures do not feed Runtime-looking diagnostics.
- Browser route: Run returning `undefined` is distinguishable from business `null` and from run failure.

First-slice result:

- Diagnostics routes now include Run null, Run undefined and Run failure demos.
- Diagnostics routes now include payload validator unavailable and reflection action evidence-gap demos.
- Pressure fixtures declare visual-only authority.
- Browser proof covers null, undefined and failed Run output shape.
- Playground session capture helper records Check, Trial and Run failure refs; compare-compatible proof consumes captured Check/Trial report refs.

## Phase 6: Docs And Spec Writeback

Writeback targets:

- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `docs/ssot/runtime/17-playground-product-workbench.md`
- `specs/160-cli-agent-first-control-plane-cutover/spec.md`
- `specs/162-cli-verification-transport/spec.md`
- `specs/165-runtime-workbench-kernel/spec.md`
- `specs/166-playground-driver-scenario-surface/spec.md`
- `specs/167-runtime-reflection-manifest/spec.md`
- `specs/168-kernel-to-playground-verification-parity/*`

Rules:

- 168 cannot close by updating code only.
- Any adopted owner decision must move from discussion into the relevant owner spec or SSoT.
- Any rejected fake diagnostic route must be removed or relabelled in 166 assets/pressure docs.
- Any existing implementation path classified as rewrite/delete must be reflected back into 166/167 status wording if those specs currently imply closure.

## Verification Matrix

Focused commands after implementation:

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-cli test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Browser proof after Playground implementation:

```bash
rtk pnpm -C examples/logix-react test:browser -- --run --silent=passed-only --reporter=dot
```

Perf proof is required if hot runtime paths change:

```bash
rtk pnpm check:effect-v4-matrix
```

## Negative Sweep

```bash
rtk rg -n "fake diagnostic|diagnosticsFixture|Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|Runtime\\.workbench|Logix\\.Reflection|fallback-source-regex" packages/logix-core packages/logix-cli packages/logix-playground examples/logix-react docs specs/168-kernel-to-playground-verification-parity
```

Remaining hits must be classified as forbidden shape, evidence gap, fallback-only debt, or discussion item.
