# Live Runtime Evidence End-State Contract Proposal

Status: review-closed

This proposal was the review object for post-172 planning. It is not the adopted SSoT.

Adopted output:

- SSoT: [../../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- umbrella spec: [../../173-runtime-inspect-evidence-end-state/spec.md](../../173-runtime-inspect-evidence-end-state/spec.md)
- review ledger: [../../../docs/review-plan/runs/runtime-inspect-end-state-contract-20260504.md](../../../docs/review-plan/runs/runtime-inspect-end-state-contract-20260504.md)

The remaining text records the final review candidate that reached consensus.

# Target Claim

Post-172 work should optimize for live runtime evidence and causal debug records, not for clearing every 172 structured gap.

172 remains the completed route and structured-gap closure for live inspect drilldown. The next step should freeze a long-term Runtime Inspect Evidence contract in `docs/ssot/runtime/`, then use `173` only as the implementation umbrella that splits owner-model work.

# Review Goal

The review goal is design closure.

Round 2 reviewers should only check whether this candidate resolves Round 1 residuals:

- target function was too inspect/gap-centered
- 173 was incorrectly positioned as long-term authority
- canonical evidence boundary was under-specified
- cross-owner coordination law was missing
- follow-up specs were over-split
- field event metadata, stateAfter and summary composition had ambiguous ownership

# Non-Goals

- Do not implement code.
- Do not declare 172 incomplete solely because P1 rows currently return structured gaps.
- Do not make 173 or any numbered spec the long-term SSoT for runtime inspect evidence.
- Do not create one spec per CLI command.
- Do not allocate separate specs for timeline, React host evidence or profile summary until their foundation gates pass.
- Do not let CLI, daemon, browser adapter, Workbench or canonical evidence define Runtime facts.

# Authority Landing

Long-term contract authority should land in a runtime SSoT page, tentatively:

- `docs/ssot/runtime/18-runtime-inspect-evidence-contract.md`

Execution planning should land in:

- `specs/173-runtime-inspect-evidence-end-state/`

Existing documents keep narrower authority:

- `specs/172-agent-first-runtime-inspect-data-plane/parity-matrix.md` remains the frozen route closure ledger for 172.
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md` owns CLI live grammar, transport envelope and command surface only.
- `specs/172-agent-first-runtime-inspect-data-plane/implementation-details/owner-gap-closure-analysis.md` becomes historical analysis and input evidence after the adopted SSoT exists.

# Adopted Direction

The adopted direction should be:

- one SSoT contract for runtime inspect evidence laws
- one implementation umbrella spec for sequencing and gates
- three foundation implementation specs
- dependent backlog rows for timeline, React host evidence and profile summary

The three foundation implementation specs are:

- reflection live binding model
- runtime-live operation ledger
- field-runtime inspect model

Timeline stateAfter is not a foundation owner. Its producer law belongs to the runtime-live operation ledger and field-runtime inspect model. A future timeline spec, if opened, should only own projection/query shape, item budget and item-level gap behavior.

React host evidence is not Runtime truth. It can become a host evidence extension after ledger link rules are stable.

Local profile summary belongs to a local profiler owner and should remain independent from runtime inspect evidence authority.

# End-State Contract Shape

The adopted SSoT should not copy this review draft structure. It should be compressed into four sections.

First: owner authority map.

Second: runtime inspect coordination law.

Third: dependency and reopen backlog.

Fourth: proof obligation schema.

Review questions, expected outputs and reviewer scaffolding belong only in this proposal and review ledger.

# Owner Authority Map

Reflection live binding model owns binding authority:

- `LiveManifestBindingRef`
- manifest digest authority
- schema digest authority
- validator availability authority
- dispatch admission binding header

Action list, payload summary and static summary are derived projections from that binding authority. They are not separate foundations.

Runtime-live operation ledger owns causal coordination:

- event envelope
- target coordinate
- ordering
- `txnSeq / opSeq / linkId`
- watermark
- stateAfter source ref law
- diagnostics/process event envelope
- operation window refs

The ledger does not own field semantic payloads, reflection schema payloads, React host evidence payloads or profile payloads.

Runtime-live current-state projection owns current `state` and `state-path`.

Current state and historical stateAfter are separate laws. Latest state must not backfill historical timeline items.

Field-runtime inspect model owns field semantics:

- final field list
- field identity digest
- field graph semantic adjacency
- latest field summary
- field convergence summary
- field semantic metadata payload

Field event output uses a two-layer contract:

- operation ledger owns event envelope, order, watermark and join key
- field-runtime owns field semantic payload, digest and source

Canonical evidence owns export envelope only:

- it packages owner facts, gaps, artifact refs, provenance, redaction and degraded markers
- it does not define inspect semantics
- it does not synthesize missing Runtime facts
- it does not override owner redaction or degraded markers

Daemon, browser adapter, CLI and Workbench remain carriers or consumers only.

# Runtime Inspect Coordination Law

The coordination law is not a fourth fact owner. It is the axiom kernel every owner spec must obey.

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

Every owner spec must import this law instead of redefining its own join vocabulary.

The shared coordinate vocabulary is:

- target coordinate
- attachment id
- `txnSeq`
- `opSeq`
- `linkId`
- watermark
- artifact ref

# Dependency And Reopen Backlog

Foundation sequence:

- `174-reflection-live-binding-model`
- `175-runtime-live-operation-ledger`
- `176-field-runtime-inspect-model`

Dependent backlog rows:

- timeline projection and query shape
- React host evidence owner
- local profiler owner

Timeline can be promoted to a standalone spec only after:

- ledger records stateAfter refs or watermark law
- field-runtime supplies field event semantic payloads
- latest-state backfill remains forbidden

React host evidence can be promoted only after:

- ledger link rules are stable
- host evidence cannot become Runtime truth
- selector/render identity has disabled-overhead proof

Local profile summary can be promoted only after:

- local profiler owner has budget and authorization rules
- profile artifacts only link to runtime facts through target/time/link refs

# Rejected Alternatives

Rejected: keep expanding 172.

Reason: it would make 172 both route closure and future architecture roadmap.

Rejected: create one follow-up spec per CLI command.

Reason: CLI commands are consumer shape, not fact authority boundaries.

Rejected: make canonical evidence a runtime evidence ledger.

Reason: canonical evidence is a derived export envelope. If it defines inspect truth, it becomes a second Runtime fact source.

Rejected: merge runtime-live ledger and field-runtime inspect model into one owner.

Reason: ledger owns causal envelope and order; field-runtime owns semantic field facts. Merging them would either swallow field semantics into event shape or make ledger own too much.

# Proof Obligation Schema

Every adopted owner spec must prove:

- no CLI/daemon/browser/Workbench fact ownership
- owner-side budget, redaction and degraded behavior
- disabled-overhead behavior
- target identity and lifecycle cleanup
- canonical evidence export derives from owner facts only
- structured gaps include owner, code and reopen bar
- no verification verdict fields in live inspect output

Reflection live binding proof must additionally show:

- canonical target returns matched binding
- dispatch admission uses the same binding fact
- missing binding is per-target transient, not structural success

Runtime-live operation ledger proof must additionally show:

- event window is target-scoped
- diagnostics and process envelopes are owner-backed
- current state is not used as historical stateAfter
- ledger cleanup follows runtime target lifecycle

Field-runtime inspect proof must additionally show:

- field graph uses semantic adjacency, not raw nodes/edges
- field event metadata uses ledger envelope plus field semantic payload
- missing field identity degrades or gaps instead of synthesizing ids

# Expected Adopted Output

If Round 2 reaches consensus, the main agent should:

- create the adopted runtime SSoT page
- create 173 as the implementation umbrella
- update 172 with a short handoff link only
- update SSoT 15 to point to the new runtime inspect evidence contract for owner laws
- create or list 174-176 as necessary implementation specs
- keep dependent backlog rows inside the adopted contract until their gates pass
