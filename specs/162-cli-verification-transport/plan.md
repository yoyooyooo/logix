# Implementation Plan: CLI Verification Transport

**Branch**: `162-cli-verification-transport` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/162-cli-verification-transport/spec.md`

## Summary

`162` turns the CLI pressure rows in `docs/ssot/runtime/16` into transport and roundtrip implementation work. The CLI must keep `check / trial / compare` as the entire public command surface, keep `CommandResult` transport-only, preserve exact rerun coordinates, enforce stdout/artifact determinism, consume DVTools evidence and selection hints without owning truth, and route compare inputs to core compare.

The approach is single-track: extend the existing CLI result, input coordinate, evidence input, command schema and integration tests. Do not add commands, report shapes, CLI-owned declaration truth, CLI-owned compare logic, or compatibility paths for old toolbox commands.

## Stage Role

- This file records execution constraints only.
- This file does not redefine core report, declaration, dependency or compare truth.
- Stable results must be written back to `docs/ssot/runtime/15`, `14` and `16` after implementation.

## North Stars & Kill Features

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/cli`, `@logixjs/core/ControlPlane`, Node.js filesystem APIs for artifact refs.  
**Storage**: File artifacts and stdout envelope. No database or persistent service.  
**Testing**: Vitest integration tests under `packages/logix-cli/test/Integration`.  
**Target Platform**: Node.js 20+ CLI.  
**Project Type**: pnpm workspace, package-local CLI implementation.  
**Performance Goals**: CLI discovery and input validation must avoid loading heavy runtime paths; command execution cost is on-demand.  
**Constraints**: `CommandResult` is transport-only, `VerificationControlPlaneReport` is machine truth, artifact key namespace is only `artifacts[].outputKey`, pre-control-plane failure does not enter `nextRecommendedStage`.  
**Scale/Scope**: CLI transport closure across check/trial/compare, evidence selection import and before/after compare proof.

## Constitution Check

Pre-design result: pass.

- NS/KF traceability is recorded in `spec.md` and mirrored here.
- The design maps to `Intent -> Flow/Logix -> Code -> Runtime` by giving Agent a stable shell route to runtime verification evidence.
- Authority docs were updated first: `docs/ssot/runtime/15`, `14`, `16`.
- The feature changes CLI transport contract only; `docs/ssot/runtime/09` and core own report truth.
- No public command beyond `check / trial / compare` is introduced.
- Deterministic identity is required for runId, inputCoordinate, artifact outputKey and primaryReportOutputKey.
- No transaction window IO is introduced; file IO is CLI artifact transport outside runtime transactions.
- React and external source semantics are not touched.
- No new Runtime Service or process-global singleton is introduced.
- No core-ng dependency is introduced.
- Performance budget is lazy help/schema discovery and no heavy runtime load before command execution.
- Diagnosability improves through deterministic envelope and artifact refs.
- Forward-only execution is required; old toolbox command compatibility remains deleted.
- Package exports stay within existing CLI package boundaries and schema artifact path.
- Touched files are below 1000 LOC at planning time; no decomposition brief is required yet.
- Quality gates are targeted CLI integration tests, package typecheck, schema guard and SSoT/spec grep checks.

Post-design result: pass. Phase 1 artifacts do not introduce a second authority or unresolved clarification.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) defines owner, scope, closure and reopen bar.

### Gate B: Implementation Admission

Passed when this plan, [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md), [tasks.md](./tasks.md) and [checklists/implementation-closure.md](./checklists/implementation-closure.md) are present.

[checklists/requirements.md](./checklists/requirements.md) is a specification quality checklist only. It is not an implementation admission or completion artifact.

## Perf Evidence Plan

`162` touches CLI transport, not runtime hot path. Perf evidence is usually `N/A`.

Required lightweight evidence:

- `--help` and schema guard must not require runtime execution.
- Integration tests must prove large report truncation/file fallback behavior deterministically.

If implementation introduces runtime loading during discovery or a new always-on artifact writer, add a focused timing/allocation note in this directory before merge.

## Project Structure

### Documentation

```text
specs/162-cli-verification-transport/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── checklists/
    ├── requirements.md
    └── implementation-closure.md
```

### Source Code

```text
packages/logix-cli/src/
├── index.ts
├── internal/
│   ├── args.ts
│   ├── commandSchema.ts
│   ├── evidenceInput.ts
│   ├── inputCoordinate.ts
│   ├── result.ts
│   └── commands/
│       ├── check.ts
│       ├── trial.ts
│       └── compare.ts
└── schema/
    └── commands.v1.json

packages/logix-cli/test/
├── Integration/
│   ├── command-result-transport.contract.test.ts
│   ├── output-contract.test.ts
│   ├── command-schema.guard.test.ts
│   ├── evidence-selection-input.contract.test.ts
│   ├── compare.command.test.ts
│   ├── check.command.test.ts
│   ├── trial.command.test.ts
│   └── program-entry.contract.test.ts
└── fixtures/
    ├── evidence-package/
    └── selection-manifest.json
```

**Structure Decision**: Keep `CommandResult` and artifact rules in `internal/result.ts`, keep rerun coordinate in `internal/inputCoordinate.ts`, keep evidence/selection parsing in `internal/evidenceInput.ts`, keep command routing in command files. Do not add a new command family.

## Required Witness Set

- Public surface witness: help, parser and schema expose only `check / trial / compare`.
- Transport witness: `CommandResult` remains transport-only and points to a `VerificationControlPlaneReport` artifact through `primaryReportOutputKey`.
- Rerun witness: `inputCoordinate` reconstructs same check/trial input and supports stage upgrade.
- Artifact witness: outputKey ordering, primaryReportOutputKey, relatedArtifactOutputKeys and selection manifest keys share one namespace.
- Stdout witness: budget, truncation metadata, file fallback and error result are deterministic.
- Evidence witness: canonical evidence package and selection manifest are consumed as provenance/hint only.
- Compare witness: before/after report refs route to core compare and return admissibility result when not comparable.
- Closure proof witness: Program assembly, source/declaration and dependency failure families each have before -> repair -> exact rerun -> compare proof pack.

## Result Writeback

- Authority pages:
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/14-dvtools-internal-workbench.md`
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - `docs/ssot/runtime/09-verification-control-plane.md` only if core compare/report assumptions change
- Spec state sync:
  - `spec.md` is `Active` while implementation tasks are open.
  - Move to `Done` only after witness set and SSoT writeback pass.
- Discussion cleanup:
  - No `discussion.md` exists for this spec.
- Witness surfaces:
  - CLI integration tests and schema guard.
  - Logix CLI skill must be updated if invocation or proof procedure changes.
  - Proof refs must be copied into `docs/ssot/runtime/16` rows if they become covered.

## Non-Goals

- No core dependency parser or static pressure implementation.
- No DVTools UI implementation.
- No Chrome DevTools migration.
- No new public command.
- No raw provider overlay public input.
- No raw trace full compare, browser host or replay default gate.
- No Module/Logic entry compatibility fallback.

## Complexity Tracking

No constitution violation is planned.
