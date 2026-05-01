# Research: CLI Verification Transport

## Decision 1: `CommandResult` remains transport-only

**Decision**: `CommandResult` continues to be the stdout envelope and must point to the primary `VerificationControlPlaneReport` artifact.

**Rationale**: Agent needs one machine truth. CLI can make routing and artifact consumption deterministic, but report verdict and repair semantics must stay in core.

**Alternatives considered**:

- Add CLI report shape: rejected because it creates second report truth.
- Put all machine fields directly in stdout: rejected because stdout budget and truncation become truth-affecting.

## Decision 2: Exact rerun is carried by `inputCoordinate`

**Decision**: `inputCoordinate` must capture command, Program entry, relevant refs, mode and compare refs needed to rerun or upgrade stage.

**Rationale**: Repair closure needs before and after reports to be generated from comparable inputs.

**Alternatives considered**:

- Rely on shell history: rejected because Agent and CI cannot depend on interactive history.
- Inline every input payload: rejected because large and sensitive inputs need artifact refs or digests.

## Decision 3: Artifact key namespace is `artifacts[].outputKey`

**Decision**: CLI, report, repair hints and DVTools selection manifest must link through `artifacts[].outputKey`.

**Rationale**: One key namespace avoids broken roundtrips and avoids second artifact identity.

**Alternatives considered**:

- Let selection manifest define its own key namespace: rejected because CLI would need translation truth.
- Use file paths as keys: rejected because paths are environment-dependent.

## Decision 4: Pre-control-plane failure stops at transport gate

**Decision**: Entry, argument, evidence and selection errors must not become runtime stages or `nextRecommendedStage`.

**Rationale**: These failures happen before core control-plane execution. Treating them as stage failures would confuse Agent scheduling.

**Alternatives considered**:

- Map all CLI errors to check/trial/compare stages: rejected because it creates false runtime evidence.
- Add a fourth transport stage: rejected because canonical stage vocabulary belongs to runtime control plane.

## Decision 5: DVTools selection remains hint-only

**Decision**: CLI consumes canonical evidence package and optional selection manifest; the selection manifest remains hint-only.

**Rationale**: DVTools should help Agent enter the evidence, not rewrite evidence truth or report truth.

**Alternatives considered**:

- Let CLI consume DVTools-specific protocol: rejected because canonical evidence package already exists.
- Let selection manifest override evidence package artifacts: rejected because it creates a second evidence envelope.

## Decision 6: Compare routes to core truth

**Decision**: `logix compare` reads before/after report refs and admissible evidence refs, then delegates comparison to core.

**Rationale**: Compare admissibility and verdict truth belong to `@logixjs/core/ControlPlane`.

**Alternatives considered**:

- Implement compare in CLI for convenience: rejected because it would drift from core.
- Require Agent to compare reports manually: rejected because closure would leave Logix control plane.
