# Feature Specification: Entry And Declaration Authority Closure

**Feature Branch**: `184-entry-declaration-authority`  
**Created**: 2026-05-07  
**Status**: Implemented  
**Input**: User description: "Create terminal requirement for Entry And Declaration Authority Closure: close all CLI/runtime verification entry authority gaps for Agent self-verification, excluding trial scenario."

## Implementation Result

Implemented on 2026-05-07. CLI entry authority now accepts only `Program.make(...)` outputs with runtime blueprint authority; Module, Logic, fake Program, missing export, import failure and missing blueprint all produce deterministic machine-readable outcomes. Proof refs: `packages/logix-cli/test/Integration/program-entry.contract.test.ts`, `packages/logix-cli/test/Integration/command-result-transport.contract.test.ts`, `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`, `packages/logix-core/test/Contracts/ProgramImports.program-entry.test.ts`.

## Current Role

- This page is the Entry Declaration Lane for the terminal offline Agent self-verification family.
- `186-verification-loop-orchestration` owns the single terminal loop contract; this page owns only the Program entry and declaration authority prerequisites consumed by that loop.
- This page owns the boundary between CLI entry gates, runtime declaration authority, and control-plane report output.
- This page does not own `trial --mode scenario`; scenario execution is explicitly excluded from this requirement set.
- This page must be planned in the `184 -> 185 -> 186` order because entry and declaration failures must become repairable owner facts before the loop can close.

## Context

Agent self-verification already has a working `check / trial / compare` lane, but entry and declaration authority still has a terminal gap: CLI entry loading can reject obvious non-Program exports, while fake Program or missing blueprint pressure may surface later or less consistently than a terminal Agent loop needs.

The terminal design must make verification input authority unambiguous:

- CLI entry gates validate whether an entry is admissible verification input.
- Runtime check owns declaration-level static pressure.
- Startup trial owns runtime dependency, readiness, boot, and close pressure.
- Transport or entry failure must still return a machine-readable transport-gate envelope without pretending that a runtime stage has run.

## Scope

### In Scope

- Program-only CLI entry authority for `check`, `trial`, and optional `compare --entry`.
- Structured rejection for Module, Logic, fake Program, missing export, import failure, missing blueprint, and invalid declaration coordinate.
- Runtime declaration pressure for blueprint, imports, duplicate imports, declaration digest, source freshness, and static manifest pressure.
- Clear separation between `162` transport-gate entry failure and runtime control-plane findings.
- Report and artifact linkage needed by Agent self-verification.

### Out of Scope

- `trial --mode scenario` execution.
- Host deep verification, browser harness execution, or React render evidence.
- Automatic code patching.
- New public authoring API, new CLI root command, or root `Runtime.compare` facade.
- Compatibility with old Module/Logic entry behavior.

## Imported Authority

- [docs/ssot/runtime/01-public-api-spine.md](../../docs/ssot/runtime/01-public-api-spine.md)
- [docs/ssot/runtime/03-canonical-authoring.md](../../docs/ssot/runtime/03-canonical-authoring.md)
- [docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md](../../docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [specs/161-verification-pressure-kernel/spec.md](../161-verification-pressure-kernel/spec.md)
- [specs/162-cli-verification-transport/spec.md](../162-cli-verification-transport/spec.md)

## Closure & Guardrails

### Closure Contract

- `TP-ENTRY-01` is covered by runnable proof rather than marked partial.
- The lane is accepted by the 186 family closure only after entry transport failures are consumed by exact-rerun proof and declaration-stage failures are consumed by rerun plus compare proof.
- Every CLI verification entry either resolves to an admissible Program with runtime declaration authority or returns a structured pre-control-plane transport error artifact.
- Runtime declaration pressure is observable through `Runtime.check` without booting the Program.
- Startup-only dependency pressure stays in `Runtime.trial(mode="startup")`.
- Entry failures never set `nextRecommendedStage` to `check`, `trial`, or `compare` unless an owner-authorized runtime stage actually ran.
- Entry failures are `162` transport-gate failures: they may reuse the standard machine artifact envelope, but the primary artifact is not a `VerificationControlPlaneReport` and must not introduce `stage="entry"`, a fourth control-plane stage, runtime verdict, repair truth, or runtime findings when no runtime stage ran.

### Must Cut

- No Module or Logic fallback entry.
- No fake Program acceptance based only on public-looking fields.
- No import-time throw as the only machine-readable evidence.
- No natural-language-only entry diagnosis.
- No old IR toolbox route revival.
- No scenario execution bundled into this closure.

### Reopen Bar

Reopen only if a real Agent workflow needs a new entry authority that cannot be expressed as Program, derived source artifact, canonical evidence package, or selection manifest without breaking the public API spine.

## User Scenarios & Testing

### User Story 1 - Reject Bad Entry Deterministically (Priority: P1)

An Agent points CLI verification at an export that is not an admissible Program. The command must fail in a stable, machine-readable way that tells the Agent the entry itself is invalid.

**Why this priority**: If the entry is wrong, all later diagnostics become misleading.

**Independent Test**: Run CLI verification against Module, Logic, fake Program, missing export, and missing-blueprint fixtures and inspect only the machine report and input coordinate.

**Acceptance Scenarios**:

1. **Given** a Module or Logic export, **When** the Agent runs `check` or `trial`, **Then** the result is a structured entry failure with no runtime-stage `nextRecommendedStage`.
2. **Given** an object shaped like a Program but missing runtime authority, **When** the Agent runs `check`, **Then** the report identifies missing blueprint authority instead of treating the object as valid.
3. **Given** an entry import failure, **When** the Agent runs a verification command, **Then** the transport envelope preserves run id, command, entry coordinate, and an error report.

---

### User Story 2 - Check Declaration Without Booting (Priority: P1)

An Agent needs a cheap static gate before startup. `runtime.check` must identify declaration and assembly pressure without executing readiness effects or runtime boot.

**Why this priority**: This keeps the first Agent gate fast and prevents startup-only failure from being misclassified.

**Independent Test**: Run static check fixtures for blueprint, imports, duplicate imports, source freshness, and declaration digest pressure; prove no startup dependency finding is emitted for startup-only failures.

**Acceptance Scenarios**:

1. **Given** duplicate Program imports, **When** `check` runs, **Then** the report contains a static finding with stable owner coordinate.
2. **Given** a stale derived source artifact, **When** `check` runs, **Then** the report links the source artifact and declaration digest pressure.
3. **Given** a missing service used only during readiness, **When** `check` runs, **Then** the check report does not claim dependency failure.

---

### User Story 3 - Preserve Entry Coordinates For Repair (Priority: P2)

An Agent must be able to preserve and rerun the same entry input after repairing source or declaration issues.

**Why this priority**: The loop needs exact rerun stability after a repair.

**Independent Test**: Run failure and rerun fixtures and compare normalized input coordinate, report artifact keys, and entry refs.

**Acceptance Scenarios**:

1. **Given** a failing entry gate, **When** the Agent inspects the result, **Then** the original entry locator is preserved without inline source payload expansion.
2. **Given** a repaired Program entry, **When** the Agent reruns the same command shape, **Then** the runtime stage result replaces the previous entry failure.

### Edge Cases

- Entry module exists but export name is absent.
- Entry module imports browser globals under node host.
- Entry object has `_kind: "Program"` but lacks internal blueprint authority.
- Program imports include invalid entries or duplicates.
- Source artifact digest exists but does not match declaration digest.

## Requirements

### Functional Requirements

- **FR-001**: CLI verification commands MUST accept only admissible Program entries as runtime verification input.
- **FR-002**: CLI entry gate failures MUST return a machine-readable `162` transport-gate result envelope with a primary machine artifact.
- **FR-003**: Entry gate failures MUST keep `nextRecommendedStage` null unless a runtime stage owner actually ran and produced the recommendation.
- **FR-004**: Runtime check MUST expose missing blueprint, invalid import, duplicate import, declaration digest, and source freshness pressure as structured findings.
- **FR-005**: Runtime check MUST NOT execute startup, readiness, dependency resolution, React host evidence, or behavior scenarios.
- **FR-006**: Startup-only service, config, readiness, import dependency, boot, and close failures MUST remain trial startup pressure.
- **FR-007**: Every runtime declaration finding MUST include a stable owner coordinate or focus reference sufficient for Agent repair planning; pre-control-plane entry failures MUST preserve entry coordinate and transport error code instead of inventing runtime focus.
- **FR-008**: The report and CLI result MUST preserve entry input coordinate and artifact links without embedding raw source, AST, or internal blueprint payloads.
- **FR-009**: Optional `compare --entry` MUST apply the same Program entry authority gate before using the entry as provenance.
- **FR-010**: Archived command routes MUST remain rejected and MUST NOT be reintroduced for entry inspection.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Static entry and declaration checks MUST remain cheap enough for default Agent gate usage and MUST NOT boot runtime instances.
- **NFR-002**: Diagnostic output MUST be slim, serializable, deterministic, and stable across repeated runs with the same normalized input.
- **NFR-003**: Entry and declaration reports MUST avoid random or time-derived identifiers except in fields explicitly ignored by repeatability normalization.
- **NFR-004**: The closure MUST preserve forward-only evolution and MUST NOT keep compatibility aliases for old entry shapes.
- **NFR-005**: If public docs, CLI schema, or skill guidance mention entry behavior, they MUST be updated in the same change set as the implementation.

### Key Entities

- **Program Entry Coordinate**: The module path and export name selected by CLI input.
- **Admissible Program**: A Program export with runtime declaration authority.
- **Declaration Finding**: A static check result tied to blueprint, imports, source artifact, or declaration digest pressure.
- **Entry Gate Failure**: A `162` transport-gate failure that still uses the standard CLI machine result envelope without becoming a runtime stage.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of Module, Logic, fake Program, missing export, import failure, and missing blueprint fixtures produce deterministic machine-readable outcomes.
- **SC-002**: `TP-ENTRY-01` is documented as covered with runnable proof refs.
- **SC-003**: Repeated runs of the same entry failure produce stable command shape, artifact key set, error code, and stage scheduling outcome.
- **SC-004**: No check-stage proof requires booting a runtime instance.
- **SC-005**: Text sweep over CLI schema, docs, and tests shows no old entry fallback or archived command route in active public surfaces.
- **SC-006**: The 186 family closure consumes this lane by proving repaired admissible entries can exact-rerun into runtime stages, and declaration-pressure before/after reports can participate in compare closure.
