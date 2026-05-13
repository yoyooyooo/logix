# Feature Specification: CLI Evidence Frontier

**Feature Branch**: `181-cli-evidence-frontier`
**Created**: 2026-05-05
**Status**: Done
**Input**: User request to capture the highest-value post-180 Agent First CLI evidence gaps in a discussion artifact for later `$plan-optimality-loop` review.

## Current Role

181 is a closed planning discussion container, not an implementation spec.

The initial candidate set was promoted into [docs/proposals/agent-first-cli-evidence-frontier-contract.md](../../docs/proposals/agent-first-cli-evidence-frontier-contract.md), reviewed through `$plan-optimality-loop`, and consumed into authority artifacts:

- production bundle proof -> [Harness And Proof Assets Standard](../../docs/standards/harness-and-proof-assets-standard.md)
- React host adjunct evidence -> [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md) first, with host corollary in [React Host Projection Boundary](../../docs/ssot/runtime/10-react-host-projection-boundary.md)
- timeline and evidence pressure gate -> 180 / SSoT 18 hardening
- local profiler owner -> deferred SSoT 18 backlog
- terminal Agent debugging closure -> [183 Agent Debug Closure](../183-agent-debug-closure/spec.md), which admits React host adjunct evidence and local profile summary only as subordinate diagnosis sidecars

No implementation may start from 181. It remains only as the closure record for the post-180 frontier promotion pass.

## Context

172 closed the initial runtime inspect data plane gaps. 173 to 180 then promoted the owner-backed runtime evidence backbone: reflection binding, runtime-live ledger, field runtime inspect, timeline projection, summary projection, debug source bridge, cursor continuation, evidence lease and retained owner segments.

After 180, the remaining gaps are not CLI grammar completion work. They are frontier questions about how far live evidence can expand without harming production bundles, adding unbounded runtime cost, or creating a second truth source.

## Scope

### In Scope

- Preserve the closure result of the ranked candidate review.
- Point future readers to the consumed proposal、review ledger and authority writebacks.
- Keep 181 out of implementation routing.

### Out of Scope

- No runtime, CLI, daemon, React host or profiler implementation.
- No new public CLI command contract.
- No further SSoT 18 rewrite from 181 after adopted decisions have been written back.
- No plan, tasks or implementation-details contract until review closure.
- No claim that React host evidence or profiler owner is promoted as standalone Runtime owner.

## Imported Authority

- Runtime inspect owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- CLI command surface and live envelope: [../../docs/ssot/runtime/15-cli-agent-first-control-plane.md](../../docs/ssot/runtime/15-cli-agent-first-control-plane.md)
- Inspect evidence umbrella: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- Runtime-live ledger: [../175-runtime-live-operation-ledger/spec.md](../175-runtime-live-operation-ledger/spec.md)
- Field runtime inspect: [../176-field-runtime-inspect-model/spec.md](../176-field-runtime-inspect-model/spec.md)
- Timeline projection: [../177-runtime-inspect-timeline-projection/spec.md](../177-runtime-inspect-timeline-projection/spec.md)
- Timeline continuation and evidence segment: [../180-runtime-timeline-continuation-and-evidence-segment/spec.md](../180-runtime-timeline-continuation-and-evidence-segment/spec.md)

## Closure & Guardrails

### Closure Contract

181 is closed because `$plan-optimality-loop` adopted the `SSoT 18 first` candidate:

- production bundle proof was written to the repo-wide safety gate
- React host evidence stayed deferred as SSoT 18 adjunct admission law, not a standalone owner spec
- timeline/evidence pressure stayed in 180 / SSoT 18
- local profiler remained deferred
- 183 later became the admitted subordinate successor for terminal Agent diagnosis closure without reviving 182 or creating a standalone host owner

### Must Cut

- Do not let CLI, daemon, browser adapter, Workbench or canonical evidence become owners of runtime truth.
- Do not merge React host evidence into runtime-live ledger truth.
- Do not merge profiler samples into runtime facts.
- Do not let dev-only, live inspect, debug carrier or playground code enter production business bundles.
- Do not solve pressure by making ordinary timeline reads silently create retention leases.

### Reopen Bar

The ranked candidate set may be reopened if review evidence shows that a different order or grouping improves at least one of:

- production safety
- proof strength
- owner clarity
- public surface size
- future headroom

## User Scenarios & Testing

### User Story 1 - Review The Frontier Plan (Priority: P1)

As the project owner, I need one stable document that captures the remaining high-value CLI evidence gaps so multiple reviewers can challenge the same object.

**Why this priority**: Without a stable review object, later reviewer loops can drift between CLI grammar, runtime evidence, React host and profiler concerns.

**Independent Test**: A reviewer can read this spec and the consumed proposal to identify each candidate disposition and writeback target without reading this chat.

**Acceptance Scenarios**:

1. **Given** the 181 directory exists, **When** a reader checks the review outcome, **Then** the consumed proposal and ledger are linked as the review record.
2. **Given** a candidate is adopted, **When** the review closes, **Then** the adopted decision has a clear target artifact for writeback.

### User Story 2 - Keep Unfrozen Ideas Out Of Authority (Priority: P1)

As a future implementer, I need to know which ideas are still discussion-only so I do not treat unresolved frontier candidates as approved runtime law.

**Why this priority**: The remaining gaps touch production bundle safety and runtime truth ownership.

**Independent Test**: `spec.md` and `discussion.md` explicitly state that no implementation starts until review adoption and authority writeback.

**Acceptance Scenarios**:

1. **Given** a candidate proposes new evidence ownership, **When** it is not admitted, **Then** it remains a deferred or rejected authority row instead of becoming a leaf implementation spec.
2. **Given** a candidate is rejected, **When** review closes, **Then** it records a reopen bar instead of leaving ambiguous backlog text.

### Edge Cases

- A reviewer may propose splitting the candidates into multiple specs; 181 must allow that without becoming a permanent umbrella truth source.
- A reviewer may prove production bundle proof should be a standard rather than a spec; 181 must allow writeback to standards.
- A reviewer may reject profiler promotion for now; 181 must preserve the reason and reopen evidence instead of silently dropping it.

## Requirements

### Functional Requirements

- **FR-001**: 181 MUST record the closed disposition of the post-180 Agent First CLI evidence frontier.
- **FR-002**: 181 MUST point to the consumed proposal and review ledger instead of acting as authority.
- **FR-003**: 181 MUST identify production bundle proof, React host evidence, timeline/evidence pressure gate and local profiler owner as the reviewed candidate set.
- **FR-004**: 181 MUST preserve the initial priority order as review input, not as final authority.
- **FR-005**: 181 MUST define that adopted decisions have been written back to concrete SSoT pages or standards instead of remaining in `discussion.md`.

### Non-Functional Requirements

- **NFR-001**: 181 MUST not add implementation details, pseudo-code or command grammar beyond the minimum required for review framing.
- **NFR-002**: 181 MUST preserve the SSoT 18 rule that CLI, daemon, browser adapter, Workbench and canonical evidence are not runtime fact owners.
- **NFR-003**: 181 MUST treat production bundle proof as a hard boundary concern, not a nice-to-have validation.
- **NFR-004**: 181 MUST keep reviewable claims concise enough for multiple reviewers to challenge without requiring chat context.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `$plan-optimality-loop` closure is recorded in [../../docs/review-plan/runs/2026-05-05-agent-first-cli-evidence-frontier.md](../../docs/review-plan/runs/2026-05-05-agent-first-cli-evidence-frontier.md).
- **SC-002**: Every candidate in the initial set has a final disposition and writeback target.
- **SC-003**: No section in 181 claims React host evidence or local profiler owner is promoted as standalone Runtime owner.
- **SC-004**: No section in 181 makes CLI, daemon, browser adapter, Workbench or canonical evidence a runtime truth owner.
