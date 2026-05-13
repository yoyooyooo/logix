# Implementation Plan: Repair Intent Contract

**Branch**: `185-repair-intent-contract` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/185-repair-intent-contract/spec.md`

## Summary

Make verification reports machine-actionable for Agent repair by tightening `repairHints`, `findings`, `dependencyCauses`, `artifacts`, `focusRef` and scheduling joins.

Implementation must let an Agent identify repair target, owner coordinate, stage, cause kind and relevant artifact refs without parsing prose fields. It must also preserve the boundary that live output never carries repair hints, verdicts or next-stage scheduling; material from live commands can influence repair only after export into canonical evidence and verification consumption.

This plan explicitly excludes automatic patching, writeback runtime, ranking patch candidates, Agent policy/memory, `trial --mode scenario` repair semantics, a second report taxonomy and any live command repair authority.

Within the 184-186 family, this plan is the second prerequisite lane. It is ordered after 184 and produces report-owned repair intent consumed by 186. It does not consume 184 entry failure facts as a positive repair proof lane, and it must not import 186 as authority.

## Stage Role

- This file records execution constraints only.
- [spec.md](./spec.md) owns the 185 feature law.
- [Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md) owns report authority, `focusRef`, `nextRecommendedStage`, compare result semantics and scheduling.
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) owns command result transport and skill/schema discovery surface.
- [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md) owns live evidence as evidence, not repair truth.
- [184](../184-entry-declaration-authority/spec.md) owns entry failure families and entry owner facts that 186 consumes downstream.
- [186](../186-verification-loop-orchestration/spec.md) is the downstream loop orchestration consumer, not an authority for this lane.

Implementation must update this plan only if execution discovers a changed authority, gate or writeback target.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, phase order, witness set, proof obligations, diagnostics constraints, and writeback targets. It intentionally avoids line-by-line algorithms.

No `implementation-details/*contract*.md` is required in 185 unless implementation discovers a real exact wire ambiguity in `VerificationControlPlaneReport`. In that case the narrow contract must be promoted back into [spec.md](./spec.md), this plan or `09` before closure.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/core`, `@logixjs/cli`, Effect V4 baseline as used by the workspace.  
**Storage**: CLI output artifacts under caller-selected `outRoot`; no patch store or Agent memory.  
**Testing**: Vitest, package-local core/CLI tests, schema guard tests, text sweeps.  
**Target Platform**: Node.js 20+ CLI and runtime control-plane tests.  
**Project Type**: pnpm workspace with `packages/logix-core` and `packages/logix-cli`.  
**Performance Goals**: repair intent materialization remains deterministic, slim and serializable; no raw payload expansion.  
**Constraints**: no auto patch engine, no second report family, prose fields are explanatory only, hint-local `upgradeToStage` cannot override top-level `nextRecommendedStage`, live output has no repair authority.  
**Scale/Scope**: verification reports for static, dependency, canonical evidence and compare failure families.

## Constitution Check

- SSoT first: 185 imports `09`, `15`, `16`, `18`, `161`, `162`, and `184`; changed report owner law must be written back before implementation closes. `186` only consumes this lane downstream.
- Runtime truth: repair intent is report-owned. Live, CLI and daemon remain carriers or evidence producers only.
- Scheduling authority: `nextRecommendedStage` remains top-level and unique; hint-local upgrade fields are explanatory/local.
- Deterministic identity: hints, owner facts, focus refs and artifact refs must be stable under equivalent verification inputs.
- Payload discipline: no raw source, AST, runtime handles, raw field graph or domain payloads enter repair hints.
- Performance: repair payload is slim and serializable; no hot runtime path change is expected.
- Forward-only: no second report family, compatibility alias or deprecated field preservation.
- Public surface: no patch/writeback command, no `logix live` repair output, no `logix debug`.
- Single-track implementation: direct terminal repair contract over existing report fields.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) answers:

- report-owned repair intent boundary
- in-scope failure families
- no-auto-patch and no-live-repair guardrails
- closure contract, must-cut list and reopen bar

### Gate B: Implementation Admission

Implementation can start only after these planning artifacts exist:

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [tasks.md](./tasks.md)
- [checklists/requirements.md](./checklists/requirements.md)

Implementation must not start if `discussion.md` later appears with `Must Close Before Implementation` items.

## Perf Evidence Plan

185 does not intentionally touch runtime execution hot paths.

Required evidence:

- Determinism witness: equivalent verification inputs produce stable repair hint codes, focus refs, artifact refs and scheduling.
- Slim payload witness: hints link to owner facts and artifact refs without raw source, AST, runtime handles or domain payload expansion.
- Live boundary witness: live command output schema continues to forbid `repairHints`, `nextRecommendedStage` and `verdict`.

Full `pnpm perf collect` is N/A unless implementation changes always-on runtime transaction, live inspect, selector, boot or report materialization hot paths in a measurable way. If that happens, record focused before/after artifacts under `specs/185-repair-intent-contract/perf/` and update this plan before closure.

## Project Structure

### Documentation

```text
specs/185-repair-intent-contract/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Likely Source Landing Zones

Core report materialization:

- `packages/logix-core/src/ControlPlane.ts`
- `packages/logix-core/src/Runtime.ts`
- `packages/logix-core/src/internal/verification/**`
- `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
- `packages/logix-core/src/internal/observability/trialRunErrors.ts`

CLI report transport and live boundary:

- `packages/logix-cli/src/internal/commands/check.ts`
- `packages/logix-cli/src/internal/commands/trial.ts`
- `packages/logix-cli/src/internal/commands/compare.ts`
- `packages/logix-cli/src/internal/liveResult.ts`
- `packages/logix-cli/src/schema/commands.v1.json`

Proof:

- `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
- `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts`
- `packages/logix-cli/test/Integration/trial-dependency-spine.contract.test.ts`
- `packages/logix-cli/test/Integration/repair-closure.program-assembly.e2e.test.ts`
- `packages/logix-cli/test/Integration/repair-closure.source-declaration.e2e.test.ts`
- `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts`
- `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`
- `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`
- `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts`

Implementation may choose narrower files after reading current code. If a listed file is not needed, leave it untouched.

## Phase 0 - Research And Admission Confirmation

Output:

- [research.md](./research.md)

Required decisions:

- `VerificationControlPlaneReport` remains the only repair report authority.
- repair hints must join to owner facts from findings, dependency causes, artifacts or admissibility details.
- prose fields remain optional explanation, not machine routing inputs.
- top-level `nextRecommendedStage` is the only scheduling authority.
- live command results do not contain repair hints, verdicts or scheduling.
- no new exact contract file is needed unless report wire ambiguity is discovered.

## Phase 1 - Data Model And Quickstart

Outputs:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

The model must name only stable coordination objects:

- Repair Hint
- Owner Fact
- Focus Reference
- Repair Intent Path
- Artifact Backlink
- Scheduling Authority

The quickstart must show focused proof commands and text sweeps for structured repair consumption.

## Phase 2 - Repair Hint Join Law

Requirements:

- every localized hint joins to a finding, dependency cause, admissibility detail or artifact output key
- `relatedArtifactOutputKeys` references only existing `artifacts[].outputKey` values
- unavailable focus is explicit null/gap, not invented coordinate
- `summary`, `reason` and `suggestedAction` stay explanatory only

## Phase 3 - Failure Family Coverage

Requirements:

- dependency repairs include kind, phase, provider source, owner coordinate and child identity when applicable
- static declaration repairs include declaration owner coordinate and source artifact ref when relevant
- entry owner facts remain owned by 184 and are consumed by 186; this lane does not add a separate entry repair proof
- compare repairs distinguish closed repair, regression, mismatch and inconclusive admissibility

## Phase 4 - Canonical Evidence And Live Boundary

Requirements:

- canonical evidence affects repair only after a verification command consumes it
- verification reports can link repair hints back to canonical evidence input artifacts
- live command result schema and tests continue to forbid repair hints, verdict and next-stage scheduling
- selection manifests remain hint-only and never become report truth

## Phase 5 - Proof And Writeback

Required witness set:

- static declaration repair routing proof
- dependency repair routing proof
- canonical-evidence repair routing proof
- compare repair/admissibility proof
- artifact backlink integrity proof
- top-level scheduling precedence proof
- live forbidden-field proof

Verification matrix:

- `rtk pnpm --filter @logixjs/core test -- --run test/Contracts/VerificationControlPlaneContract.test.ts test/Contracts/RuntimeCheck.contract.test.ts test/Contracts/VerificationControlPlaneCompare.contract.test.ts test/VerificationDependencyCauseSpine.contract.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/trial-dependency-spine.contract.test.ts test/Integration/repair-closure.program-assembly.e2e.test.ts test/Integration/repair-closure.source-declaration.e2e.test.ts test/Integration/repair-closure.dependency.e2e.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-command-result.contract.test.ts test/Integration/evidence-selection-input.contract.test.ts test/Integration/evidence-selection-roundtrip.contract.test.ts`
- classified text sweeps from [quickstart.md](./quickstart.md)

Delta writebacks:

- update `docs/ssot/runtime/09-verification-control-plane.md` if report field law, scheduling law or focus refs changed
- update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` if CLI report consumption or live forbidden fields changed
- update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` if live evidence handoff boundary changed
- update `skills/logix-cli/SKILL.md` with final repair consumption recipe if field guidance changed
- update [quickstart.md](./quickstart.md), [spec.md](./spec.md), and [specs/README.md](../README.md) with final proof status after implementation

Family closure writeback is owned by [186](../186-verification-loop-orchestration/spec.md). Do not mark the 184-186 family closed from this lane alone.

## Non-Goals

- Do not add automatic patching, writeback runtime or Agent policy.
- Do not add a second report family such as `RepairReport`.
- Do not put repair hints, verdicts or next-stage scheduling in `LiveCommandResult`.
- Do not make selection manifests report truth.
- Do not require prose parsing for repair routing.
- Do not implement `trial --mode scenario`.
