---
title: Runtime Causal Evidence Spool And Timeline Query Contract
status: consumed
owner: runtime-control-plane
target-candidates:
  - docs/ssot/runtime/18-runtime-inspect-evidence-contract.md
  - docs/ssot/runtime/15-cli-agent-first-control-plane.md
  - specs/175-runtime-live-operation-ledger/spec.md
  - specs/177-runtime-inspect-timeline-projection/spec.md
last-updated: 2026-05-04
---

# Runtime Causal Evidence Spool And Timeline Query Contract

## Purpose

本提案冻结 live timeline、运行时事件、daemon retention 和 CLI cursor 查询的终局候选。

它不把 QA recorder、source-chain、local semantic memory 或完整 daemon task console 放进第一份实施合同。它只收口最小因果证据核心：

```text
Runtime bounded causal head
  -> explicit evidence lease
    -> daemon retained owner segment
      -> timeline continuation projection
        -> CLI / Workbench / QA recorder / future browser extension
```

目标是让 Agent 可以按 watermark 续读 live timeline，同时不让 Runtime 热路径等待 daemon、不让 daemon 变成 Runtime fact owner、不让 cursor token 变成第二 ordering truth。

## Target Claim

Adopted candidate 是 `Minimal Causal Evidence Core`。

终局边界固定为：

- Runtime owns truth.
- Daemon owns retention.
- Timeline projection owns merge, output shape and completeness.
- CLI owns command spelling and cursor input grammar.
- Canonical evidence owns export envelope only.

Runtime 不默认把所有事件实时推给 daemon。Runtime 只在 live inspect 或 owner-approved evidence capture 启用后维护 target-scoped bounded causal head。Daemon 只能通过 explicit evidence lease 或已有 retained owner segment 读取 owner facts。Daemon 慢、断开或队列爆掉时，Runtime 继续前进并保留 dropped/degraded marker，不等待 daemon ack。

## Current Baseline

已经成立的事实：

- 175 已冻结 target-scoped operation ledger、ordering、watermark、stateAfter source ref、retention 和 overflow law。
- 177 已实现 `LiveInspectArtifact(section="timeline")`，从 175 operation window 和 176 field semantic payload join 投影 timeline。
- `LiveOperationWindowRequest` 内部已有 `cursor?: LiveLedgerWatermark`。
- browser adapter 可以从 payload 透传 cursor 到 operation window request。
- public CLI `logix live timeline` 目前只有 `--target / --attachment / --field / --limit`，没有 cursor flag。
- daemon 和 browser adapter 是 carrier，不拥有 ordering、watermark、stateAfter、field semantic payload 或 canonical evidence truth。

当前限制：

- `--limit` 只能拿最近窗口，不能表达“从上一个 watermark 之后继续读”。
- Runtime ledger 是 bounded head，不是长期历史库。
- Daemon 没有 retained owner segment，因此跨命令续读、evidence export 准备和 QA 录制都只能依赖仍存活的 Runtime head 或散落 artifact。
- 177 为 timeline v1 明确不扩 public CLI grammar。若要公开 cursor，必须由后续 spec 显式接管并回写 177，不能暗改。

## Spec Split

本提案不再把所有能力打包成一个大 spec。

### Spec 180

Tentative name:

```text
180-runtime-timeline-continuation-and-evidence-segment
```

180 owns:

- public `logix live timeline --cursor <token>` grammar upgrade
- opaque resume cursor law
- same-query continuation law
- evidence lease law
- daemon retained owner segment core
- segmented timeline source law
- coverage, completeness and safe resume boundary law
- minimal backpressure needed to avoid unbounded retained segment writes
- SSoT 18、SSoT 15 and 177 writeback

180 does not own:

- full daemon queue or task history UI
- Chrome extension
- QA recorder schema
- source-chain, source-map or AST index
- local semantic memory
- final SQLite schema
- replay engine

### Later Carrier-Hardening Spec

Tentative name:

```text
181-live-daemon-carrier-queue-and-task-history
```

181 owns full daemon operational queue:

- pending/running/done/failed/coalesced/cache-hit task history
- heavy read prioritization
- request coalescing policy
- task console projection
- multi-Agent carrier fairness

181 must import 180 and must not become Runtime evidence truth.

### Later Derived Consumer Specs

QA recording、source-chain join、work-session index、local semantic memory are downstream consumers of retained owner segments. They require their own evidence reason、confidence、redaction、source digest and non-runtime-truth law.

They must not be 180 exit gates.

## Runtime Bounded Head Law

Runtime head remains the only live causal truth source.

It contains:

- per target bounded window store
- owner event envelope、target coordinate、order key、watermark、`txnSeq / opSeq / linkId`
- stateAfter source ref or owner-coded gap
- payload refs or bounded summaries
- dropped、degraded、redaction and structured gap markers

It must obey:

- disabled live inspect does not allocate ledger buffer、timeline payload、spool payload or background drain
- transaction window contains no IO and no daemon wait
- stateAfter stays behind refs or bounded summaries
- overflow emits dropped marker and never presents partial history as complete
- cleanup follows target lifecycle

## Evidence Lease Law

Evidence lease is the only way daemon may retain runtime owner facts beyond request delivery.

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
- artifact refs、payload digest、source refs
- structured gap、dropped、degraded and redaction markers
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
- artifact refs、digests and gaps
- redaction and degraded markers
- TTL、size cap、workspace partition and lease provenance

It cannot store as core truth:

- daemon ordering
- daemon-computed timeline completeness
- source-map、AST、loaded-module or route semantic index
- work-session task history
- QA replay steps

Derived indexes may point at retained owner segments, but they must carry their own authority tag and confidence. They cannot rewrite Runtime watermark order or timeline completeness.

SQLite is a likely daemon-side implementation choice, not a contract. The contract is retained owner segment shape, budget, redaction, lifecycle and query semantics.

Chrome extension or Workbench panel may consume daemon query APIs. They must not own storage authority.

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

Daemon may not change query intent. It may not decide a history query should become latest head, or a latest head query should become retained history. If the requested continuation cannot be proven, output must contain structured gap and safe resume boundary.

Attachment remains part of the query. If multiple attachments can match and no attachment is supplied, the command follows existing ambiguity law. Cursor token must bind attachment when an attachment is known. Target or attachment mismatch returns structured gap.

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

The token may include an optional daemon locator hint. Locator hints are disposable. They never participate in ordering、comparison、completeness or mismatch decisions.

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
- dropped/degraded/redaction markers
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

Full request coalescing、task history、Agent task console and carrier fairness belong to 181.

## Killer Features Unlocked

### Cursor Timeline For Agent Debugging

Agent can inspect a live target, keep `cursor.next`, trigger a user action or dispatch, then request same-query continuation. It avoids repeatedly pulling the same recent window and gives Agent a stable causal boundary.

### Evidence Segment For Export And Recording

Export evidence、Workbench session and QA recording can open explicit lease and retain owner segments. Development Agent can later consume the retained segment without depending on a still-live Runtime head.

### Downstream Source Chain And QA Replay

Source-chain join and QA replay can join against retained owner segment refs, watermarks and artifact refs. They remain derived consumers. They cannot claim Runtime ordering, timeline completeness or verification verdict.

## Frozen Decisions

- `--cursor <token>` is the only first public CLI grammar upgrade.
- Raw `--after-watermark <json>` is rejected for public CLI v1.
- `--since / --until / --before / --after` are rejected for public CLI v1 because wall-clock time is daemon index semantics, not Runtime ordering truth.
- Ordinary timeline reads do not create retention lease.
- Daemon retained segment is core to 180; full daemon queue/task history is not.
- Source-chain、QA recorder、work-session index and local semantic memory are downstream specs, not 180 exit gates.
- Timeline merge and completeness stay in timeline projection law, not daemon retention.
- Cursor locator hints are non-semantic.
- `limit` does not enter cursor query fingerprint.

## Promotion Strategy

If adopted, promote 180 as `runtime-timeline-continuation-and-evidence-segment`.

SSoT writeback after consensus:

- update `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md` with evidence lease、retained owner segment、cursor and segmented source boundary
- update `docs/ssot/runtime/15-cli-agent-first-control-plane.md` with `--cursor <token>` grammar and same-query continuation semantics
- update `specs/177-runtime-inspect-timeline-projection/spec.md` so its v1 no-new-grammar rule is superseded only by 180

181 and downstream specs should be opened only after 180 freezes owner segment and cursor semantics.

## Proof Obligations

180 cannot exit without proof that:

- disabled live inspect allocates no spool payload、cursor payload or background drain
- transaction window contains no IO and no daemon wait
- ordinary `logix live timeline --cursor` does not create retention lease
- explicit lease requires purpose、budget、redaction and retention policy
- Runtime head overflow emits dropped/degraded marker
- retained segment writes obey TTL、size cap、redaction and workspace partition
- cursor token roundtrip preserves target-scoped Runtime watermark semantics
- cursor mismatch, expiry, retention gap and incomparable watermark return structured gap
- complete source segment chain continuation does not duplicate already consumed events
- partial source segment chain stays partial after cache hit or retained segment read
- daemon source segments cannot be merged unless watermark chain is comparable and continuous
- daemon locator hint cannot participate in ordering or completeness
- canonical evidence export packages owner facts and retained segment refs without becoming timeline truth

## Rejected Alternatives

### Always Push Every Runtime Event To Daemon

Rejected because it turns daemon health into runtime overhead, creates unnecessary memory and IO pressure, and makes disabled overhead hard to prove.

### Make Daemon The Timeline Owner

Rejected because daemon ordering would become a second Runtime truth. Daemon may retain owner segments, but Runtime watermark remains causal authority and timeline projection owns merge/completeness.

### Bundle Queue, QA, Source Chain And Semantic Memory Into 180

Rejected because it creates a second system. 180 must close the minimal causal evidence core first. Queue/task history and derived indexes need separate specs with their own authority and proof obligations.

### Add Wall-Clock Query Flags First

Rejected because wall-clock filters are daemon index semantics. They may be useful later in Workbench or daemon history UI, but watermark cursor is the minimal owner-backed continuation law.

### Store Full State Snapshots By Default

Rejected because it makes memory and privacy costs scale with user behavior. Default retained segment stores refs、digests、bounded summaries and gaps. Full snapshots require explicit debug or recording budget.

### Put Persistent Storage In Chrome Extension

Rejected as authority placement. Chrome extension can be a panel or recorder shell, but daemon should own local retention so CLI、Workbench and extension share one boundary.

## Deferred To Future Specs

- exact daemon storage schema
- full daemon queue and task console
- QA evidence recording package
- source-chain and SourceMap/AST derived index
- local semantic memory
- replay engine

## Non-Goals

- Do not implement replay engine in this proposal.
- Do not promote React host evidence or profiler owner.
- Do not define final SQLite schema.
- Do not add Chrome extension as mandatory UI.
- Do not turn live evidence into `runtime.check` or `runtime.trial` verdict.
- Do not make source map or AST indexes Runtime truth.

## 去向

2026-05-05 已升格为 [180-runtime-timeline-continuation-and-evidence-segment](../../specs/180-runtime-timeline-continuation-and-evidence-segment/spec.md)。

180 承接 `Minimal Causal Evidence Core`：timeline continuation、evidence lease、daemon retained owner segment、opaque cursor 和 segmented timeline source law。完整 daemon queue/task history、QA recorder、source-chain / SourceMap / AST derived index、local semantic memory、replay engine 和最终 daemon storage schema 仍为后续 spec。
