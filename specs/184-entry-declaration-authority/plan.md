# Implementation Plan: Entry And Declaration Authority Closure

**Branch**: `184-entry-declaration-authority` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/184-entry-declaration-authority/spec.md`

## Summary

Close the terminal Agent self-verification gap around CLI entry authority and static declaration authority.

Implementation must make `check`, `trial --mode startup`, and optional `compare --entry` accept only admissible `Program` exports, reject Module/Logic/fake Program/missing export/import failure/missing blueprint through structured pre-control-plane results, and keep runtime declaration pressure inside `Runtime.check` without booting runtime instances.

This plan explicitly excludes `trial --mode scenario`, host deep verification, React render evidence, automatic patching, new authoring API, old IR toolbox routes, compatibility aliases, and root `Runtime.compare` productization.

Within the 184-186 family, this plan is the first prerequisite lane. It must close entry/declaration authority before 185 consumes those failures as repair owner facts and before 186 closes rerun/compare orchestration.

## Stage Role

- This file records execution constraints only.
- [spec.md](./spec.md) owns the 184 feature law.
- [186](../186-verification-loop-orchestration/spec.md) owns the single terminal offline Agent loop contract.
- [185](../185-repair-intent-contract/spec.md) consumes this lane's owner facts for repair intent.
- [Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md) owns stage vocabulary, report authority, focus refs and scheduling.
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) owns public command grammar, entry gate, `CommandResult`, schema mirror and archived-route rejection.
- [Agent Self Verification Terminal Pressure Matrix](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md) owns `TP-ENTRY-01` pressure tracking.

Implementation must update this plan only if execution discovers a changed authority, gate or writeback target. Code tactics stay outside this file unless they remove a narrow handoff or measurement ambiguity.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, phase order, witness set, proof obligations, performance and diagnostics gates, and writeback targets. It intentionally avoids line-by-line algorithms.

No `implementation-details/*contract*.md` is required in 184. Existing `CommandResult`, `VerificationControlPlaneReport`, CLI schema and Program declaration contracts are the exact handoff authorities.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/core`, `@logixjs/cli`, Effect V4 baseline as used by the workspace.  
**Storage**: CLI output artifacts under caller-selected `outRoot`; no new persistent store.  
**Testing**: Vitest, package-local CLI integration tests, core contract tests, text sweeps.  
**Target Platform**: Node.js 20+ CLI and runtime control-plane tests.  
**Project Type**: pnpm workspace with `packages/logix-core` and `packages/logix-cli`.  
**Performance Goals**: entry and declaration checks remain cheap static gates; `Runtime.check` does not boot runtime, resolve readiness effects, or execute dependency acquisition.  
**Constraints**: Program-only entry, structured pre-control-plane failure envelope, no fallback Module/Logic entry, no fake Program acceptance, no random/time-derived stable identity fields in normalized comparison.  
**Scale/Scope**: offline Agent self-verification for one Program entry and optional compare provenance refs.

## Constitution Check

- SSoT first: 184 imports `09`, `15`, `16`, `01`, `03`, `04`, `161`, and `162`; any changed owner law must be written back before implementation closes.
- Runtime truth: runtime declaration pressure remains `Runtime.check` authority; CLI entry gate is pre-control-plane and must not invent a runtime stage.
- Stage boundary: entry/source gate failures cannot populate `nextRecommendedStage`; startup-only dependency and readiness failures stay in `trial --mode startup`.
- Transport gate: entry failures reuse `162` transport-gate failure semantics and must not create `stage="entry"`, a fourth stage or runtime findings when no runtime stage ran.
- Deterministic identity: entry coordinate, argv snapshot, artifact keys and declaration finding coordinates must be stable under normalized input.
- Transaction boundary: 184 must not add IO inside runtime transaction windows; static check cannot start or close runtime instances.
- Performance: `check` stays a default cheap Agent gate; if implementation touches runtime hot paths beyond static guards, add targeted perf evidence under `specs/184-entry-declaration-authority/perf/`.
- Diagnosability: all rejections must be slim, serializable and machine-readable; natural-language explanation is secondary.
- Forward-only: no compatibility layer, no deprecation period, no Module/Logic fallback, no archived command revival.
- Public surface: no new root command, no `logix describe`, no old toolbox route, no new public authoring API.
- Single-track implementation: direct terminal cutover to Program-only authority.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) answers:

- owner boundary between CLI entry gate, runtime declaration authority and report output
- in-scope and out-of-scope command families
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

184 touches static CLI/runtime verification gates, not runtime execution hot paths by default.

Required evidence:

- Check no-boot witness: static check fixtures prove no startup dependency/readiness/boot/close execution is needed.
- Entry determinism witness: repeated invalid entry runs preserve command shape, artifact key set, error code and stage scheduling outcome after normalization.
- Static declaration cheapness witness: missing blueprint/import/digest/source freshness checks stay in core contract tests without daemon/live/React/browser harnesses.

Full `pnpm perf collect` is N/A unless implementation changes always-on runtime transaction, selector, live inspect or boot paths. If that happens, record before/after artifacts under `specs/184-entry-declaration-authority/perf/` and update this plan before closure.

## Project Structure

### Documentation

```text
specs/184-entry-declaration-authority/
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

CLI entry and command transport:

- `packages/logix-cli/src/internal/entry.ts`
- `packages/logix-cli/src/internal/commands/check.ts`
- `packages/logix-cli/src/internal/commands/trial.ts`
- `packages/logix-cli/src/internal/commands/compare.ts`
- `packages/logix-cli/src/internal/commandSchema.ts`
- `packages/logix-cli/src/schema/commands.v1.json`

Runtime declaration pressure:

- `packages/logix-core/src/Runtime.ts`
- `packages/logix-core/src/ControlPlane.ts`
- `packages/logix-core/src/internal/verification/**`
- `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
- `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`

Proof:

- `packages/logix-cli/test/Integration/program-entry.contract.test.ts`
- `packages/logix-cli/test/Integration/check.command.test.ts`
- `packages/logix-cli/test/Integration/trial.command.test.ts`
- `packages/logix-cli/test/Integration/compare.command.test.ts`
- `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- `packages/logix-cli/test/Integration/legacy-command-rejection.guard.test.ts`
- `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`
- `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`
- `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

Implementation may choose narrower files after reading current code. If a listed file is not needed, leave it untouched.

## Phase 0 - Research And Admission Confirmation

Output:

- [research.md](./research.md)

Required decisions:

- CLI entry gate owns admissibility before runtime stage execution.
- `Runtime.check` owns declaration pressure but never boot/readiness/dependency execution.
- Structured entry failure uses the `162` transport-gate result/artifact envelope.
- `nextRecommendedStage` is null for pre-control-plane entry failure.
- `compare --entry` applies the same Program authority gate if entry provenance is accepted.
- No new contract file is needed because existing report/schema contracts own the exact shapes.

## Phase 1 - Data Model And Quickstart

Outputs:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

The model must name only stable coordination objects:

- Program Entry Coordinate
- Admissible Program
- Declaration Finding
- Entry Gate Failure
- Primary Machine Artifact

The quickstart must show focused proof commands and text sweeps, not user-facing tutorial prose.

## Phase 2 - CLI Entry Gate Closure

Requirements:

- reject Module, Logic, fake Program, missing export, import failure, missing blueprint and invalid declaration coordinate through machine-readable result envelopes
- preserve input coordinate and artifact refs without raw source, AST or blueprint payload expansion
- keep pre-control-plane gate failures separate from runtime report findings
- keep `nextRecommendedStage` null unless a runtime owner actually ran
- reject archived command routes and old entry fallback vocabulary in active public surfaces

## Phase 3 - Runtime Declaration Pressure Closure

Requirements:

- expose missing blueprint, invalid import, duplicate import, declaration digest and source freshness pressure as structured check findings
- include stable owner coordinate or focus reference for Agent repair planning
- prove startup-only service/config/readiness failures are not emitted by `Runtime.check`
- preserve source artifact refs and declaration digest refs without embedding raw source or AST

## Phase 4 - Rerun And Compare Entry Coordinate Preservation

Requirements:

- preserve normalized entry coordinate in failing and repaired runs
- prove the same command shape can advance from entry failure to runtime stage success after repair
- apply the Program entry gate to optional `compare --entry` provenance before compare consumes it
- preserve report artifact key and digest stability under normalized input

## Phase 5 - Proof And Writeback

Required witness set:

- Module/Logic/fake Program/missing export/import failure/missing blueprint CLI fixtures
- `Runtime.check` declaration pressure fixtures
- no-boot static check fixture
- entry failure repeatability fixture
- optional compare-entry gate fixture
- active public-surface text sweep

Verification matrix:

- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/program-entry.contract.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/check.command.test.ts test/Integration/trial.command.test.ts test/Integration/compare.command.test.ts`
- `rtk pnpm --filter @logixjs/core test -- --run test/Contracts/RuntimeCheck.contract.test.ts test/Contracts/ProgramImports.program-entry.test.ts`
- `rtk rg -n "Module fallback|Logic fallback|logix describe|contract-suite|transform.module|trialrun" packages/logix-cli/src packages/logix-cli/test docs/ssot skills/logix-cli specs/184-entry-declaration-authority`

Delta writebacks:

- update `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` so `TP-ENTRY-01` and derived index reflect final proof refs
- update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if command/schema/entry contract text changes
- update `docs/ssot/runtime/09-verification-control-plane.md` only if declaration pressure or scheduling law changes
- update `skills/logix-cli/SKILL.md` and `skills/logix-cli/references/commands.v1.json` only if Agent entry guidance or schema mirror changes
- update [quickstart.md](./quickstart.md), [spec.md](./spec.md), and [specs/README.md](../README.md) with final proof status after implementation

Family closure writeback is owned by [186](../186-verification-loop-orchestration/spec.md). Do not mark the 184-186 family closed from this lane alone.

## Non-Goals

- Do not implement or plan `trial --mode scenario`.
- Do not add Module/Logic fallback entry.
- Do not add `logix describe`, `logix debug`, old IR toolbox routes or compatibility aliases.
- Do not add automatic patching.
- Do not add host deep/browser/React render proof.
- Do not expose raw source, AST, blueprint internals or runtime handles in entry failure output.
