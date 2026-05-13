# Feature Spec: Runtime Timeline Continuation And Evidence Segment

**Feature Branch**: `180-runtime-timeline-continuation-and-evidence-segment`
**Created**: 2026-05-05
**Status**: Implemented

## Role

180 promotes the converged `Minimal Causal Evidence Core` from [Runtime Causal Evidence Spool And Timeline Query Contract](../../docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md).

It owns timeline continuation, explicit evidence lease, daemon retained owner segments, opaque cursor grammar and segmented timeline source law.

180 is not a new Runtime evidence owner. Runtime-live remains the owner of causal truth, ordering, watermarks, stateAfter source refs and target lifecycle cleanup. Daemon owns retention only. Timeline projection owns merge, output shape and completeness. CLI owns command spelling and cursor input grammar. Canonical evidence owns export envelope only.

## Imported Authority

- Owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- CLI grammar and transport envelope: [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- Runtime-live ledger foundation: [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- Field-runtime inspect foundation: [../176-field-runtime-inspect-model/spec.md](../176-field-runtime-inspect-model/spec.md)
- Timeline projection foundation: [../177-runtime-inspect-timeline-projection/spec.md](../177-runtime-inspect-timeline-projection/spec.md)
- Summary and event source precedents: [../178-runtime-summary-projection/spec.md](../178-runtime-summary-projection/spec.md), [../179-debug-event-source-bridge/spec.md](../179-debug-event-source-bridge/spec.md)
- Review ledger: [../../docs/review-plan/runs/2026-05-04-runtime-causal-evidence-spool-and-timeline-query.md](../../docs/review-plan/runs/2026-05-04-runtime-causal-evidence-spool-and-timeline-query.md)
- Source proposal: [../../docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md](../../docs/proposals/runtime-causal-evidence-spool-and-timeline-query-contract.md)

## Target

`logix live timeline --target <target> [--attachment <attachmentId>] [--field <path>] [--limit <n>] [--cursor <token>]` must support same-query continuation over Runtime-owned causal watermarks without turning daemon into a timeline owner.

180 must provide:

- public `--cursor <token>` grammar for timeline continuation
- opaque resume cursor law
- same-query continuation law
- explicit evidence lease law
- daemon retained owner segment core
- segmented timeline source law
- coverage, completeness and safe resume boundary law
- minimal retained-segment backpressure law
- SSoT 18, SSoT 15 and 177 writeback

## Current Baseline That Must Yield

177 intentionally preserved v1 timeline CLI grammar and did not expose cursor. That rule remains correct for 177, but 180 supersedes it for timeline continuation only.

`LiveOperationWindowRequest` already supports `cursor?: LiveLedgerWatermark`, and the browser adapter can pass cursor payloads through to operation window reads. This internal capability is not yet a public CLI contract and does not define daemon retained segment semantics.

Daemon currently acts as carrier for live inspect requests and evidence export. It does not retain owner segments with a lease, coverage, TTL, size cap or segmented source law.

`logix live timeline --limit <n>` remains a latest-window read. It cannot express “continue from this owner watermark” or distinguish complete continuation from retention gaps.

## Scope

### In Scope

- Timeline cursor grammar and machine-output continuation contract.
- Cursor token mismatch, expiry, retention gap and incomparable watermark behavior.
- Evidence lease purpose, budget, redaction and retention boundary.
- Daemon retained owner segment as a retention artifact over Runtime-owned facts.
- Segmented source output over `runtime-head` and `daemon-retained-segment`.
- Timeline projection merge/completeness rules over source segments.
- Minimal lease drain backpressure needed to keep retained segment writes bounded.
- Canonical evidence export of retained segment refs without becoming timeline truth.

### Out Of Scope

- Full daemon queue and task history UI.
- Chrome extension as mandatory UI or storage authority.
- QA recorder schema.
- Source-chain, source-map, loaded-module or AST derived index.
- Local semantic memory.
- Final SQLite schema.
- Replay engine.
- React host evidence owner or local profiler owner promotion.
- Any verification verdict, repair hint or `runtime.check` / `runtime.trial` authority.

## Runtime Bounded Head Law

Runtime head remains the only live causal truth source.

It contains:

- target-scoped bounded window store
- owner event envelope, target coordinate, order key, watermark and `txnSeq / opSeq / linkId`
- stateAfter source ref or owner-coded gap
- payload refs or bounded summaries
- dropped, degraded, redaction and structured gap markers

It must obey:

- disabled live inspect does not allocate ledger buffer, timeline payload, spool payload or background drain
- transaction windows contain no IO and no daemon wait
- stateAfter stays behind refs or bounded summaries
- overflow emits dropped marker and never presents partial history as complete
- cleanup follows target lifecycle

## Evidence Lease Law

Evidence lease is the only way daemon may retain Runtime owner facts beyond request delivery.

A lease binds:

- workspace
- attachment
- target
- purpose
- budget
- redaction policy
- retention policy
- consumer identity

Allowed lease purposes:

- `export-evidence`
- `workbench-session`
- `qa-recording`
- `maintenance-debug`

Ordinary `logix live timeline` and `logix live timeline --cursor` do not create retention lease. They may read Runtime head and already retained owner segments. They may not silently turn a read command into ongoing background retention.

Lease drain may copy only:

- owner watermark and event id
- target coordinate and attachment id
- bounded event envelope projection
- artifact refs, payload digest and source refs
- structured gap, dropped, degraded and redaction markers
- retention metadata

Lease drain may not copy:

- unbounded state snapshots
- raw field graph or raw field program
- runtime handles
- React render payload as Runtime truth
- profiler samples before profile owner promotion
- verification verdict
- private source content without explicit digest and redaction policy

## Daemon Retained Owner Segment

Daemon retained owner segment is a retention artifact over Runtime-owned facts.

It can store:

- segment id
- target coordinate and attachment id
- start and end Runtime watermark
- owner event ids
- bounded owner event projections
- artifact refs, digests and gaps
- redaction and degraded markers
- TTL, size cap, workspace partition and lease provenance

It cannot store as core truth:

- daemon ordering
- daemon-computed timeline completeness
- source-map, AST, loaded-module or route semantic index
- work-session task history
- QA replay steps

Derived indexes may point at retained owner segments, but they must carry their own authority tag and confidence. They cannot rewrite Runtime watermark order or timeline completeness.

Storage engine choice is not part of 180. SQLite is an allowed daemon-side implementation candidate only if it preserves retained owner segment shape, budget, redaction, lifecycle and query semantics.

Chrome extension and Workbench panel may consume daemon query APIs. They must not own storage authority.

## Timeline Query Intent Law

Public CLI grammar upgrades by exactly one flag:

```text
logix live timeline --target <target> [--attachment <attachmentId>] [--field <path>] [--limit <n>] [--cursor <token>]
```

Query intent is fixed:

- no cursor means latest live-head window for the target query
- cursor means same-query continuation after the cursor resume watermark

Daemon may choose physical read source:

- Runtime head
- daemon retained owner segment
- both, only if the segment chain is comparable and continuous

Daemon may not change query intent. It may not decide a continuation query should become latest head, or a latest head query should become retained history. If requested continuation cannot be proven, output must contain a structured gap and safe resume boundary.

Attachment remains part of the query. If multiple attachments can match and no attachment is supplied, the command follows existing ambiguity law. Cursor token must bind attachment when an attachment is known. Target or attachment mismatch returns a structured gap.

## Cursor Resume Certificate Law

`--cursor <token>` is an opaque resume certificate.

Public CLI does not accept raw watermark JSON as a peer grammar. Agent copies `cursor.next` back as an opaque token.

The semantic core of the token is:

- cursor schema version
- target key
- optional attachment id
- normalized semantic query fingerprint
- Runtime resume watermark
- coverage end watermark
- completeness marker at token creation

The token may include an optional daemon locator hint. Locator hints are disposable. They never participate in ordering, comparison, completeness or mismatch decisions.

Normalized semantic query fingerprint includes:

- target key
- optional attachment id
- field filter
- projection schema version
- redaction policy digest
- projection mode

Projection mode is a finite owner-coded value for timeline projection semantics. The first allowed values are:

- `timeline-default`
- `timeline-field-filtered`

`limit` is not part of the semantic fingerprint. It only caps page size for one request. Lease budget and request byte budget also do not enter cursor identity unless a future projection mode changes item semantics. Raising `limit` may still hit budget caps, but it does not change continuation identity. Changing redaction policy or projection mode creates a different query fingerprint and must return mismatch gap.

Cursor failure cases:

- target mismatch
- attachment mismatch
- query fingerprint mismatch
- watermark incomparable
- cursor expired
- retained segment missing
- retention gap between requested cursor and available source
- source segment chain partial or over budget

All failure cases return owner-coded structured gap and, when possible, a new safe resume boundary.

## Segmented Timeline Source Law

Daemon does not own timeline merge.

Daemon returns source segments:

- `runtime-head`
- `daemon-retained-segment`

Each segment carries:

- source kind
- target coordinate and attachment id
- start watermark
- end watermark
- completeness
- gaps
- dropped, degraded and redaction markers
- retained segment ref when applicable

Timeline projection may merge segments only when:

- target and attachment match
- query fingerprint matches
- watermarks are comparable
- segment chain is continuous
- each required segment is complete or explicitly degraded

If a chain is not continuous, projection returns partial output with a structured gap. It must not sort by daemon write time, wall clock, SQLite row id, request id or locator hint.

Output must expose:

- `sourceSegments`
- owner `watermarkRange`
- `coverageStart`
- `coverageEnd`
- `completeness`
- gaps and safe resume boundary

This keeps storage topology hidden as a knob while keeping evidence topology visible as machine-readable proof.

## Minimal Backpressure Law

180 only owns the backpressure needed to keep retained owner segment writes bounded.

Minimum requirements:

- lease drain queue is bounded per workspace and target
- queued windows are refs or bounded projections, not unbounded operation windows
- full queue drops or degrades with carrier gap
- dropped drain does not block Runtime
- retained segment write failure emits degraded marker and does not fabricate completion

Full request coalescing, task history, Agent task console and carrier fairness belong to a later carrier-hardening spec.

## User Scenarios & Testing

### User Story 1 - Continue A Live Timeline (Priority: P1)

As an Agent debugging a live target, I can request the latest timeline, keep `cursor.next`, trigger more activity, and request the same-query continuation without rereading already consumed complete events.

**Independent Test**: Read a target timeline, record the returned cursor, append new ledger events, then read with that cursor and verify output starts after the cursor watermark or returns an owner-coded gap when continuation cannot be proven.

### User Story 2 - Preserve Runtime Hot Path Isolation (Priority: P1)

As a Runtime maintainer, I can enable timeline continuation without making transaction windows perform daemon IO or wait for daemon retention.

**Independent Test**: Run live timeline reads with and without cursor while asserting transaction windows contain no daemon wait and disabled live inspect allocates no spool payload, cursor payload or background drain.

### User Story 3 - Retain Evidence Through Explicit Lease (Priority: P2)

As a Workbench, evidence export or QA recording consumer, I can open an explicit lease with purpose, budget, redaction and retention policy so daemon retains owner segments without becoming Runtime truth.

**Independent Test**: Open a lease for an allowed purpose, drain owner events into retained segments, then verify segment refs preserve Runtime watermarks, TTL, size cap, redaction markers and lease provenance.

### User Story 4 - Merge Only Comparable Segments (Priority: P2)

As a timeline consumer, I can tell whether output came from Runtime head, daemon-retained segment or a continuous chain of both, and I receive gaps instead of fabricated completeness when the chain is not comparable.

**Independent Test**: Provide one continuous source segment chain and one chain with a retention gap, then verify only the continuous chain merges and the broken chain returns partial output with structured gaps and safe resume boundary.

## Functional Requirements

- **FR-001**: The system MUST add `--cursor <token>` as the only first public CLI grammar upgrade for `logix live timeline`.
- **FR-002**: The system MUST return an opaque `cursor.next` resume certificate from timeline output when continuation can be represented.
- **FR-003**: Cursor semantics MUST be based only on Runtime watermark, target, optional attachment, query fingerprint, coverage and completeness.
- **FR-004**: Cursor locator hints MUST NOT participate in ordering, comparison, completeness or mismatch decisions.
- **FR-005**: Timeline continuation MUST preserve same-query semantics; no cursor reads latest live-head window, cursor reads continuation after the cursor watermark.
- **FR-006**: Target, attachment, query fingerprint, expiry, retention gap and incomparable watermark failures MUST return owner-coded structured gaps.
- **FR-007**: Ordinary `logix live timeline` and `logix live timeline --cursor` MUST NOT create retention leases.
- **FR-008**: Evidence lease MUST require purpose, budget, redaction policy, retention policy and consumer identity.
- **FR-009**: Daemon retained owner segment MUST store only bounded Runtime-owned refs, projections, digests, gaps, redaction/degraded markers and retention metadata.
- **FR-010**: Daemon retained owner segment MUST NOT own ordering, timeline completeness, source-chain semantics, work-session history, QA replay steps or verification verdicts.
- **FR-011**: Timeline projection MUST own merge and completeness over source segments.
- **FR-012**: Daemon source segments MUST NOT be merged unless target, attachment, query fingerprint and watermark chain are compatible.
- **FR-013**: Incomplete or discontinuous segment chains MUST return partial output with structured gaps and safe resume boundary.
- **FR-014**: Minimal lease drain backpressure MUST be bounded and MUST NOT block Runtime progress.
- **FR-015**: Canonical evidence export MUST package retained segment refs and owner facts without becoming timeline truth.
- **FR-016**: Public wall-clock timeline flags such as `--since`, `--until`, `--before`, `--after` and raw `--after-watermark` MUST NOT be added in 180.
- **FR-017**: 177's no-new-grammar rule MUST be updated to note that 180 supersedes it only for timeline cursor continuation.

## Non-Functional Requirements

- **NFR-001**: Disabled live inspect MUST allocate no spool payloads, cursor payloads or background drain.
- **NFR-002**: Transaction windows MUST contain no IO and no daemon wait.
- **NFR-003**: Runtime head overflow MUST emit dropped or degraded markers and never present partial history as complete.
- **NFR-004**: Retained segment writes MUST obey TTL, size cap, redaction and workspace partition.
- **NFR-005**: Cursor token roundtrip MUST be deterministic for target-scoped Runtime watermark semantics.
- **NFR-006**: Cursor mismatch, expiry, retention gap and incomparable watermark behavior MUST be stable and machine-readable.
- **NFR-007**: Segment merge MUST not use daemon write time, wall clock, SQLite row id, request id or locator hint as ordering input.
- **NFR-008**: Carrier queues and retained responses MUST remain bounded and lifecycle-cleaned.
- **NFR-009**: Live timeline output MUST avoid verification verdict fields, repair hints, raw runtime handles, raw field graph/program data, React render payloads and profile samples.
- **NFR-010**: SSoT writeback MUST preserve `source segment chain` wording for 180 proof gates and finite `projection mode` wording for cursor fingerprint.

## Key Entities

- **TimelineCursorResumeCertificate**: Opaque CLI token that carries a target-scoped Runtime watermark, query fingerprint, coverage and completeness.
- **TimelineQueryFingerprint**: Stable same-query identity over target, optional attachment, field filter, projection schema, redaction policy digest and projection mode.
- **EvidenceLease**: Explicit retention permission that binds purpose, budget, redaction, retention and consumer identity.
- **DaemonRetainedOwnerSegment**: Daemon retention artifact over Runtime-owned facts.
- **TimelineSourceSegment**: Runtime-head or daemon-retained segment with watermark range, completeness, gaps and retained segment ref.
- **SafeResumeBoundary**: Output marker that tells Agent where continuation can safely resume after partial, expired or gapful reads.

## Success Criteria

- **SC-001**: Agent can use `cursor.next` to read same-query continuation after a complete timeline window without duplicate events.
- **SC-002**: Cursor mismatch, expired cursor, missing retained segment, retention gap and incomparable watermark each produce stable structured gaps.
- **SC-003**: Ordinary timeline reads do not create retained owner segments or background drain.
- **SC-004**: Explicit evidence lease creates bounded retained owner segments with owner watermarks, TTL, size cap, redaction and lease provenance.
- **SC-005**: Daemon-retained segments cannot become timeline ordering or completeness truth.
- **SC-006**: A continuous `runtime-head` plus `daemon-retained-segment` source chain can be projected; a discontinuous chain produces partial output with gaps.
- **SC-007**: Canonical evidence export carries retained segment refs and owner facts without verification verdicts or synthesized Runtime facts.
- **SC-008**: SSoT 18, SSoT 15 and 177 are updated to point to 180 for cursor continuation semantics.

## Rejected Alternatives

- Always push every Runtime event to daemon.
- Make daemon the timeline owner.
- Bundle queue, QA, source-chain and semantic memory into 180.
- Add wall-clock query flags before cursor.
- Store full state snapshots by default.
- Put persistent storage in Chrome extension.
- Expose raw watermark JSON as public CLI grammar.

## Deferred To Future Specs

- Full daemon queue and task console.
- QA evidence recording package.
- Source-chain and SourceMap/AST derived index.
- Local semantic memory.
- Replay engine.
- Final daemon storage schema.

## Reopen Rules

Reopen 180 if:

- Cursor continuation cannot be represented without exposing raw watermark JSON as public grammar.
- Daemon retained segments require daemon ordering or daemon-computed completeness to function.
- Ordinary timeline reads must create retention leases.
- Segment merge cannot preserve 175 Runtime watermark authority.
- Retained segment proof requires full state snapshots by default.
- Source-chain, QA recorder or local semantic memory must become part of 180 exit gates.
