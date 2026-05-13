# Timeline Continuation Wire Contract

This page freezes only narrow wire and lifecycle boundaries needed before implementation. Owner law remains in [spec.md](../spec.md).

## Cursor Token

Public CLI accepts only:

```text
--cursor <token>
```

The token is opaque. CLI help and examples must not instruct users to edit or construct raw watermark JSON.

Semantic payload behind the token must include:

- schema version
- target key
- optional attachment id
- normalized semantic query fingerprint
- Runtime resume watermark
- coverage end watermark
- completeness marker at token creation

Optional daemon locator hint is non-semantic.

It cannot affect:

- ordering
- comparison
- completeness
- mismatch decisions

## Query Fingerprint

Fingerprint fields:

- target key
- optional attachment id
- field filter
- projection schema version
- redaction policy digest
- projection mode

First projection modes:

- `timeline-default`
- `timeline-field-filtered`

Excluded fields:

- limit
- lease budget
- request byte budget
- daemon locator hint
- wall-clock time

## Retained Segment

Retained segment fields:

- segment id
- target coordinate
- attachment id
- start Runtime watermark
- end Runtime watermark
- owner event ids
- bounded owner event projections
- artifact refs
- digests
- gaps
- redaction markers
- degraded markers
- TTL
- size cap
- workspace partition
- lease provenance

Forbidden core fields:

- daemon ordering key
- daemon-computed completeness authority
- source-chain semantic index
- AST or SourceMap index
- work-session history
- QA replay steps
- verification verdict

## Source Segment

Allowed `sourceKind` values:

- `runtime-head`
- `daemon-retained-segment`

Required fields:

- target coordinate
- optional attachment id
- start watermark
- end watermark
- completeness
- gaps
- dropped markers
- degraded markers
- redaction markers
- retained segment ref when applicable

Timeline projection may merge only if target, attachment, query fingerprint and watermark chain are compatible.

## Safe Resume Boundary

A safe resume boundary is required when a continuation cannot be fully proven but a later resume point can be represented.

It must carry:

- target coordinate
- optional attachment id
- optional resume watermark
- owner-coded reason
- structured gaps

It must not convert partial history into a valid complete timeline.
