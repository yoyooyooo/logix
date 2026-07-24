# Source-Code Alignment

Current documentation and implementation evidence must be checked in both directions.

## Docs to Source

For each current implementation claim, identify the owning evidence surface:

```text
source symbol or module
schema or migration
contract or generated artifact
command/query/runtime path
test or replay fixture
release or operational evidence
```

When the anchor is missing, choose one honest action:

- repair the anchor;
- lower the claim to `accepted-target`;
- move it to `future-candidate`;
- mark it historical;
- delete stale duplicate prose.

## Source to Docs

Scan current public or shared implementation surfaces for objects, states, commands, contracts, security boundaries, or topology that lack a documentation owner.

Code existence does not automatically create product authority. Route each discovered fact to the correct layer or report it as undocumented current behavior.

## Question Boundary

```text
source evidence answers: what exists now
accepted product/requirement authority answers: what delivery must satisfy
SSoT answers: what shared concepts and invariants mean
ADR answers: why a technical choice was accepted
Roadmap answers: what sequence or gate comes later
```

A mismatch becomes one of:

```text
documentation drift
implementation gap
unaccepted implementation
obsolete source path
missing authority owner
```

Do not silently rewrite accepted intent from inherited code. Record the gap and resolve it through the owning decision path.

## Anchors

Prefer stable repository-relative paths and symbol names. Avoid line-number-only anchors. Label examples, generated paths, and future paths so the anchor scanner does not treat them as current evidence.

## Evidence Claims

A documentation audit may prove that anchors exist. It does not prove runtime correctness, test coverage, production deployment, security effectiveness, or migration success.
