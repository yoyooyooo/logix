# Implementation Plan: Verification Pressure Kernel

**Branch**: `161-verification-pressure-kernel` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/161-verification-pressure-kernel/spec.md`

## Summary

`161` turns the pressure rows in `docs/ssot/runtime/16` into core/kernel execution work. The implementation must make `runtime.check` express static pressure without booting runtime, make `runtime.trial(mode="startup")` emit typed dependency cause pressure, preserve boot/close dual summaries, tighten PASS and next-stage semantics, and expand compare admissibility and repeatability proof.

The approach is single-track: extend the existing `@logixjs/core/ControlPlane` contract and existing verification proof-kernel route. Do not add a second report shell, second dependency parser, CLI-owned truth, DVTools-owned truth, or public authoring API.

## Stage Role

- This file records execution constraints only.
- This file does not redefine stage, report, focusRef, compare or capabilities authority.
- Stable decisions must be written back to `docs/ssot/runtime/09`, `04` and `16` after implementation.

## North Stars & Kill Features

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/core`, Effect V4 workspace baseline, existing verification proof kernel.  
**Storage**: No persistent storage. Reports and artifacts are serializable in-memory objects consumed by tests and CLI.  
**Testing**: Vitest and targeted package commands; `@effect/vitest` only where Effect-heavy tests need it.  
**Target Platform**: Node.js 20+ and modern browser-compatible core code.  
**Project Type**: pnpm workspace, package-local core implementation.  
**Performance Goals**: `runtime.check` remains non-booting and cheap; startup trial adds structured summaries without adding a second execution path. Any touched hot path must show targeted tests and, if steady-state runtime cost changes, perf evidence.  
**Constraints**: Report payloads stay slim, deterministic, serializable and coordinate-first. No compatibility layer, dual report, dual parser or shadow path.  
**Scale/Scope**: One runtime control-plane kernel slice: static pressure, dependency cause, lifecycle summary, compare admissibility, PASS semantics and repeatability.

## Constitution Check

Pre-design result: pass.

- NS/KF traceability is recorded in `spec.md` and mirrored here.
- The design maps to `Intent -> Flow/Logix -> Code -> Runtime` by giving Agent-readable runtime evidence for Program assembly and repair.
- Authority docs were updated first: `docs/ssot/runtime/09`, `04`, `16`.
- The feature changes Logix verification contracts; `docs/ssot/runtime/09` remains the report/stage authority and `04` remains capabilities owner.
- No public authoring API is introduced.
- Deterministic identity is required for focusRef, artifact keys, errorCode and repeatability fields.
- No transaction window IO is introduced.
- React no-tearing and external source semantics are not touched.
- Internal verification collaboration stays inside explicit core modules; no process-global singleton is added.
- No core-ng dependency is introduced.
- Performance budget is focused on non-booting `runtime.check` and no second startup execution kernel.
- Diagnosability improves through structured pressure while keeping report payloads slim.
- Forward-only execution is required; no old shape or compatibility mode.
- Public submodule exports stay on `@logixjs/core/ControlPlane` and existing root facades.
- Touched files are below 1000 LOC at planning time; no decomposition brief is required yet.
- Quality gates are targeted core tests, package typecheck, and SSoT/spec grep checks.

Post-design result: pass. Phase 1 artifacts do not introduce a second authority or unresolved clarification.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) defines owner, scope, closure and reopen bar.

### Gate B: Implementation Admission

Passed when this plan, [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md) and [quickstart.md](./quickstart.md) are present.

## Perf Evidence Plan

`161` touches runtime verification paths. Required evidence:

- Baseline semantics: code before/after.
- Minimum proof: targeted tests must prove `runtime.check` does not boot runtime.
- If implementation changes steady-state runtime creation, dependency resolution or hot lifecycle paths, collect perf evidence before merge.
- Suggested collect command when hot path changes are present:
  - `pnpm perf collect -- --profile default --out specs/161-verification-pressure-kernel/perf/before.<sha>.<envId>.default.json`
  - `pnpm perf collect -- --profile default --out specs/161-verification-pressure-kernel/perf/after.<sha|worktree>.<envId>.default.json`
  - `pnpm perf diff -- --before specs/161-verification-pressure-kernel/perf/before...json --after specs/161-verification-pressure-kernel/perf/after...json --out specs/161-verification-pressure-kernel/perf/diff.before__after.json`
- Failure policy: `comparable=false`, timeout, missing suite or stability warning blocks any performance conclusion until rerun or scoped evidence is supplied.

## Project Structure

### Documentation

```text
specs/161-verification-pressure-kernel/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
packages/logix-core/src/
├── ControlPlane.ts
├── Runtime.ts
└── internal/
    ├── verification/
    │   ├── staticCheck.ts
    │   ├── proofKernel.ts
    │   └── proofKernel.types.ts
    └── observability/
        ├── trialRunErrors.ts
        ├── trialRunModule.ts
        ├── trialRunReportPipeline.ts
        └── trialRunEnvironment.ts

packages/logix-core/test/
├── Contracts/
│   ├── RuntimeCheck.contract.test.ts
│   ├── ProgramImports.program-entry.test.ts
│   ├── VerificationControlPlaneCompare.contract.test.ts
│   └── VerificationControlPlaneContract.test.ts
└── observability/
    ├── Observability.trialRunModule.missingService.test.ts
    ├── Observability.trialRunModule.missingConfig.test.ts
    ├── Observability.trialRunModule.disposeTimeout.test.ts
    └── Observability.trialRunModule.scopeDispose.test.ts
```

**Structure Decision**: Keep the public contract in `ControlPlane.ts`; keep reusable verification mechanics under `internal/verification/**`; keep canonical startup adapter logic in `internal/observability/**`. Add new files only when an existing file starts mixing unrelated concerns.

## Required Witness Set

- Static pressure witness: blueprint guard, Program-only imports, duplicate imports, declaration freshness/sourceRef pressure, no runtime boot.
- Dependency cause witness: missing service, missing config, missing Program import, imported child dependency, provider source and phase.
- Lifecycle witness: boot failure plus close summary remain visible with artifact-backed linking.
- PASS semantics witness: current-stage PASS does not imply future scenario, host deep, raw trace or replay.
- Compare admissibility witness: declaration, scenario plan, evidence summary or environment mismatch returns `INCONCLUSIVE` or admissibility failure instead of false repair failure.
- Repeatability witness: same normalized input keeps verdict, errorCode, artifact keys, digest and next stage stable, ignoring only allowed runId/path/outDir variance.
- Closure proof witness: Program assembly, source/declaration and dependency failure each have before -> repair -> exact rerun -> compare proof pack.

## Result Writeback

- Authority pages:
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- Spec state sync:
  - Move `spec.md` from `Planned` to `Active` when implementation starts.
  - Move to `Done` only after witness set and SSoT writeback pass.
- Discussion cleanup:
  - No `discussion.md` exists for this spec.
- Witness surfaces:
  - Core contract tests and observability tests listed above.
  - Proof refs must be copied into `docs/ssot/runtime/16` rows if they become covered.

## Non-Goals

- No CLI transport, stdout budget or `CommandResult.inputCoordinate` work.
- No DVTools UI or selection manifest schema work.
- No Chrome DevTools migration.
- No scenario executor success path.
- No host deep trial, raw trace compare or replay default gate.
- No public authoring API or compatibility layer.

## Complexity Tracking

No constitution violation is planned.
