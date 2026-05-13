# Implementation Plan: Verification Loop Orchestration Contract

**Branch**: `186-verification-loop-orchestration` | **Date**: 2026-05-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/186-verification-loop-orchestration/spec.md`

## Summary

Close the terminal offline Agent self-verification loop over existing public commands:

```text
edit -> check -> trial startup -> repair -> exact rerun -> compare -> closed or next stage
```

Implementation must make `CommandResult`, primary report artifacts, exact rerun coordinates, file-backed artifact fallback, `nextRecommendedStage` and compare admissibility work as one recoverable loop. The loop must remain expressible through `check`, `trial --mode startup` and `compare`.

This plan explicitly excludes `trial --mode scenario`, automatic patching, live target discovery as a loop stage, browser host deep trial, a new `verify` command and any hidden human-log parsing.

Within the 184-186 family, this plan is the final orchestrator. It owns the family closure gate after 184 entry/declaration authority and 185 repair intent join law are stable.

## Stage Role

- This file records execution constraints only.
- [spec.md](./spec.md) owns the 186 feature law.
- [Verification Control Plane](../../docs/ssot/runtime/09-verification-control-plane.md) owns stage vocabulary, compare admissibility, report authority and scheduling.
- [CLI Agent First Control Plane](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md) owns command result transport, command grammar, artifact refs and static schema.
- [Agent Self Verification Terminal Pressure Matrix](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md) owns terminal loop pressure and proof refs.
- [184](../184-entry-declaration-authority/spec.md) owns Program entry authority.
- [185](../185-repair-intent-contract/spec.md) owns repair intent consumed by this loop.

Implementation must update this plan only if execution discovers a changed authority, gate or writeback target.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

It freezes owner boundaries, landing zones, phase order, witness set, proof obligations, repeatability gates, and writeback targets. It intentionally avoids line-by-line algorithms.

No `implementation-details/*contract*.md` is required in 186. Existing `CommandResult`, `VerificationControlPlaneReport`, report artifact, rerun coordinate and compare contracts own the exact wire shapes.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/core`, `@logixjs/cli`, Effect V4 baseline as used by the workspace.  
**Storage**: CLI output artifacts under caller-selected `outRoot`; file-backed primary reports when stdout budget requires.  
**Testing**: Vitest, package-local CLI integration tests, core compare/control-plane tests, text sweeps.  
**Target Platform**: Node.js 20+ CLI and runtime control-plane tests.  
**Project Type**: pnpm workspace with `packages/logix-core` and `packages/logix-cli`.  
**Performance Goals**: default loop commands remain deterministic and artifact budget aware; no live/browser/host harness cost in default loop.  
**Constraints**: no new public command, no scenario default gate, no live result as verification verdict, no human-log contract, no inline expansion of large evidence/selection payloads.  
**Scale/Scope**: offline Agent self-verification over Program entry, report refs, evidence refs and selection refs.

## Constitution Check

- SSoT first: 186 imports `09`, `15`, `16`, `161`, `162`, `184` and `185`; changed stage, transport or compare law must be written back before implementation closes.
- Runtime truth: machine conclusions remain `VerificationControlPlaneReport`; CLI is transport only.
- Stage separation: check pass recommends startup trial without implying startup passed; startup trial pass marks the default offline gate complete unless compare is explicitly requested. Before/after repair-loop closure remains compare-owned.
- Scheduling authority: top-level `nextRecommendedStage` remains unique.
- Deterministic identity: normalized command input, artifact keys, digests, verdicts and next stage must be stable.
- Payload discipline: evidence and selection stay refs in rerun coordinates; large reports use file fallback.
- Performance: no default loop proof requires browser, live daemon, React host or scenario executor.
- Forward-only: no `logix verify --stage`, no archived command revival, no compatibility mode.
- Single-track implementation: existing commands form the terminal loop.

## Family Closure Matrix

| Layer | Owner | Gate |
| --- | --- | --- |
| Family preflight | 186 | 09/15/16/161/162 plus 184/185 authority reviewed; no `discussion.md` with `Must Close Before Implementation` remains |
| Lane delta proof | 184 | Program-only entry, declaration pressure, `162` transport-gate failure and repaired entry rerun facts are stable |
| Lane delta proof | 185 | repair hint join law, artifact backlinks, top-level scheduling precedence and live forbidden-field guard are stable |
| Family closure gate | 186 | check, startup trial, exact rerun and compare consume 184/185 facts as one loop; final SSoT, skill and spec index writeback is complete |

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) answers:

- loop owner boundary across check/trial/compare
- in-scope and out-of-scope stage families
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

186 touches CLI transport and report comparison, not runtime execution hot paths by default.

Required evidence:

- Repeatability witness: normalized rerun input produces stable verdict, error code, artifact keys, digest and next stage.
- Output budget witness: primary report can be recovered from file when inline output is truncated.
- Default loop witness: no check/startup/compare proof depends on scenario, live daemon, browser host or human logs.

Full `pnpm perf collect` is N/A unless implementation changes core compare/report materialization in a measurable hot path. If that happens, record focused before/after artifacts under `specs/186-verification-loop-orchestration/perf/` and update this plan before closure.

## Project Structure

### Documentation

```text
specs/186-verification-loop-orchestration/
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

CLI commands and transport:

- `packages/logix-cli/src/internal/commands/check.ts`
- `packages/logix-cli/src/internal/commands/trial.ts`
- `packages/logix-cli/src/internal/commands/compare.ts`
- `packages/logix-cli/src/internal/entry.ts`
- `packages/logix-cli/src/internal/commandSchema.ts`
- `packages/logix-cli/src/schema/commands.v1.json`

Core control-plane and compare:

- `packages/logix-core/src/ControlPlane.ts`
- `packages/logix-core/src/Runtime.ts`
- `packages/logix-core/src/internal/verification/**`
- `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`

Proof:

- `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`
- `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`
- `packages/logix-cli/test/Integration/compare.command.test.ts`
- `packages/logix-cli/test/Integration/repair-closure.program-assembly.e2e.test.ts`
- `packages/logix-cli/test/Integration/repair-closure.source-declaration.e2e.test.ts`
- `packages/logix-cli/test/Integration/repair-closure.dependency.e2e.test.ts`
- `packages/logix-cli/test/Integration/check.command.test.ts`
- `packages/logix-cli/test/Integration/trial.command.test.ts`
- `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`

Implementation may choose narrower files after reading current code. If a listed file is not needed, leave it untouched.

## Phase 0 - Research And Admission Confirmation

Output:

- [research.md](./research.md)

Required decisions:

- existing public commands are sufficient: `check`, `trial --mode startup`, `compare`
- `CommandResult` is a transport envelope and not report truth
- exact rerun coordinate is reconstructed from input coordinate, argv snapshot and artifact refs
- file-backed artifact fallback is part of the loop contract
- compare returns closed, regression, mismatch or inconclusive admissibility without hiding input mismatches
- no new exact contract file is needed because existing report/transport contracts own wire shapes

## Phase 1 - Data Model And Quickstart

Outputs:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)

The model must name only stable coordination objects:

- Command Result
- Primary Report Artifact
- Rerun Coordinate
- Compare Admissibility
- Loop Stage Boundary

The quickstart must show focused proof commands and text sweeps for loop closure.

## Phase 2 - Command Result And Artifact Recovery

Requirements:

- every check/trial/compare result preserves exact rerun coordinate
- runtime-stage primary report lookup uses `primaryReportOutputKey` and `artifacts[].outputKey`; pre-control-plane gate failures may use the same key path for transport error artifacts
- stdout budget behavior preserves file fallback, truncation metadata, digest and artifact key stability
- non-zero exits with structured output remain consumable by Agents

## Phase 3 - Stage Advancement And Rerun

Requirements:

- check pass recommends startup trial while stating check-only pass boundary
- startup trial pass marks the default offline gate complete unless compare is explicitly requested
- failed check/trial reports preserve enough coordinate to rerun the same command shape
- evidence and selection inputs remain refs rather than inline payloads in rerun coordinates

## Phase 4 - Compare Closure And Admissibility

Requirements:

- compare preserves before and after report refs as artifacts
- compare distinguishes repair closed, regression, mismatch and inconclusive admissibility
- declaration, evidence and environment mismatches return inconclusive, not pass or generic failure
- exact rerun and compare proof covers program assembly, source declaration and dependency repair families

## Phase 5 - Proof And Writeback

Required witness set:

- family preflight proof that 184 and 185 lane gates are closed or have stable proof facts ready for consumption
- exact rerun coordinate proof for check, trial startup and compare
- output budget/file fallback proof
- before/after compare closure proof for program assembly, source declaration and dependency
- compare admissibility mismatch proof
- repeatability proof for normalized input
- classified active public-surface sweep proving no `verify` wide command or scenario default gate

Verification matrix:

- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/exact-rerun-coordinate.contract.test.ts test/Integration/command-result-transport.contract.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/check.command.test.ts test/Integration/trial.command.test.ts test/Integration/compare.command.test.ts`
- `rtk pnpm --filter @logixjs/cli test -- --run test/Integration/repair-closure.program-assembly.e2e.test.ts test/Integration/repair-closure.source-declaration.e2e.test.ts test/Integration/repair-closure.dependency.e2e.test.ts`
- `rtk pnpm --filter @logixjs/core test -- --run test/Contracts/VerificationControlPlaneContract.test.ts test/Contracts/VerificationControlPlaneCompare.contract.test.ts`
- classified text sweeps from [quickstart.md](./quickstart.md)

Family writebacks:

- update `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` if terminal loop proof refs change
- update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` if command grammar, rerun coordinate or artifact recovery guidance changes
- update `docs/ssot/runtime/09-verification-control-plane.md` if report scheduling, pass boundary or compare admissibility law changes
- update `skills/logix-cli/SKILL.md` if Agent loop consumption recipe changes
- update [quickstart.md](./quickstart.md), [spec.md](./spec.md), and [specs/README.md](../README.md) with final proof status after implementation

## Non-Goals

- Do not implement or plan `trial --mode scenario`.
- Do not add `logix verify --stage` or any wide verification command.
- Do not treat live output as verification verdict.
- Do not add automatic patch generation.
- Do not depend on browser host deep validation or human logs.
- Do not inline large evidence or selection payloads into rerun coordinates.
