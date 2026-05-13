# Research: Live Diagnosis Evidence Closure

## Decision: Live Remains An Evidence Lane, Not Verification Authority

**Rationale**: `15-cli-agent-first-control-plane.md` and `18-runtime-inspect-evidence-contract.md` keep live output as target discovery, inspect artifacts, operation facets, canonical evidence refs and gaps. Verification verdicts, repair hints and scheduling belong to `VerificationControlPlaneReport` after evidence is consumed.

**Alternatives considered**:

- Add verdicts to live output. Rejected because it creates a second control plane.
- Let daemon compute repair hints. Rejected because daemon is only a carrier.

## Decision: LiveCommandResult Must Stay Distinct From CommandResult

**Rationale**: Verification commands return `CommandResult` pointing to a primary verification report. Live commands return `LiveCommandResult` pointing to live artifacts or gaps. Keeping envelopes separate prevents Agents from treating live output as report truth.

**Alternatives considered**:

- Reuse `CommandResult` for live. Rejected because it invites `primaryReportOutputKey` and verdict fields.
- Add a polymorphic result envelope. Rejected because it weakens command-lane boundaries.

## Decision: Inspect Routes Must Return Owner-Backed Facts Or Structured Gaps

**Rationale**: Runtime inspect owners define fact authority. If a target, owner family, cursor, lease or artifact is unavailable, live output must return owner-coded gaps rather than carrier guesses.

**Alternatives considered**:

- Let CLI or daemon synthesize missing facts. Rejected because it turns carriers into fact owners.
- Return natural-language errors only. Rejected because Agents need machine-readable diagnosis.

## Decision: Canonical Evidence Export Is The Bridge Into Repair

**Rationale**: Live diagnosis becomes actionable repair only by exporting canonical evidence and running trial or compare. That keeps repair intent in verification reports while preserving live evidence provenance and redaction markers.

**Alternatives considered**:

- Let live export produce repair hints directly. Rejected because it bypasses verification authority.
- Pass daemon retained records directly into compare. Rejected unless packaged as canonical evidence.

## Decision: Disabled Cost Is A Closure Gate

**Rationale**: Live inspect can easily add always-on buffers or background collectors. SSoT 18 makes disabled-overhead, budget and cleanup part of owner law, not polish.

**Alternatives considered**:

- Treat disabled cost as a later performance task. Rejected because it can invalidate the runtime hot path.
- Allow always-on collector if bounded. Rejected unless owner law is reopened with proof.

## Decision: No New Contract File For 187

**Rationale**: Exact live artifact and evidence handoff shapes are already owned by `15` and `18`. 187 needs closure planning and proof obligations, not a duplicate schema.

**Alternatives considered**:

- Add `implementation-details/live-evidence-contract.md`. Rejected because it would duplicate SSoT 18 unless a concrete narrow wire ambiguity is discovered.
