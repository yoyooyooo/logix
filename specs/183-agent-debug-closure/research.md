# Research: Agent Debug Closure

## Decision: Keep React Host Evidence As Adjunct Sidecar

React host evidence is admitted only as subordinate evidence over Runtime-owned coordinates.

Rationale:

- Runtime owner facts already answer what happened.
- The remaining gap is where those facts were projected in React and whether a selector/render boundary observed them.
- Host evidence becomes dangerous if it owns ordering, field semantics, verification verdicts or comparison truth.

Alternatives considered:

- Standalone React host evidence owner: rejected by 182 because it would duplicate SSoT 18 and create unclear public artifact routes.
- Merge host evidence into runtime-live ledger: rejected because ledger owns causal operation envelopes, not host projection payload.
- DOM/component heuristic mapping: rejected because it is not stable enough for Agent diagnosis evidence.

## Decision: Link Interaction Through Declared Action Admission

Interaction linkage uses host interaction refs only as provenance and must join to declared action dispatch admission before it can point to Runtime operation coordinates.

Rationale:

- A click or input event alone is not a Runtime operation fact.
- `dispatch.declaredAction` already has admission, denial and no-mutation semantics.
- Joining through `txnSeq / opSeq / linkId` keeps the chain explainable and machine-readable.

Alternatives considered:

- Infer operation from DOM event timing: rejected because it is fragile under batching and async UI behavior.
- Treat every user interaction as a Runtime event: rejected because it would add a second event source and increase capture overhead.

## Decision: Keep Local Profile Summary Bounded And Local-Only

Local profiling is admitted only as a bounded summary linked by target/time/link refs.

Rationale:

- Agent debugging often needs cost symptoms, but raw profiler samples are not Runtime facts.
- Local-only summaries avoid committing to a platform profiler owner or storage model.
- Authorization and budget gates keep profile capture explicit and bounded.

Alternatives considered:

- Deep CPU/heap profile as live artifact: rejected for 183 due to size, privacy and ownership scope.
- Always-on profile collection: rejected because it violates disabled-overhead law.
- Profiler samples in timeline: rejected because timeline ordering belongs to Runtime watermarks and operation windows.

## Decision: Preserve Existing CLI Surface And Artifact Kinds

183 uses existing `logix live ...` routes and existing artifact kinds: `LiveInspectArtifact`, `LiveProfileSummary`, `CanonicalEvidencePackageRef`, `EvidenceGap` and repo-internal harness output.

Rationale:

- SSoT 15 already rejects `logix debug`.
- Existing `LiveCommandResult` output can carry live artifacts, profile summaries and canonical evidence refs.
- A new public host artifact kind would require reopening SSoT 18 and SSoT 15.

Alternatives considered:

- Add `logix debug`: rejected because it fragments live diagnosis from live runtime collaboration.
- Add public `HostEvidence` or `HostAdjunctEvidence`: rejected because it would imply a standalone host evidence route and weaken no-second-truth law.

## Decision: Keep Production Bundle Proof As Repo-Wide Safety Gate

Production bundle reachability proof remains in the harness standard and is consumed by 183.

Rationale:

- Production safety is cross-cutting across live bridge, debug carrier and React host capture.
- The gate should not be redefined in a leaf spec.
- `examples/logix-react` can act as the real business project witness for this wave.

Alternatives considered:

- Put bundle proof solely in 183: rejected because future live/debug specs must reuse the same standard.
- Trust package exports alone: rejected because tree-shaking and side-effect metadata require executable proof.

## Decision: Defer SourceMap/AST Indexing, QA Recorder And Persistent Storage

183 does not implement SourceMap/AST route indexes, QA replay package, final SQLite schema or work-session task history.

Rationale:

- These can be valuable future product surfaces, but they are not needed to close terminal live diagnosis over Runtime facts plus host/profile sidecars.
- Each needs separate authority, redaction, confidence and persistence law.
- Pulling them into 183 would make the closure too broad and risk a second truth source.

Alternatives considered:

- Add source index to improve evidence links: rejected because source refs can remain explicit refs or gaps.
- Add QA recorder package: rejected because replay semantics are larger than diagnosis packaging.
- Add SQLite now: rejected because 183 does not need durable multi-session storage.

