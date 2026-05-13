# Research: Repair Intent Contract

## Decision: VerificationControlPlaneReport Remains The Only Repair Report Authority

**Rationale**: Current reports already contain `findings`, `dependencyCauses`, `repairHints`, `artifacts`, `focusRef` and `nextRecommendedStage`. Tightening their join law preserves a single machine report authority and avoids a parallel repair taxonomy.

**Alternatives considered**:

- Add `RepairReport`. Rejected because it duplicates report truth and forces Agents to merge two schemas.
- Put repair intent in CLI transport fields. Rejected because `CommandResult` is only a stdout envelope.

## Decision: Repair Routing Must Not Depend On Prose Fields

**Rationale**: `summary`, `reason` and `suggestedAction` are useful for human explanation, but Agents need stable fields for repair target, owner coordinate, cause kind, stage and artifact refs. Prose parsing is brittle and violates Agent-first consumption.

**Alternatives considered**:

- Keep current prose as fallback routing. Rejected because it permits hidden schema drift.
- Generate patch suggestions as natural-language instructions. Rejected because automatic patching is out of scope.

## Decision: Top-Level nextRecommendedStage Is The Only Scheduling Authority

**Rationale**: Hints may explain local upgrade opportunities, but only the report owner can schedule the next stage. This keeps pass/fail/stage semantics centralized in `09-verification-control-plane.md`.

**Alternatives considered**:

- Let highest-priority hint determine next stage. Rejected because it makes scheduling depend on hint ordering.
- Let Agents choose between hint-local stages. Rejected because it turns the report into policy input instead of a control-plane result.

## Decision: Artifact Backlinks Must Be Referentially Valid

**Rationale**: `relatedArtifactOutputKeys` is the stable join from repair intent to captured reports, evidence packages, source artifacts or selection manifests. Invalid keys force Agents to parse prose or search artifact arrays heuristically.

**Alternatives considered**:

- Allow best-effort keys and ignore missing artifacts. Rejected because it breaks repeatability and file-backed artifact recovery.
- Inline evidence payloads into hints. Rejected because it violates slim payload and redaction constraints.

## Decision: Live Output Carries Evidence Only

**Rationale**: `18-runtime-inspect-evidence-contract.md` and `15-cli-agent-first-control-plane.md` keep live as evidence/gap output. Repair hints can be derived only after live material is exported into canonical evidence, a verification command consumes that evidence, and a verification report owns the repair hint.

**Alternatives considered**:

- Add `repairHints` to `LiveCommandResult`. Rejected because it creates a second control plane.
- Let daemon compute local repair hints. Rejected because daemon is a carrier, not a fact or report owner.

## Decision: 186 Is A Downstream Consumer, Not Imported Authority

**Rationale**: 185 must freeze repair intent join law before the terminal loop consumes it. Importing 186 as authority would create circular owner law between repair and orchestration.

**Alternatives considered**:

- Let 185 and 186 mutually import each other. Rejected because it creates a loop between repair owner facts and loop closure.
- Put loop closure success criteria in 185. Rejected because 186 owns the single terminal offline loop contract.

## Decision: No New Contract File For 185

**Rationale**: The exact report shape is already owned by runtime control-plane contracts. 185 freezes join and consumption obligations without duplicating the schema.

**Alternatives considered**:

- Add `implementation-details/repair-intent-contract.md`. Rejected unless implementation discovers a concrete wire ambiguity that existing SSoT cannot resolve.
