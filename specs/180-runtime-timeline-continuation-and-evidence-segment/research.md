# Research: Runtime Timeline Continuation And Evidence Segment

## Decision: Use Opaque Cursor Resume Certificate

Cursor is a public opaque token returned as `cursor.next` and accepted as `--cursor <token>`.

Rationale:

- Agent can copy the token without understanding watermark JSON.
- Runtime watermark remains the only ordering truth.
- Token encoding, signing and locator hints can change without changing public grammar.

Alternatives considered:

- Raw `--after-watermark <json>`: rejected because it exposes owner internals and creates more public grammar.
- Wall-clock flags: rejected because wall-clock time belongs to daemon index semantics, not Runtime ordering truth.

## Decision: Keep Ordinary Timeline Reads Lease-Free

`logix live timeline` and `logix live timeline --cursor` do not create retention lease.

Rationale:

- Prevents ordinary reads from becoming hidden background collectors.
- Preserves disabled-overhead and lazy capture proof.
- Keeps explicit retention tied to purpose, budget and redaction policy.

Alternatives considered:

- Implicit lease on first cursor read: rejected because it blurs read and retention behavior.
- Always-on daemon drain: rejected because it makes daemon health part of Runtime overhead.

## Decision: Store Retained Owner Segments In Daemon As Retention Artifacts

Daemon retained owner segment stores bounded owner refs, projections, digests, gaps and retention metadata.

Rationale:

- Provides continuity for evidence export, Workbench sessions and QA recording without keeping full Runtime head alive.
- Keeps daemon as retention owner, not timeline owner.
- Leaves final storage engine open.

Alternatives considered:

- Daemon-owned event timeline: rejected because it creates second ordering truth.
- Full state snapshot retention by default: rejected because it violates memory and privacy budget.
- Chrome extension storage: rejected because it fragments retention authority.

## Decision: Timeline Projection Owns Segmented Source Merge

Daemon returns source segments. Timeline projection owns merge and completeness.

Rationale:

- Preserves 177 timeline projection authority.
- Prevents daemon write time, request id or storage row id from becoming ordering signals.
- Makes partial and retention-gap cases explicit.

Alternatives considered:

- Daemon returns already merged timeline history: rejected because daemon would become timeline source selector and completeness owner.

## Decision: Defer Full Queue, QA, Source Chain And Semantic Memory

180 does not own full daemon queue/task history, QA recorder schema, source-chain index, SourceMap/AST index, local semantic memory or replay.

Rationale:

- Keeps 180 as minimal causal evidence core.
- Avoids making downstream consumers part of cursor continuation exit gates.
- Lets each future spec define its own authority, confidence, redaction and proof obligations.

Alternatives considered:

- Bundle all evidence platform work into 180: rejected during plan-optimality-loop as second-system risk.
