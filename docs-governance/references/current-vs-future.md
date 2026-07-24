# Current vs Future Classification

## Purpose

Keep current authority honest while preserving accepted targets, active proof, and long-horizon design.

## Six Classes

### Current Fact

A user, source path, schema, migration, adopted contract, command, or exercised test can rely on it today. Place it in the current layer that owns its meaning. A fixture alone does not prove product availability.

### Current Binding

An adopted constraint already governs present work even when the larger capability is incomplete. It may live in SSoT, ADR, Architecture, Standards, Protocols, Security, or another current authority layer with honest implementation status.

### Accepted Target

A reviewed and adopted outcome that delivery must satisfy, but current availability has not yet been proved.

Examples:

```text
an approved feature contract
an accepted migration target
an adopted security control pending rollout
an approved architecture seam not yet fully implemented
```

Accepted targets are binding for planning and delivery. They are not evidence of implementation, verification, release, or availability.

### Future Candidate

A hypothesis, complete future model, unadopted contract, quality target, or deployment shape that is not current authority and has not been accepted as a delivery target. Place durable candidates in Roadmap capability capsules; keep weak material in the repository's candidate method.

### Active Proof

A selected slice currently being implemented or validated. The repository's chosen tracker/spec/evidence method owns objective, progress, evidence, claim ceiling, and completion review. Roadmap and authority docs link to that owner rather than copying its status.

### Historical Evidence

Past delivery, audit, experiment, rejected design source, meeting source, or immutable proof record. Retain only when it has traceability, legal, release, security, or future reasoning value. Historical evidence is not current authority.

## Decision Test

Ask in order:

1. Can a user or code path rely on this today?
2. Does current implementation already have to obey it?
3. Has the outcome been accepted for delivery even though it is not yet proved?
4. Is it still only a future possibility or hypothesis?
5. Is it active work/evidence or past evidence?

When evidence is missing, lower the claim rather than promoting the prose.

## Mixed Documents

Mixed current and future material is acceptable only when the layer supports it, boundaries are explicit, and the mixed file remains the shortest coherent reading unit.

Allowed:

```text
Architecture: current topology + clearly labeled accepted seam.
ADR: accepted choice + implementation_status partial.
Product: stable north star + explicit not-current availability.
```

Split when future detail is large, uses a different reviewer, or creates a second authority chain.

## Evidence Discipline

Documentation alignment proves terminology, ownership, and accepted intent. Current availability requires code, schema, tests, runtime, release, or other owning evidence.
