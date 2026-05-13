# Research: Entry And Declaration Authority Closure

## Decision: CLI Entry Gate Owns Program Admissibility Before Runtime Stage Execution

**Rationale**: `15-cli-agent-first-control-plane.md` fixes CLI entry authority as Program-only. Entry loading, missing export, Module/Logic rejection, fake Program rejection and import failure are pre-control-plane concerns. They must return machine-readable command results without pretending `runtime.check`, `runtime.trial` or `runtime.compare` ran.

**Alternatives considered**:

- Let runtime stage reject every bad entry. Rejected because import and export resolution can fail before a Program exists.
- Accept Module/Logic and assemble implicitly. Rejected because it reopens old authoring and CLI toolbox semantics.
- Throw process-level errors only. Rejected because Agents need a stable report artifact and input coordinate.

## Decision: Runtime Check Owns Static Declaration Pressure Without Boot

**Rationale**: `09-verification-control-plane.md` defines `runtime.check` as a cheap static gate. Missing blueprint, invalid import, duplicate import, declaration digest and source freshness pressure can be reported from declaration coordinates and derived artifacts. Startup-only dependency, readiness, boot and close failures belong to `trial --mode startup`.

**Alternatives considered**:

- Let `check` run startup to reuse dependency evidence. Rejected because it erases stage separation and makes the default gate expensive.
- Defer all declaration pressure to startup trial. Rejected because Agents lose the cheap repair loop for static defects.

## Decision: Entry Failure Uses Standard CLI Result And Artifact Linking

**Rationale**: Agents already consume `CommandResult`, `primaryReportOutputKey` and `artifacts[].outputKey`. Reusing that envelope keeps stdout parsing, artifact file fallback, and exact rerun logic stable. Entry failure material is a `162` transport error artifact, not a `VerificationControlPlaneReport`; it keeps `nextRecommendedStage` null and carries no stage verdict or repair truth.

**Alternatives considered**:

- Create a separate `EntryReport`. Rejected because it would form a second report taxonomy.
- Put entry failure only in `CommandResult.error`. Rejected because Agents need stable transport artifact refs; the transport error artifact still must not become machine report authority.

## Decision: Compare Entry Provenance Must Reuse The Same Program Gate

**Rationale**: If `compare --entry` is used as provenance, the entry must be admissible by the same Program authority as check/trial. This prevents compare from accepting fake or stale declaration coordinates that ordinary verification would reject.

**Alternatives considered**:

- Let compare trust before/after report refs only. Insufficient when entry provenance is explicitly supplied.
- Add compare-specific entry rules. Rejected because it fragments entry authority.

## Decision: No New Contract File For 184

**Rationale**: Exact shapes already belong to `CommandResult`, `VerificationControlPlaneReport`, Program declaration authority and `commands.v1.json`. 184 needs owner/boundary/proof planning, not a new wire protocol.

**Alternatives considered**:

- Add `implementation-details/entry-contract.md`. Rejected because it would duplicate existing schema/report truth and risk drift.
