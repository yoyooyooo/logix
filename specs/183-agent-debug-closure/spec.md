# Feature Specification: Agent Debug Closure

**Feature Branch**: `183-agent-debug-closure`
**Created**: 2026-05-06
**Status**: Planned
**Input**: User request to open and complete the final CLI auxiliary debugging capability spec so an Agent can inspect the important runtime surfaces for feature development and bug diagnosis, while allowing core pressure and challenging existing assumptions.

## Current Role

183 is the final planned Agent debugging closure spec for `logix live`.

It does not reopen 171 to 180, does not revive 182, and does not make CLI, daemon, browser adapter, Workbench, React host, canonical evidence or profiler samples owners of Runtime truth.

183 admits one terminal capability lane:

- Runtime-owned facts remain owned by 174 to 180 and SSoT 18.
- React host evidence is admitted only as a subordinate adjunct sidecar over Runtime coordinates.
- Interaction linkage is admitted only as a provenance bridge from user/host actions to `txnSeq / opSeq / linkId`.
- Local profile summary is admitted only as bounded diagnosis evidence linked to Runtime facts, not as Runtime facts.
- CLI exposes the closure through existing `logix live ...` command surface and canonical evidence refs, not through a second debug namespace or new truth envelope.

After 183 closes, remaining CLI live debug gaps must be treated as evidence-quality refinements or new product surfaces with a high reopen bar. They must not silently expand the live data plane.

## Context

171 created the live bridge. 172 closed route-level runtime inspect. 173 to 180 promoted owner-backed runtime inspect evidence: reflection binding, runtime-live ledger, field runtime inspect, timeline projection, summary projection, debug/process source bridge, cursor continuation, evidence lease and retained owner segments.

181 reviewed the post-180 frontier. 182 was stopped because standalone React host evidence would create a second evidence authority. The adopted law was `SSoT 18 first`: React host evidence may return only as a subordinate adjunct producer if it proves terminal Agent diagnosis value, bounded cost and no public artifact drift.

The remaining terminal gap is not another CLI grammar sweep. An Agent can already ask Runtime what happened, but still cannot reliably connect these questions end to end:

- Which React host, route and render boundary projected this Runtime target?
- Which selector subscription should have observed this Runtime state or field change?
- Did a user interaction, declared action dispatch, runtime transaction and render pass line up?
- Is the failure a Runtime fact issue, a host projection issue, an interaction linkage gap or a local performance symptom?
- Can the evidence package preserve these answers without shipping dev-only capture into production bundles?

183 owns that final diagnosis closure.

## Scope

### In Scope

- React host adjunct evidence admission as a subordinate implementation spec under SSoT 18.
- Host attachment evidence linking Runtime target, attachment, route, React root, Program host and render boundary refs.
- Selector subscription evidence linking core selector fingerprint / route identity to host subscription refs.
- Render boundary evidence linking host render observations to Runtime coordinates and source/module refs when available.
- Interaction linkage evidence connecting user/host interaction, declared action dispatch and `txnSeq / opSeq / linkId`.
- Bounded local profile summary promotion for Agent diagnosis, tied only through target/time/link refs.
- Diagnosis-ready canonical evidence packaging that preserves owner facts, adjunct sidecars, profile summaries, disagreements, redaction, degraded markers and structured gaps.
- Core pressure where existing Runtime or React host internals cannot provide deterministic coordinates, lifecycle cleanup, disabled-overhead or bounded proof.
- SSoT 18, SSoT 10, SSoT 15, 181 and 182 writebacks that clarify 183 as the admitted successor without changing 182's stopped status.

### Out of Scope

- A new `logix debug` namespace.
- New public artifact kinds named `HostEvidence` or `HostAdjunctEvidence`.
- React host evidence as Runtime truth.
- Daemon, browser adapter, Workbench or canonical evidence as fact owners.
- Full QA recorder / replay engine.
- Source map, AST or loaded-module index as core Runtime truth.
- Deep CPU profile, heap snapshot, remote/cloud mutation or long-running raw stream.
- Production bundle inclusion of live/debug/dev carrier logic.
- Compatibility layers for older live inspect shapes.

## Imported Authority

- Runtime inspect owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- CLI grammar and transport envelope: [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- React host projection boundary: [../../docs/ssot/runtime/10-react-host-projection-boundary.md](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- Live evidence safety gate: [../../docs/standards/harness-and-proof-assets-standard.md](../../docs/standards/harness-and-proof-assets-standard.md)
- Runtime inspect evidence end-state: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- Runtime-live ledger: [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- Field runtime inspect: [../176-field-runtime-inspect-model/spec.md](../176-field-runtime-inspect-model/spec.md)
- Timeline projection: [../177-runtime-inspect-timeline-projection/spec.md](../177-runtime-inspect-timeline-projection/spec.md)
- Summary projection: [../178-runtime-summary-projection/spec.md](../178-runtime-summary-projection/spec.md)
- Debug event source bridge: [../179-debug-event-source-bridge/spec.md](../179-debug-event-source-bridge/spec.md)
- Timeline continuation and evidence segment: [../180-runtime-timeline-continuation-and-evidence-segment/spec.md](../180-runtime-timeline-continuation-and-evidence-segment/spec.md)
- Frontier closure container: [../181-cli-evidence-frontier/spec.md](../181-cli-evidence-frontier/spec.md)
- Stopped standalone host candidate: [../182-react-host-adjunct-evidence/spec.md](../182-react-host-adjunct-evidence/spec.md)

## Closure & Guardrails

### Closure Contract

183 is closed only when all of these are true:

- Agent can obtain a single diagnosis-ready evidence package for a live target that includes Runtime owner facts plus admitted host adjunct, interaction linkage and profile summary refs or structured gaps.
- Host adjunct evidence proves it closes a diagnosis blind spot that owner-backed Runtime evidence cannot answer alone.
- Host adjunct evidence never owns ordering, watermark, stateAfter, timeline completeness, field semantics, verification verdicts, repair hints or Runtime fact comparison.
- Interaction linkage uses only target coordinate, attachment id, `txnSeq`, `opSeq`, `linkId`, artifact ref, source ref, gap, redaction and degraded markers admitted by SSoT 18.
- Profile summary is bounded, local-only, authorized and linked only by target/time/link refs.
- Disabled live debug closure allocates no host capture buffer, no render subscription fanout, no profile sample buffer, no projection cache and no transaction-window IO.
- Production bundle proof shows dev/live/debug carriers remain outside business production bundles.
- CLI public output remains inside existing `LiveInspectArtifact`, `LiveProfileSummary`, `CanonicalEvidencePackageRef`, `EvidenceGap` or repo-internal harness routes unless SSoT 15 is explicitly reopened.
- Runtime Inspect Coverage Harness is updated so the former React host adjunct evidence and local profiler deferred rows become owner-backed, adjunct-backed, profile-backed or explicitly rejected with stable reasons.

### Must Cut

- Do not create a second Runtime truth source.
- Do not add `logix debug`.
- Do not add public `HostEvidence` or `HostAdjunctEvidence` artifact kinds.
- Do not let React selector/render evidence override core selector law or runtime facts.
- Do not let profile samples become timeline facts.
- Do not let ordinary timeline reads create leases or retained segments.
- Do not store source map, AST, route index, QA replay steps or work-session task history as Runtime truth.
- Do not hide capture cost behind default-on dev convenience.
- Do not keep existing core, host, daemon or CLI shapes if they prevent deterministic coordinates, bounded memory, production safety or owner clarity.

### Reopen Bar

After 183 closes, new CLI live debugging capability may reopen only if it strictly improves terminal Agent diagnosis value without increasing public surface, weakening SSoT 18 owner authority, adding disabled overhead, weakening production bundle safety or creating a second evidence envelope.

## Terminal Diagnosis Model

183 freezes the terminal diagnosis model as:

```text
Runtime owner facts
  + admitted adjunct sidecars
  + profile summaries
  + structured gaps / disagreements
  -> canonical evidence package refs for Agent diagnosis
```

Runtime owner facts answer what happened. Adjunct sidecars answer where the Runtime fact was projected in the host and how it was linked to user interaction. Profile summaries answer whether local cost symptoms correlate with Runtime coordinates. Structured gaps answer why a chain cannot be proven.

No part of this model allows a sidecar to rewrite Runtime owner facts.

## User Scenarios & Testing

### User Story 1 - Diagnose UI Did Not Update (Priority: P1)

As an Agent modifying a React page, I can see that a declared Runtime action completed, the expected field changed, and the corresponding React selector or render boundary did not observe or project it.

**Why this priority**: This is the highest-value bug loop for feature development. Runtime evidence alone can prove the state changed, but cannot prove whether the host subscription or render projection was connected.

**Independent Test**: Drive a live demo route, dispatch an admitted action, read timeline / fields / summary plus host adjunct evidence, and verify the evidence package identifies the Runtime operation, field semantic payload, selector subscription ref, render boundary ref or a structured host gap.

**Acceptance Scenarios**:

1. **Given** a target with Runtime owner facts and host adjunct capture enabled, **When** an action changes a field that a React selector subscribes to, **Then** the evidence package links the action, field fact, selector fingerprint and render boundary ref.
2. **Given** Runtime owner facts exist but no matching host selector can be proven, **When** the Agent exports evidence, **Then** the package includes a structured host gap instead of guessing a component.
3. **Given** host evidence conflicts with Runtime owner facts, **When** the package is assembled, **Then** Runtime truth wins and the host side emits a structured disagreement marker.

### User Story 2 - Trace User Interaction To Runtime Operation (Priority: P1)

As an Agent debugging a user-reported issue, I can link a host interaction to a declared action dispatch and then to the resulting Runtime transaction and render projection.

**Why this priority**: It connects real frontend behavior to Runtime facts without requiring the Agent to infer from logs or DOM heuristics.

**Independent Test**: Simulate a click or input on a live route, dispatch a declared action, and verify the evidence chain contains interaction ref, dispatch admission, `txnSeq / opSeq / linkId`, operation result and host render linkage or gaps.

**Acceptance Scenarios**:

1. **Given** a user interaction triggers a declared action, **When** the Agent reads the diagnosis package, **Then** the package preserves the interaction-to-dispatch-to-operation chain.
2. **Given** an interaction occurs but no declared action is admitted, **When** the Agent reads the package, **Then** the package contains an admission or linkage gap and no fabricated operation.
3. **Given** multiple attachments can match the same target, **When** no attachment is supplied, **Then** the command follows existing ambiguity law and does not merge host chains.

### User Story 3 - Export A Diagnosis Package (Priority: P1)

As an Agent, I can export one bounded canonical evidence package that is sufficient to reproduce the diagnosis reasoning without parsing browser logs or ad hoc daemon state.

**Why this priority**: The CLI becomes useful only if the Agent can carry a stable, machine-readable diagnosis artifact across shell, browser and follow-up verification.

**Independent Test**: Capture a bounded live session, export evidence, and verify the package includes owner facts, adjunct refs, profile summary refs, source/route refs when available, redaction markers and explicit gaps with owner codes.

**Acceptance Scenarios**:

1. **Given** Runtime, host and profile evidence are available, **When** evidence is exported, **Then** the package preserves each authority marker and does not inline unbounded payloads.
2. **Given** source map or module refs are missing, **When** evidence is exported, **Then** the package emits source-link gaps rather than storing guessed paths.
3. **Given** budget is exceeded, **When** evidence is exported, **Then** the package preserves degraded markers, dropped markers and safe resume refs.

### User Story 4 - Inspect Local Cost Symptoms (Priority: P2)

As a maintainer, I can ask for a bounded local profile summary that points to Runtime coordinates and host refs without becoming a profiler truth model.

**Why this priority**: Performance and memory symptoms are part of practical debugging, but deep profiler ownership would be too large and unsafe for this closure.

**Independent Test**: Start and stop a local profile summary around an admitted operation, then verify the output contains bounded summary, target/time/link refs, budget/redaction markers and no timeline facts or raw samples as Runtime truth.

**Acceptance Scenarios**:

1. **Given** profile capture is authorized, **When** an Agent reads profile summary, **Then** the summary links to target/time/link refs and stays local-only.
2. **Given** profile capture is not authorized or unavailable, **When** an Agent requests profile summary, **Then** the CLI returns a structured profile gap.
3. **Given** profile capture is disabled, **When** normal live inspect runs, **Then** no profile sample buffer is allocated.

### User Story 5 - Preserve Production And Disabled Cost (Priority: P1)

As a runtime maintainer, I can prove the new diagnosis closure adds no production bundle reachability and no disabled-path allocation.

**Why this priority**: The terminal debug closure is only acceptable if it does not tax ordinary business runtime.

**Independent Test**: Run bundle reachability and disabled-overhead proofs over `examples/logix-react` and targeted runtime tests, then verify dev/live/debug carriers are absent from production builds and disabled closure allocates no capture buffers or fanout.

**Acceptance Scenarios**:

1. **Given** a business project imports normal Logix React APIs, **When** it builds production output, **Then** dev/live/debug carrier modules are not reachable.
2. **Given** host evidence and profile capture are disabled, **When** runtime actions and renders occur, **Then** no host capture buffer, render fanout, profile sample buffer or transaction-window IO appears.
3. **Given** cleanup runs for a target or attachment, **When** the target is gone, **Then** host adjunct buffers, profile summaries and retained refs are released or degraded with lifecycle gaps.

## Edge Cases

- Host route is unknown, source map is absent, or source refs are redacted.
- Selector fingerprint is missing, ambiguous, broad, dynamic or not admitted by core selector law.
- Render boundary exists but no Runtime target coordinate can be proven.
- Host evidence arrives after Runtime owner window has dropped the referenced operation.
- Interaction occurs outside declared action admission.
- Profile summary is over budget, unauthorized, unavailable or crosses target boundaries.
- Multiple browser tabs, attachments or route instances expose the same Runtime target.
- Daemon retained segment exists but source chain is discontinuous.
- Canonical evidence export has partial owner facts but complete host gaps.

## Requirements

### Functional Requirements

- **FR-001**: 183 MUST provide a terminal Agent diagnosis package route over existing live evidence and canonical evidence mechanisms.
- **FR-002**: The system MUST admit React host adjunct evidence only as a subordinate sidecar over Runtime-owned coordinates.
- **FR-003**: Host attachment evidence MUST link target coordinate, attachment id, host locator, route or route gap, React root or host gap and Program host ref when available.
- **FR-004**: Selector subscription evidence MUST reference core selector route identity, selector fingerprint or diagnostic label; it MUST NOT create a second selector authority.
- **FR-005**: Render boundary evidence MUST reference host render boundary refs, subscription refs and source/module refs when available; missing refs MUST become structured gaps.
- **FR-006**: Interaction linkage evidence MUST connect host interaction refs, dispatch admission, `txnSeq`, `opSeq` and `linkId` when the chain can be proven.
- **FR-007**: The system MUST preserve Runtime owner facts as the authority whenever host, interaction or profile sidecars conflict with Runtime facts.
- **FR-008**: Local profile summary MUST be bounded, local-only, authorized and linked only through target/time/link refs.
- **FR-009**: CLI public output MUST stay within existing live artifact kinds and canonical evidence package refs unless SSoT 15 is explicitly reopened.
- **FR-010**: Canonical evidence export MUST preserve owner markers, adjunct markers, profile markers, disagreements, redaction, degraded and structured gap codes.
- **FR-011**: Runtime Inspect Coverage Harness MUST be updated to classify React host adjunct evidence and local profile owner rows after 183 implementation.
- **FR-012**: Existing Logix core, React host, daemon and CLI internals MUST yield to deterministic coordinates, bounded memory, lifecycle cleanup and no-second-truth constraints where they conflict with this spec.

### Non-Functional Requirements

- **NFR-001**: Disabled diagnosis closure MUST allocate no host capture buffer, render subscription fanout, profile sample buffer, projection cache or retained owner data.
- **NFR-002**: All admitted buffers MUST be target-scoped or attachment-scoped, size-capped, TTL-bound where retained, redaction-preserving and lifecycle-cleaned.
- **NFR-003**: Transaction windows MUST contain no IO, daemon wait, source-map lookup, AST parse, profile drain or evidence export work.
- **NFR-004**: Evidence payloads MUST be slim, serializable, deterministic and comparable; large details MUST become artifact refs, summaries, truncation or degraded markers.
- **NFR-005**: Production business bundles MUST not include dev/live/debug carrier modules through normal public imports.
- **NFR-006**: Public CLI grammar MUST not grow a second debug namespace; any new flag or command must prove it is smaller than reusing existing `logix live ...` routes.
- **NFR-007**: Source, module and route refs MUST be explicit refs with redaction and confidence markers; they MUST NOT become Runtime facts.
- **NFR-008**: The implementation MUST include focused proof for disabled allocations, bounded output, cleanup behavior, production reachability and multi-attachment ambiguity.

### Key Entities

- **Diagnosis Evidence Package**: Canonical evidence package assembled for Agent debugging, containing owner fact refs, adjunct refs, profile refs and structured gaps.
- **Host Attachment Evidence**: Adjunct sidecar linking Runtime target and attachment to route, React root, Program host and host locator refs.
- **Selector Subscription Evidence**: Adjunct sidecar linking core selector identity to host subscription refs.
- **Render Boundary Evidence**: Adjunct sidecar linking render observations to subscription, source/module and Runtime coordinate refs.
- **Interaction Linkage Evidence**: Provenance sidecar linking user/host interaction to dispatch admission and Runtime operation coordinates.
- **Local Profile Summary**: Bounded local cost symptom summary linked by target/time/link refs.
- **Diagnosis Gap**: Owner-coded structured gap, disagreement, redaction or degraded marker explaining why a chain cannot be proven.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A live demo diagnosis package can answer Runtime action -> field fact -> selector subscription -> render boundary or produce explicit gaps for each missing link.
- **SC-002**: A live interaction can be linked to declared action dispatch and `txnSeq / opSeq / linkId` without parsing human logs.
- **SC-003**: Canonical evidence export preserves Runtime owner facts, host adjunct refs, profile refs and gap markers without introducing new public host artifact kinds.
- **SC-004**: Disabled diagnosis closure proof shows zero host capture buffers, render fanout, profile sample buffers, projection caches and transaction-window IO.
- **SC-005**: Production bundle reachability proof over `examples/logix-react` shows normal business imports do not pull dev/live/debug carrier modules.
- **SC-006**: Runtime Inspect Coverage Harness no longer lists React host adjunct evidence or local profiler owner as unresolved deferred rows after implementation; each row is owner-backed, adjunct-backed, profile-backed or explicitly rejected with a stable reason.
- **SC-007**: Multi-attachment, missing source, ambiguous selector, over-budget profile and host/runtime disagreement cases all return deterministic structured gaps.
- **SC-008**: No CLI, daemon, browser adapter, Workbench, React host sidecar, profiler summary or canonical evidence export becomes owner of Runtime truth.

## Planning Notes

Planning may split 183 into implementation tasks by owner lane, but must keep one terminal closure gate:

- core coordinate and owner-law pressure
- React host adjunct capture and cleanup
- interaction linkage
- local profile summary
- canonical evidence packaging
- CLI transport preservation
- proof harness and SSoT writeback

If any lane requires exact DTO, wire shape, persistence format, authorization rule or performance measurement method, create a narrow `implementation-details/*contract*.md` and backport owner or quality-gate decisions to this spec or the relevant SSoT.
