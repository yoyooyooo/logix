# Feature Specification: Repair Intent Contract

**Feature Branch**: `185-repair-intent-contract`  
**Created**: 2026-05-07  
**Status**: Implemented  
**Input**: User description: "Create terminal requirement for Repair Intent Contract: make verification reports machine-actionable for Agent repair without creating an automatic patch engine or second policy runtime."

## Implementation Result

Implemented on 2026-05-07. Repair intent is consumed through structured `repairHints`, `findings`, `dependencyCauses`, artifact output keys and top-level `nextRecommendedStage`; live output remains outside repair authority. Proof refs: `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts`, `packages/logix-cli/test/Integration/trial-dependency-spine.contract.test.ts`, `packages/logix-cli/test/Integration/evidence-selection-input.contract.test.ts`, `packages/logix-cli/test/Integration/evidence-selection-roundtrip.contract.test.ts`, `packages/logix-core/test/Contracts/VerificationControlPlaneCompare.contract.test.ts`, `packages/logix-cli/test/Integration/live-command-result.contract.test.ts`.

## Current Role

- This page is the Repair Intent Lane for the terminal offline Agent self-verification family.
- `186-verification-loop-orchestration` owns the single terminal loop contract; this page owns only the repair intent prerequisites consumed by that loop.
- This page owns the contract that lets an Agent move from a failing `VerificationControlPlaneReport` to a precise repair target.
- This page does not own automatic patch generation, model policy, or scenario execution.

## Context

Current reports already expose `findings`, `dependencyCauses`, `repairHints`, `artifacts`, `focusRef`, and `nextRecommendedStage`. The remaining terminal gap is that some repair intent is still too dependent on free text or consumer-specific interpretation.

The terminal contract must make the report repairable by structure:

- `nextRecommendedStage` schedules the next stage.
- `repairHints` explain actionable repair intent.
- `findings`, `dependencyCauses`, and `artifacts` carry owner facts.
- Natural-language `summary`, `reason`, and `suggestedAction` are explanatory only.

## Scope

### In Scope

- Machine-readable repair hint core for check, trial startup, compare, and canonical evidence handoff failures.
- Stable join law between `repairHints`, `findings`, `dependencyCauses`, and `artifacts`.
- Stable owner coordinate vocabulary sufficient for Agent repair planning.
- Validation that hint-local `upgradeToStage` never overrides top-level `nextRecommendedStage`.
- Canonical evidence and selection artifact back-links when verification reports consume them as refs.
- Live boundary guard proving live output carries no repair authority; live is not a positive repair lane in this spec.

### Out of Scope

- Automatic patch engine or writeback runtime.
- Ranking multiple patch candidates.
- Agent memory, task policy, or autonomous loop state.
- `trial --mode scenario` repair semantics.
- Scenario step or scenario plan repair proof for the current offline loop family.
- Entry gate repair routing; 184 owns entry owner facts and 186 consumes them in loop closure.
- New report object or second verification lane.

## Imported Authority

- [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md)
- [docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- [docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md](../../docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md)
- [docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- [specs/161-verification-pressure-kernel/spec.md](../161-verification-pressure-kernel/spec.md)
- [specs/162-cli-verification-transport/spec.md](../162-cli-verification-transport/spec.md)
- [specs/184-entry-declaration-authority/spec.md](../184-entry-declaration-authority/spec.md)

Downstream consumer:

- [specs/186-verification-loop-orchestration/spec.md](../186-verification-loop-orchestration/spec.md)

## Closure & Guardrails

### Closure Contract

- Every supported verification failure family has a machine-readable repair intent path.
- The lane is accepted by the 186 family closure only after repair hints can drive exact rerun for their report family and before/after compare closure where a repair-closure claim is made.
- A consumer can identify repair target, owner coordinate, stage, cause kind, and relevant artifact refs without parsing prose.
- `repairHints[].relatedArtifactOutputKeys` only references real `artifacts[].outputKey` values.
- Canonical evidence contributes to repair only after entering a verification report as an artifact-backed ref.
- Live command output remains a boundary guard and never contributes repair truth directly.

### Must Cut

- No natural-language-only repair contract.
- No auto patch or writeback public surface.
- No `logix live` repair hints or verdict authority.
- No second `RepairReport`, `AgentPolicyReport`, or report taxonomy.
- No domain payload expansion inside `focusRef`.

### Reopen Bar

Reopen only if a supported failure class cannot be repaired by stable owner coordinate, artifact output key, dependency cause, or selection/evidence reference and would otherwise force Agents to parse prose.

## User Scenarios & Testing

### User Story 1 - Localize A Dependency Repair (Priority: P1)

An Agent sees a startup failure caused by missing service, config, or imported Program. The report must state what is missing, who owns it, where to provide it, and which stage to rerun.

**Why this priority**: Dependency failures are common and directly block startup self-verification.

**Independent Test**: Run missing service, missing config, missing import, and child dependency fixtures and consume only structured report fields.

**Acceptance Scenarios**:

1. **Given** a missing service, **When** trial startup fails, **Then** repair intent identifies service, phase, provider source, owner coordinate, focus ref, and next stage.
2. **Given** a missing imported Program, **When** trial startup fails, **Then** repair intent points to `Program.capabilities.imports` and child identity.

---

### User Story 2 - Repair Static Declaration Pressure (Priority: P1)

An Agent sees a static check failure for declaration, imports, blueprint, or source freshness. The report must identify the declaration owner slice without booting runtime.

**Why this priority**: Static failures should be cheaper to repair than runtime startup failures.

**Independent Test**: Run static pressure fixtures and assert repair hints join to findings and source artifacts.

**Acceptance Scenarios**:

1. **Given** duplicate imports, **When** check fails, **Then** a repair hint points to the Program imports owner coordinate.
2. **Given** stale derived source, **When** check fails, **Then** a repair hint links source ref and declaration digest artifact.

---

### User Story 3 - Preserve Canonical Artifact Backlinks (Priority: P2)

An Agent includes canonical evidence or selection input in a verification run. Any repair hint derived from that material must retain stable artifact links.

**Why this priority**: Runtime diagnosis depends on tracing repair intent back to admissible evidence refs without letting live output become repair truth.

**Independent Test**: Run canonical evidence and DVTools selection handoff fixtures and inspect `relatedArtifactOutputKeys`.

**Acceptance Scenarios**:

1. **Given** canonical evidence, **When** trial report produces repair hints, **Then** at least one relevant hint links the evidence input artifact.
2. **Given** a selection manifest, **When** the report projects a focus target, **Then** selection remains hint-only and does not become report truth.
3. **Given** live command output, **When** it is inspected directly, **Then** it contains no repair hints, verdict, or next-stage scheduling.

### Edge Cases

- Multiple hints propose different local upgrade stages.
- A failure has no stable focus coordinate yet.
- Evidence is present but not admissible for the stage.
- A hint references an artifact removed by output budget truncation.
- Compare is inconclusive because before/after inputs are not admissible.

## Requirements

### Functional Requirements

- **FR-001**: Reports MUST expose repair intent as structured fields, not only summary text.
- **FR-002**: Every repair hint MUST include stable code, retry capability, local stage explanation, and focus reference or explicit null.
- **FR-003**: Every localized repair hint MUST be joinable to an owner fact from findings, dependency causes, artifacts, or admissibility details.
- **FR-004**: Dependency repairs MUST include cause kind, phase, provider source, owner coordinate, and child identity when applicable.
- **FR-005**: Static declaration repairs MUST include declaration owner coordinate and source artifact reference when source freshness is involved.
- **FR-006**: Compare repairs MUST distinguish closed repair, regression, mismatch, and inconclusive admissibility.
- **FR-007**: `summary`, `reason`, and `suggestedAction` MUST be optional explanatory fields and MUST NOT be required for machine repair routing.
- **FR-008**: Hint-local `upgradeToStage` MUST NOT override top-level `nextRecommendedStage`.
- **FR-009**: Live command output MUST NOT contain repair hints; material from live commands can influence repair only after being exported as canonical evidence and consumed by verification.
- **FR-010**: Report validation MUST reject repair hint artifact refs that do not point to real report artifacts.

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: Repair intent materialization MUST be deterministic across equivalent verification inputs.
- **NFR-002**: Repair intent payloads MUST remain slim and serializable.
- **NFR-003**: Repair intent MUST not leak raw source, AST, runtime handles, raw field graph, or domain payloads.
- **NFR-004**: When a failure cannot be localized, the report MUST explicitly mark the focus as unavailable instead of inventing a coordinate.
- **NFR-005**: Documentation and skill guidance MUST identify the machine fields Agents should consume and the prose fields Agents should not parse.

### Key Entities

- **Repair Hint**: A structured suggestion owned by the verification report.
- **Owner Fact**: A finding, dependency cause, admissibility detail, or artifact ref that carries source authority.
- **Focus Reference**: A stable coordinate pointing at declaration slice, reason slot, or source ref in this offline family; scenario step remains future-only.
- **Repair Intent Path**: The machine-readable route from report verdict to next repair target.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Supported static, dependency, canonical evidence, and compare failure fixtures can be routed to a repair target without reading prose fields.
- **SC-002**: 100% of `relatedArtifactOutputKeys` in verification reports point to existing artifact output keys.
- **SC-003**: Tests prove top-level `nextRecommendedStage` remains the only scheduling authority.
- **SC-004**: Live command result schema continues to forbid `repairHints`, `nextRecommendedStage`, and `verdict`.
- **SC-005**: Agent-facing docs or skills include a stable field consumption recipe for repair intent.
- **SC-006**: The 186 family closure consumes this lane by proving repair hints can drive exact rerun or compare closure without parsing prose.
