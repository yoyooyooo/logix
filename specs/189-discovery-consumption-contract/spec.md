# Feature Specification: Discovery And Consumption Contract

**Feature Branch**: `189-discovery-consumption-contract`  
**Created**: 2026-05-07  
**Status**: Implemented  
**Input**: User description: "Create terminal requirement for Discovery And Consumption Contract: keep CLI schema, skill mirror, docs, and Agent report consumption recipes synchronized without reviving archived commands."

## Implementation Result

Implemented on 2026-05-08. Package schema, skill mirror, docs routes and Agent consumption recipes are now synchronized for public command discovery, runtime-stage report extraction, transport gate error handling and live evidence consumption. Proof refs: `packages/logix-cli/test/Integration/command-schema.guard.test.ts`, `packages/logix-cli/test/Integration/legacy-command-rejection.guard.test.ts`, `packages/logix-cli/test/Integration/archived-command-deletion.guard.test.ts`, `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`, `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`, `packages/logix-cli/test/Integration/live-evidence-handoff.e2e.test.ts`, schema diff `packages/logix-cli/src/schema/commands.v1.json` vs `skills/logix-cli/references/commands.v1.json`.

## Current Role

- This page holds the minimum necessary SSoT for Agent discovery and consumption of the Logix CLI/control-plane contract.
- This page owns synchronization between package schema, skill mirror, docs routes, and report consumption recipes.
- This page does not own runtime report truth or live fact truth.
- Downstream release gate consumers, including [190-kernel-release-gate-profile](../190-kernel-release-gate-profile/spec.md), may reuse this page's static discovery and consumption contract but must not reopen executable discovery or define a second command contract.

## Context

Agent self-verification is only useful if an Agent can discover the public command grammar and consume results without guessing. The current package schema, skill-local schema mirror, docs SSoT, and command tests already cover the core shape. The terminal requirement is to prevent drift and make report extraction recipes stable.

This closure is explicitly not a new discovery command. It keeps discovery as static schema and docs, not as `logix describe`.

## Scope

### In Scope

- `@logixjs/cli/schema/commands.v1.json` as a derived static mirror.
- Skill-local `references/commands.v1.json` synchronization expectations.
- Docs SSoT links and public command contract indexing.
- Agent recipes for stdout result parsing, primary report resolution, artifact file fallback, next stage scheduling, repair hint consumption, and live artifact consumption.
- Guardrails against archived command route revival.

### Out of Scope

- New public `describe`, `--describe-json`, `debug`, `runtime`, or `evidence` discovery commands.
- Owning `VerificationControlPlaneReport` schema.
- Owning live artifact truth.
- Automatic patch generation.
- Scenario execution.

## Imported Authority

- [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- [skills/logix-cli/SKILL.md](../../skills/logix-cli/SKILL.md)
- [skills/logix-cli/references/commands.v1.json](../../skills/logix-cli/references/commands.v1.json)
- [packages/logix-cli/src/schema/commands.v1.json](../../packages/logix-cli/src/schema/commands.v1.json)
- [specs/186-verification-loop-orchestration/spec.md](../186-verification-loop-orchestration/spec.md)
- [specs/187-live-diagnosis-evidence/spec.md](../187-live-diagnosis-evidence/spec.md)

## Closure & Guardrails

### Closure Contract

- Package schema, skill mirror, docs command contract, and tests agree on public commands and result envelopes.
- Agent recipes identify which fields to consume and which fields are explanatory or forbidden.
- Archived commands remain absent from machine-readable discovery and active docs.
- Report consumption works for inline and file-backed artifacts.

### Must Cut

- No `logix describe` or `--describe-json`.
- No archived command names in active machine-readable schema.
- No help-text parsing as Agent contract.
- No skill-local mirror drift without detection.
- No live result consumption as verification report consumption.

### Reopen Bar

Reopen only if static schema and docs are insufficient for external Agent discovery and a new executable discovery route can be proven not to create another public command surface or contract truth.

## User Scenarios & Testing

### User Story 1 - Discover Public Command Grammar (Priority: P1)

An Agent needs to know which commands exist and which inputs are valid. It must read a static schema or skill reference and avoid archived routes.

**Why this priority**: Wrong command discovery breaks the loop before verification starts.

**Independent Test**: Validate package schema and skill mirror against public command expectations and archived-command rejection tests.

**Acceptance Scenarios**:

1. **Given** an Agent reads the schema, **When** it lists commands, **Then** only `check`, `trial`, `compare`, and `live` appear.
2. **Given** an archived command name, **When** it is searched in active schema, **Then** it is absent.

---

### User Story 2 - Consume Verification Result (Priority: P1)

An Agent runs check, trial, or compare and must resolve the primary report safely.

**Why this priority**: This is the critical result consumption path.

**Independent Test**: Run commands with inline and file-backed reports and follow the documented recipe.

**Acceptance Scenarios**:

1. **Given** a command result with inline report, **When** the Agent resolves `primaryReportOutputKey`, **Then** it can read verdict, next stage, and repair hints from the primary report.
2. **Given** a command result with file-backed report, **When** the Agent resolves the primary artifact, **Then** it reads the file instead of relying on truncated inline preview.

---

### User Story 3 - Consume Live Result As Evidence (Priority: P2)

An Agent runs a live command and must treat the output as evidence or gap, not a verification result.

**Why this priority**: Live diagnosis must not become a second control plane.

**Independent Test**: Run live status, targets, inspect, and export evidence route tests and follow live result recipe.

**Acceptance Scenarios**:

1. **Given** a live command result, **When** the Agent resolves `primaryLiveOutputKey`, **Then** it reads a live artifact family, not a verification report.
2. **Given** live-derived evidence is exported, **When** repair is needed, **Then** the Agent feeds evidence into trial or compare before consuming repair hints.

### Edge Cases

- Schema mirror differs only in explanatory authority text.
- Primary artifact is truncated and has a file path.
- Command exits non-zero but still returns structured result.
- Live daemon is not running and returns structured gap.
- Docs mention a command not present in schema.

## Requirements

### Functional Requirements

- **FR-001**: Public command discovery MUST remain a static derived schema and docs contract, not an executable describe route.
- **FR-002**: Schema MUST list only final public command roots: `check`, `trial`, `compare`, and `live`.
- **FR-003**: Schema MUST define required inputs, optional inputs, forbidden inputs, and primary output key field for each command family.
- **FR-004**: Skill-local schema mirror MUST remain synchronized with package schema for command grammar and result envelope fields.
- **FR-005**: Agent report consumption recipe MUST resolve primary report through `primaryReportOutputKey` and `artifacts[].outputKey`.
- **FR-006**: Agent report consumption recipe MUST prefer artifact file over truncated inline preview when file is available.
- **FR-007**: Agent scheduling recipe MUST use top-level report `nextRecommendedStage`, not hint-local stage fields.
- **FR-008**: Agent repair recipe MUST consume structured repair fields and MUST NOT require parsing prose fields.
- **FR-009**: Live consumption recipe MUST use `primaryLiveOutputKey` and MUST NOT read verification fields from live output.
- **FR-010**: Active schema, docs, and tests MUST reject archived commands and old toolbox vocabulary.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Schema and recipe drift checks MUST be cheap enough for package-level tests and release gates.
- **NFR-002**: Documentation MUST be concise enough for Agent context loading and must avoid duplicating runtime payload truth.
- **NFR-003**: Recipes MUST work for non-zero command exits as long as structured result output is present.
- **NFR-004**: Static schema MUST declare itself as derived mirror and reference authority pages or owner contracts.
- **NFR-005**: Any command or report contract change MUST update schema, skill mirror, docs, and guard tests in the same delivery.

### Key Entities

- **Command Schema Mirror**: Derived machine-readable command grammar.
- **Verification Consumption Recipe**: Stable procedure for reading `CommandResult` and report artifacts.
- **Live Consumption Recipe**: Stable procedure for reading `LiveCommandResult` and live artifacts.
- **Archived Command Vocabulary**: Deleted route names that must not appear in active discovery.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Package schema and skill mirror match on public commands, inputs, result envelope fields, and forbidden live fields.
- **SC-002**: Guard tests prove archived commands and describe-style discovery are absent from active schema.
- **SC-003**: Recipes cover inline report, file-backed report, error report, exact rerun coordinate, next stage, repair hints, and live evidence handoff.
- **SC-004**: Text sweep across active docs, skill, schema, and tests finds no archived command route in public command contract.
- **SC-005**: Release or package-level verification fails if schema, docs, or skill mirror drift on command grammar.
