# Implementation Plan: Kernel Release Gate Profile

**Branch**: `190-kernel-release-gate-profile` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/190-kernel-release-gate-profile/spec.md`

## Summary

Absorb the external CLI analysis as a repo-local release gate projection over existing Logix proof owners. The implementation is documentation, spec and skill alignment only. It must not introduce new public commands, report schemas, live truth, scenario execution or hot-path claims.

The final state should make the analysis actionable as one profile:

```text
Kernel Release Gate Profile
  -> existing CLI command/schema proof
  -> existing verification report/repair/compare proof
  -> existing live evidence boundary proof
  -> existing hot-path perf admission rules
  -> domain-boundary and legacy-residue sweeps
```

## Stage Role

- [spec.md](./spec.md) owns the profile boundary and closure criteria.
- `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` owns the pressure row projection.
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md` owns CLI command and transport law.
- `docs/ssot/runtime/09-verification-control-plane.md` owns stage, report, repair and compare law.
- `docs/ssot/runtime/02-hot-path-direction.md` owns hot-path performance admission.
- `specs/189-discovery-consumption-contract` owns schema/skill/docs discovery sync.
- `skills/logix-cli/SKILL.md` owns Agent-facing command recipes.

This plan records execution constraints and writeback targets only. It does not become a second authority.

## Planning Granularity

This plan targets a high-intelligence implementation Agent.

No `implementation-details/*contract*.md` is needed. There is no new wire shape, DTO, CLI flag, artifact payload or runtime lifecycle rule.

## Technical Context

**Language/Version**: Markdown docs and spec-kit artifacts.  
**Primary Dependencies**: existing `@logixjs/cli` schema, `VerificationControlPlaneReport`, `LiveCommandResult`, runtime SSoT pages and proof tests.  
**Storage**: checked-in docs/spec files only.  
**Testing**: focused CLI tests, schema mirror diff, text sweeps and optional perf validation depending on touched paths.  
**Target Platform**: repo-local Agent and maintainer release/handoff workflow.  
**Project Type**: pnpm workspace with `docs/ssot`, `specs`, `skills/logix-cli`, `packages/logix-cli`.  
**Performance Goals**: no hot-path runtime change. Hot-path proof remains conditional on future touched rows.  
**Constraints**: no public command expansion, no report schema duplication, no live truth ownership, no scenario default gate.  
**Scale/Scope**: one derived profile over existing proof families.

## Constitution Check

- SSoT first: all owner law stays in `09`, `15`, `16`, `18`, `02`, `189` and predecessor specs.
- Runtime truth: CLI and live remain carriers. No new truth source.
- Forward-only: no old toolbox command revival and no compatibility route.
- Performance: no hot-path claim without current comparable evidence.
- Agent-first: the profile must be machine-checkable through artifacts, schemas, tests and sweeps.
- Public surface: no `logix challenge`, no `Runtime.compare` productization, no public `KernelStabilityReport`.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) answers owner, boundary, closure contract, must-cut list and reopen bar.

### Gate B: Implementation Admission

Implementation can start when these files exist:

- [spec.md](./spec.md)
- [plan.md](./plan.md)
- [tasks.md](./tasks.md)
- [quickstart.md](./quickstart.md)
- [checklists/requirements.md](./checklists/requirements.md)

No `discussion.md` is needed because there are no unresolved candidate shapes. The adopted shape is a repo-local derived profile.

## Perf Evidence Plan

190 is documentation/spec/skill alignment and does not touch runtime hot paths.

Required evidence:

- text sweep for rejected public command/report vocabulary
- CLI schema and result-boundary proof remains available through existing tests
- schema mirror diff remains clean

Full perf collection is not required for this implementation. If a later implementation uses the profile to close a hot-path change, the touched owner spec must provide same-profile before/after evidence following `02`.

## Project Structure

### New Spec Artifacts

```text
specs/190-kernel-release-gate-profile/
├── spec.md
├── plan.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Documentation Writeback Targets

- `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `specs/189-discovery-consumption-contract/spec.md`
- `specs/README.md`
- `skills/logix-cli/SKILL.md`

## Phase 1 - Spec And Profile Definition

Output:

- [spec.md](./spec.md)

Requirements:

- classify the external analysis themes
- define the derived gate row list
- state no new public command/report/stage
- define closure and reopen bars

## Phase 2 - SSoT Projection Writeback

Outputs:

- `16` gate projection section
- `15` CLI profile note
- `09` default gate note
- `02` perf projection note
- `189` downstream consumer note

Requirements:

- no duplicate report schema
- no new command grammar
- no live verification authority
- all rows route to existing owner pages or future/rejected classifications

## Phase 3 - Agent Skill And Quickstart

Outputs:

- [quickstart.md](./quickstart.md)
- `skills/logix-cli/SKILL.md` release gate section

Requirements:

- teach Agents to use existing CLI commands/tests/sweeps
- explicitly forbid `logix challenge`
- show optional compare and live evidence handoff boundaries

## Phase 4 - Verification And Completion Audit

Required witness set:

- schema mirror diff
- focused CLI schema/result/live boundary tests when feasible
- text sweeps for rejected public vocabulary
- spec-kit coded point extraction for 190
- changed-file `git diff --check`

Minimum commands:

```bash
rtk diff -u packages/logix-cli/src/schema/commands.v1.json skills/logix-cli/references/commands.v1.json
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/command-schema.guard.test.ts test/Integration/command-result-transport.contract.test.ts test/Integration/live-command-result.contract.test.ts
rtk rg -n "logix challenge|logix debug|logix describe|--describe-json|KernelStabilityReport" docs/ssot specs/190-kernel-release-gate-profile skills/logix-cli packages/logix-cli/src/schema
rtk .codex/skills/speckit/scripts/bash/extract-coded-points.sh --feature 190 --json
rtk git diff --check -- docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md docs/ssot/runtime/15-cli-agent-first-control-plane.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/02-hot-path-direction.md specs/189-discovery-consumption-contract/spec.md specs/190-kernel-release-gate-profile/spec.md specs/190-kernel-release-gate-profile/plan.md specs/190-kernel-release-gate-profile/tasks.md specs/190-kernel-release-gate-profile/quickstart.md specs/190-kernel-release-gate-profile/checklists/requirements.md specs/README.md skills/logix-cli/SKILL.md
```

If focused package tests are unavailable or fail for unrelated environment reasons, the final report must state that and rely only on completed text/schema verification. If the worktree contains unrelated generated or binary diffs, run `git diff --check` against the task-owned file list and report the global blocker separately.

## Writeback Matrix

| Artifact | Writeback |
| --- | --- |
| `09` | State that release gate aggregation is a derived profile, not a new stage/report/default gate. |
| `15` | State that CLI can execute profile components but does not expose `challenge` or own gate truth. |
| `16` | Add release gate projection rows and challenge-pack mapping. |
| `02` | Add perf projection rule for touched hot-path rows. |
| `189` | Mark 190 as downstream consumer of static schema and recipe sync. |
| `skills/logix-cli` | Add Agent-facing profile recipe. |
| `specs/README.md` | Register 190 in the Agent self-verification group. |

## Non-Goals

- Do not implement a CLI runner script.
- Do not modify package schema.
- Do not modify runtime/core/live code.
- Do not add tests unless existing docs/spec references are insufficient.
- Do not edit archive docs.
