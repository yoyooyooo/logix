---
title: Runtime Inspect Evidence Contract
status: living
version: 4
---

# Runtime Inspect Evidence Contract

本页冻结 172 之后 live runtime inspect 的长期事实边界。目标不是清零所有 structured gap，而是让 Agent 能拿到可追溯、可导出、可比较的 live runtime evidence 和 causal debug record。

172 已关闭 route 和 structured-gap data plane；172 的 [parity matrix](../../../specs/172-agent-first-runtime-inspect-data-plane/parity-matrix.md) 继续作为冻结 route closure ledger。后续 owner-backed producer work 不再回填进 172 主体。本页持有 post-172 owner law；`specs/173-*` 只负责实施编排和门禁。

## Owner Authority Map

Reflection live binding model owns binding authority:

- `LiveManifestBindingRef`
- manifest digest authority
- schema digest authority
- validator availability authority
- dispatch admission binding header

Action list、payload summary 和 static summary 都是从 binding authority 派生的投影，不是独立 foundation。

Runtime-live operation ledger owns causal coordination:

- event envelope
- target coordinate
- ordering
- `txnSeq / opSeq / linkId`
- watermark
- stateAfter source ref law
- diagnostics/process event envelope
- operation window refs

Operation ledger 不拥有 field semantic payload、reflection schema payload、React host evidence payload 或 profile payload。

Runtime-live current-state projection owns current `state` and `state-path`。Current state 与 historical stateAfter 是两条不同规则；latest state 禁止回填历史 timeline item。

Field-runtime inspect model owns field semantics:

- final field list
- field identity digest
- field graph semantic adjacency
- latest field summary
- field convergence summary
- field semantic metadata payload

Field event output uses a two-layer contract:

- operation ledger owns event envelope、order、watermark and join key
- field-runtime owns field semantic payload、digest and source

Runtime inspect timeline projection owns query and output projection shape only:

- `LiveInspectArtifact(section="timeline")`
- target / attachment / limit / field query projection
- ordered timeline item shape derived from operation windows
- field filter completeness derived from field semantic joins
- opaque cursor resume certificate output
- same-query continuation projection over Runtime-owned watermarks
- segmented source output over `runtime-head` and `daemon-retained-segment`
- safe resume boundary and source segment chain gap output

Timeline projection does not own ordering、watermark、stateAfter law、field semantic payload、React host evidence payload or profile payload. `180-runtime-timeline-continuation-and-evidence-segment` extends 177 with cursor continuation and segmented source law; it does not create a new Runtime fact owner.

Canonical evidence owns export envelope only:

- packages owner facts、gaps、artifact refs、provenance、redaction and degraded markers
- does not define inspect semantics
- does not synthesize missing Runtime facts
- does not override owner redaction or degraded markers

Daemon、browser adapter、CLI 和 Workbench remain carriers or consumers only. They must not become Runtime fact owners.

A React dev lifecycle carrier may physically host a bounded runtime-live operation ledger source for browser-handled live operations. The browser adapter may only record and read through runtime-live owner APIs, preserve owner markers, and transport artifacts; it does not own ordering, watermark, stateAfter, timeline or field semantics.

Daemon retained owner segment is a retention artifact over Runtime-owned facts. It may store bounded owner event projections, Runtime watermarks, owner event ids, artifact refs, digests, structured gaps, redaction/degraded markers, TTL, size cap, workspace partition and lease provenance. It must not store daemon ordering, daemon-computed timeline completeness, source map or AST indexes as core truth, work-session task history, QA replay steps, verification verdicts or repair hints as Runtime truth.

Evidence lease is the only authority that lets daemon retain Runtime owner facts beyond request delivery. Ordinary `logix live timeline` and `logix live timeline --cursor` do not create retention leases or background drains.

## Runtime Inspect Coordination Law

The coordination law is the axiom kernel every owner spec must obey. It is not a fourth fact owner.

It freezes:

- target identity law
- event coordinate law
- static binding ref law
- field event join law
- current-state versus historical stateAfter law
- gap propagation law
- redaction and degraded propagation law
- canonical evidence derivation law
- disabled-overhead law

Every owner implementation spec must import this law instead of redefining join vocabulary.

The shared coordinate vocabulary is:

- target coordinate
- attachment id
- `txnSeq`
- `opSeq`
- `linkId`
- watermark
- artifact ref

## Cost And Memory Law

Every runtime inspect owner must treat performance and memory as part of its owner contract, not as implementation polish.

The default cost law is:

- disabled live inspect must not allocate owner buffers, projection payloads or background collectors
- owner indexes must be target-scoped or manifest-scoped and cleaned with the same lifecycle as their target or manifest binding
- hot-path admission checks must be pure, in-memory and bounded
- large owner payloads must use bounded summaries, artifact refs, truncation or degraded markers
- carrier queues, browser adapters, daemon state and Workbench views must not retain owner payloads beyond their lease or target lifecycle
- implementation specs must include focused proof for disabled allocations, bounded output and cleanup behavior

If an owner implementation needs an always-on structure, it must reopen the owner spec and prove why the structure is part of the kernel invariant rather than live inspect collection.

## Dependency And Reopen Backlog

Foundation and promoted sequence:

- `174-reflection-live-binding-model`
- `175-runtime-live-operation-ledger`
- `176-field-runtime-inspect-model`
- `177-runtime-inspect-timeline-projection`
- `178-runtime-summary-projection`
- `179-debug-event-source-bridge`
- `180-runtime-timeline-continuation-and-evidence-segment`
- `183-agent-debug-closure`
- `187-live-diagnosis-evidence`
- `188-react-host-adjunct-evidence`

Promoted dependent rows:

- `177-runtime-inspect-timeline-projection`: owns timeline query/output projection shape after 175 stateAfter/watermark proof and 176 field semantic payload proof passed.
- `178-runtime-summary-projection`: owns summary query/output composition shape over 175 operation windows and 176 field summaries.
- `179-debug-event-source-bridge`: owns source bridge plumbing from owner-approved DebugSink diagnostic/process records into 175 read-time ledger normalization.
- `180-runtime-timeline-continuation-and-evidence-segment`: owns timeline cursor continuation, evidence lease, daemon retained owner segment and source segment chain proof after 177 projection proof passed.
- `183-agent-debug-closure`: 保留为 broader prior terminal diagnosis planning context，不再是当前 active implementation owner。
- `187-live-diagnosis-evidence`: owns terminal live evidence lane closure over Runtime owner facts, canonical evidence export, structured gaps and no-second-truth live transport law.
- `188-react-host-adjunct-evidence`: owns terminal React host adjunct evidence, interaction linkage and bounded local profile summaries as admitted subordinate sidecars over Runtime owner facts. It does not create a new Runtime fact owner.

Deferred dependent backlog rows after 183 planning:

- none for the post-180 CLI live diagnosis closure; any future row must pass the 183 reopen bar

Timeline was promoted to a standalone spec after:

- ledger records stateAfter refs or watermark law
- field-runtime supplies field event semantic payloads
- latest-state backfill remains forbidden

Summary was promoted to a standalone spec after:

- operation windows became owner-backed through 175
- field summaries became owner-backed through 176
- summary remained a composition projection instead of a new owner

Diagnostic/process source bridge was promoted to a standalone spec after:

- 175 froze capture-time DebugSink normalization as the ledger-owned event path
- the remaining gap became source plumbing into the lifecycle carrier, not a new owner model
- always-on DebugSink push into ledger buffers remained forbidden

Post-179 closure:

- Runtime Inspect Coverage Harness records 21 fact families with 17 owner-backed, 0 structured-gap, 2 deferred and 2 rejected rows.
- `diagnostics` and `process-events` are no longer structured-gap rows after 179.
- The former remaining backlog rows were React host adjunct evidence admission and local profiler owner. They are now implemented through `188-react-host-adjunct-evidence`, while `183-agent-debug-closure` remains the broader prior planning context, not the active implementation owner.

React host adjunct evidence is not admitted as a standalone Runtime owner. `188-react-host-adjunct-evidence` is the admitted terminal implementation spec for this lane, and `183-agent-debug-closure` remains broader prior context. The admitted lane may proceed only while all of these hold:

- it closes a real Agent diagnosis blind spot that owner-backed runtime evidence cannot answer alone
- it remains adjunct and never owns ordering、watermark、stateAfter、timeline completeness、field semantics、verification verdicts、repair hints or Runtime fact comparison
- linkage vocabulary reuses only target coordinate、attachment id、`txnSeq`、`opSeq`、`linkId`、artifact ref、gap、redaction and degraded markers
- selector/render identity references only React host law, such as selector fingerprint or render boundary ref from `10-react-host-projection-boundary.md`; it must not create a second selector authority
- missing、ambiguous、conflicting、redacted or degraded linkage returns an owner-coded structured gap or disagreement marker; Runtime truth still wins
- export can only happen through canonical evidence packaging or repo-internal host harness output unless `15-cli-agent-first-control-plane.md` explicitly admits a new public artifact route
- disabled capture proof imports this page's cost law and additionally proves no host capture buffer, no render subscription fanout, no transaction-window IO, bounded host buffer cleanup, carrier preservation and no public route drift

Local profiler summary can be promoted by 183 only as bounded local diagnosis evidence after:

- local profiler owner has budget and authorization rules
- profile artifacts only link to runtime facts through target/time/link refs
- profile summaries remain local-only, bounded, redaction-preserving and never become timeline ordering, Runtime facts, verification verdicts or repair hints

Rejected alternatives:

- keep expanding 172
- create one follow-up spec per CLI command
- make canonical evidence a runtime evidence ledger
- merge runtime-live ledger and field-runtime inspect model into one owner

## Proof Obligation Schema

Every adopted owner spec must prove:

- no CLI/daemon/browser/Workbench fact ownership
- owner-side budget、redaction、degraded behavior and memory cap
- disabled-overhead and disabled-allocation behavior
- target identity and lifecycle cleanup
- canonical evidence export derives from owner facts only
- structured gaps include owner、code and reopen bar
- no verification verdict fields in live inspect output

Reflection live binding proof must additionally show:

- canonical target returns matched binding
- dispatch admission uses the same binding fact
- missing binding is per-target transient, not structural success
- action lookup is indexed or otherwise bounded for large manifests
- binding indexes and projection caches are cleaned with target or manifest lifecycle

Runtime-live operation ledger proof must additionally show:

- event window is target-scoped
- diagnostics and process envelopes are owner-backed
- current state is not used as historical stateAfter
- ledger cleanup follows runtime target lifecycle
- per-target ledger buffers have explicit retention, overflow and dropped-event behavior
- diagnostics/process normalization is gated and does not allocate payload projections when disabled
- carrier queues cannot outlive target lifecycle or retain unbounded operation windows

Field-runtime inspect proof must additionally show:

- field graph uses semantic adjacency, not raw nodes/edges
- field event metadata uses ledger envelope plus field semantic payload
- missing field identity degrades or gaps instead of synthesizing ids
- field projections are target-scoped and lazy or explicitly requested
- large field lists, adjacency maps and summaries degrade through bounded summaries, artifact refs, truncation or owner-coded gaps
- disabled field inspect allocates no projection payloads, projection caches or carrier-retained field owner data
- projection caches, if any, clean up with target lifecycle and do not retain raw field program, raw graph, runtime handles or full summary as authority
- carrier outputs preserve field-runtime redaction and degraded markers without rewriting owner or code

Timeline projection proof must additionally show:

- timeline items derive ordering, watermark and stateAfter only from runtime-live operation windows
- field filtering uses field-runtime semantic payload joins, not raw field graph or latest summary backfill
- missing operation window, missing field metadata, over-budget projection and terminal target emit owner-coded gaps or degraded markers
- disabled timeline projection allocates no item payloads, projection caches or carrier-retained timeline owner data
- carrier outputs preserve timeline redaction, degraded, dropped and owner gap markers without rewriting owner or code

Timeline continuation and retained segment proof must additionally show:

- `cursor.next` is opaque public grammar over Runtime watermark, target, optional attachment, query fingerprint, coverage and completeness
- `limit`, lease budget and request byte budget do not enter same-query cursor identity
- cursor mismatch, expiry, missing retained segment, retention gap and incomparable watermark emit stable owner-coded gaps
- ordinary timeline reads and cursor reads create no retention lease and no background drain
- explicit evidence leases carry allowed purpose, budget, redaction, retention policy and consumer identity
- daemon retained owner segments preserve owner watermarks, event ids, bounded projections, redaction/degraded markers, structured gaps and lease provenance
- daemon retained owner segments never own ordering, merge, timeline completeness, source-chain semantics, verification verdicts or repair hints
- timeline output exposes `sourceSegments`, `watermarkRange`, coverage, completeness, gaps and safe resume boundary
- source segment chain merge accepts only comparable, continuous Runtime watermark chains and returns partial output with structured gaps otherwise
- daemon, browser adapter, CLI and Workbench preserve source segments, completeness, gaps and safe resume boundary without rewriting owner truth

`188-react-host-adjunct-evidence` and any future React host adjunct evidence follow-up must additionally show:

- React host evidence is only a provenance sidecar over Runtime-owned coordinates and never an owner of Runtime facts
- host selector/render references are deterministic and derived from React host law, not from ad hoc DOM or component heuristics
- conflict with Runtime facts returns a structured disagreement marker; host evidence never overrides ledger、field-runtime、timeline or canonical evidence authority
- disabled host capture allocates no capture buffers, creates no extra render fanout, performs no transaction-window IO and leaves production bundle safety to the repo-wide live evidence safety gate
- bounded host buffers, if admitted, are target-scoped, lifecycle-cleaned and redaction/degraded-preserving
- public CLI output does not gain `HostEvidence` or `HostAdjunctEvidence` artifact kinds unless SSoT 15 is reopened and explicitly adopts that route

Summary projection proof must additionally show:

- operation summary facts derive only from 175 operation windows
- field convergence facts derive only from 176 field summaries
- missing operation and missing field summary slices remain separate owner-coded gaps
- disabled summary projection allocates no summary payloads, projection caches or carrier-retained summary owner data
- carrier outputs preserve summary owner, degraded, redaction and gap markers without rewriting owner or code

Diagnostic/process source bridge proof must additionally show:

- DebugSink remains source material and does not own ledger envelopes
- diagnostic/process normalization happens only for explicit live event/capture reads
- disabled diagnostics and disabled live inspect allocate no diagnostic/process ledger payload projections
- source records are target-scoped or gap with owner-coded missing-coordinate evidence
- carrier outputs preserve runtime-live diagnostic/process owner markers without rewriting order, watermark or gap codes

## Authority Handoff

- [15-cli-agent-first-control-plane.md](./15-cli-agent-first-control-plane.md) owns CLI grammar and transport envelope.
- [../../../specs/172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../../../specs/172-agent-first-runtime-inspect-data-plane/parity-matrix.md) owns 172 route closure.
- `173-runtime-inspect-evidence-end-state` owns implementation sequencing and gates for this contract.
- `174/175/176/177/178/179/180` owner specs must cite this page as their owner-law authority.
