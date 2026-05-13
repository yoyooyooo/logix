# Feature Specification: Verification Loop Orchestration Contract

**Feature Branch**: `186-verification-loop-orchestration`  
**Created**: 2026-05-07  
**Status**: Implemented  
**Input**: User description: "Create terminal requirement for Verification Loop Orchestration Contract: make check to trial startup to compare to rerun a recoverable Agent self-verification loop, excluding trial scenario."

## Implementation Result

Implemented on 2026-05-07. The terminal offline loop is closed through existing `check`, `trial --mode startup` and `compare` commands with exact rerun coordinates, primary report lookup, output budget fallback, compare admissibility and repair closure proof. Proof refs: `packages/logix-cli/test/Integration/exact-rerun-coordinate.contract.test.ts`, `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`, `packages/logix-cli/test/Integration/check.command.test.ts`, `packages/logix-cli/test/Integration/trial.command.test.ts`, `packages/logix-cli/test/Integration/compare.command.test.ts`, `packages/logix-cli/test/Integration/repair-closure.*.e2e.test.ts`, `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`.

## Current Role

- This page holds the single terminal loop contract for the 184-186 offline Agent self-verification family.
- This page owns orchestration contract across `check`, `trial --mode startup`, exact rerun, and `compare`.
- This page consumes 184 entry/declaration authority and 185 repair intent as prerequisite proof lanes.
- This page explicitly excludes `trial --mode scenario`.

## Context

Current CLI and core proof already cover many loop mechanics: `CommandResult`, `primaryReportOutputKey`, artifact refs, exact rerun coordinate, compare closure, and repeatability. Runtime-stage results select a `VerificationControlPlaneReport`; pre-control-plane entry failures select a transport error artifact. The terminal requirement is to treat these transports as one recoverable loop rather than independent commands.

The final loop must be:

```text
edit -> check -> trial startup -> repair -> exact rerun -> compare -> closed or next stage
```

The Agent must be able to stop, resume, rerun, and compare using only machine-readable result envelopes and artifact refs.

## Scope

### In Scope

- Default offline Agent self-verification loop.
- Family closure over `184 -> 185 -> 186`.
- Exact rerun coordinate for check, trial startup, compare, evidence refs, and selection refs.
- Before/after report refs and compare admissibility.
- Artifact file/inline budget behavior.
- Repeatability envelope and normalized input stability.
- Scheduling law for `nextRecommendedStage`.

### Out of Scope

- Scenario execution.
- Automatic patch generation.
- Live target discovery and evidence export except as input refs consumed by trial or compare.
- Browser host deep trial.
- New CLI command namespace or single wide `verify` command.

## Imported Authority

- [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [specs/161-verification-pressure-kernel/spec.md](../161-verification-pressure-kernel/spec.md)
- [specs/162-cli-verification-transport/spec.md](../162-cli-verification-transport/spec.md)
- [specs/184-entry-declaration-authority/spec.md](../184-entry-declaration-authority/spec.md)
- [specs/185-repair-intent-contract/spec.md](../185-repair-intent-contract/spec.md)

## Closure & Guardrails

### Closure Contract

- The default Agent loop is expressible through existing public commands only: `check`, `trial`, `compare`.
- Every command result contains enough coordinate to rerun or advance to the recommended next stage.
- Compare can determine repair closed, regression, mismatch, or inconclusive admissibility.
- Repeatability proof covers stable verdict, error code, artifact keys, artifact digests, and next stage under normalized inputs.
- Entry/declaration proof from 184 and repair-intent proof from 185 are consumed by this family closure; neither prerequisite lane can mark the family closed alone.
- The family closure matrix uses three layers: family preflight, lane delta proof packs, and final family closure gate.

### Must Cut

- No `logix verify --stage` wide command.
- No archived command revival.
- No hidden human-log parsing.
- No live command result as verification verdict.
- No scenario or host-deep execution in the default loop.

### Reopen Bar

Reopen only if a real Agent or CI workflow cannot reconstruct the next verification command from `CommandResult`, report artifacts, and stable refs without adding a new public command.

## User Scenarios & Testing

### User Story 1 - Resume From A Failed Check (Priority: P1)

An Agent runs check, receives a static failure, repairs source, reruns the same check, and compares before/after reports.

**Why this priority**: Static repair closure is the cheapest loop and should be deterministic.

**Independent Test**: Use source/declaration failure fixtures and compare before/after report refs.

**Acceptance Scenarios**:

1. **Given** a failing check report, **When** the Agent reads the command result, **Then** it can reconstruct the same check command from the input coordinate.
2. **Given** a repaired check report, **When** compare runs against before and after, **Then** compare returns repair closed or a structured non-closure reason.

---

### User Story 2 - Advance From Check To Startup Trial (Priority: P1)

An Agent runs check successfully and needs the next stage. The check report must tell it to run startup trial without implying that startup has already passed.

**Why this priority**: This preserves stage separation while keeping the loop easy to follow.

**Independent Test**: Run a passing check fixture, inspect `nextRecommendedStage`, then run startup trial with the same entry.

**Acceptance Scenarios**:

1. **Given** check passes, **When** the Agent reads the report, **Then** `nextRecommendedStage` points to trial and the check finding states the pass boundary.
2. **Given** startup trial passes, **When** the Agent reads the report, **Then** no next stage is required for the default gate.

---

### User Story 3 - Compare Safely Across Evidence Inputs (Priority: P2)

An Agent compares reports that include evidence refs. Compare must reject non-comparable inputs or close the repair without hiding input mismatches.

**Why this priority**: Evidence-aware repair must not produce false closure.

**Independent Test**: Compare same-input and mismatched-input report fixtures with evidence refs.

**Acceptance Scenarios**:

1. **Given** before and after reports with matching admissibility coordinates and after is pass, **When** compare runs, **Then** repair closure is pass.
2. **Given** before and after reports with mismatched declaration or environment fingerprint, **When** compare runs, **Then** compare returns inconclusive with a repair hint to rerun comparable inputs.

### Edge Cases

- Primary report is stored in file because stdout budget is exceeded.
- Evidence refs are large and must remain refs, not inline payloads.
- The same run id differs but normalized command input is otherwise stable.
- After report changes failure code without becoming pass.
- Compare input file is missing or not a verification report.

## Requirements

### Functional Requirements

- **FR-001**: Command results MUST preserve exact rerun coordinate for check, trial startup, and compare.
- **FR-002**: Runtime-stage primary report lookup MUST use `primaryReportOutputKey` and `artifacts[].outputKey`; pre-control-plane gate failures may use the same key path for transport error artifacts.
- **FR-003**: Output budget behavior MUST preserve file fallback, truncation metadata, digest, and artifact key stability.
- **FR-004**: Check pass MUST recommend startup trial while explicitly stating check-only pass boundary.
- **FR-005**: Startup trial pass MUST mark the default offline gate complete unless compare is explicitly requested.
- **FR-006**: Compare MUST preserve before and after report refs as artifacts.
- **FR-007**: Compare MUST expose admissibility mismatch as inconclusive, not pass or generic failure.
- **FR-008**: `nextRecommendedStage` MUST be the only top-level scheduling authority.
- **FR-009**: Exact rerun coordinate MUST keep evidence and selection as refs rather than inline payloads.
- **FR-010**: The loop MUST remain usable by CI and Agents through the same machine contract.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Default loop commands MUST remain deterministic under normalized inputs.
- **NFR-002**: Command results and reports MUST be machine-readable without human logs.
- **NFR-003**: Report repeatability MUST ignore only explicitly allowed volatile fields.
- **NFR-004**: The loop MUST not introduce new public authoring surface or verification report truth.
- **NFR-005**: Documentation and skill guidance MUST show the canonical loop and report extraction path.

### Key Entities

- **Command Result**: CLI stdout transport envelope.
- **Primary Report Artifact**: The runtime-stage verification report selected by output key.
- **Rerun Coordinate**: Stable command input snapshot and refs.
- **Compare Admissibility**: Declaration, canonical evidence summary, scenario plan digest, and environment comparability for the current offline loop. `scenarioPlanDigest` remains a nullable/pass-through axis inherited from `09`, not a required proof input here.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Check, startup trial, and compare can each be rerun from command result coordinate in contract tests.
- **SC-002**: Three repair closure families have before-to-after compare proof: program assembly, source declaration, and dependency.
- **SC-003**: Output budget tests prove primary report can be recovered from file when inline output is truncated.
- **SC-004**: Repeatability proof confirms stable verdict, error code, artifact keys, digest, and next stage for normalized inputs.
- **SC-005**: No default loop proof depends on `trial --mode scenario`, browser host deep validation, or human logs.
- **SC-006**: Family closure proves 184 entry/declaration failures, 185 repair hints, exact rerun coordinates, and compare closure can be consumed as one loop without adding a new command, report taxonomy, or live verdict lane.
