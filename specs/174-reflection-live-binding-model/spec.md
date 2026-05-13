# Feature Spec: Reflection Live Binding Model

**Feature Branch**: `174-reflection-live-binding-model`
**Created**: 2026-05-04
**Status**: Done

## Role

174 implements the reflection live binding foundation required by [Runtime Inspect Evidence Contract](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md).

It closes the P0 residual risk where a canonical live target can still return `missing-live-manifest-binding`, and it makes dispatch admission cite the same binding fact that inspect actions exposes.

174 is not a new inspect umbrella. It owns only static-to-live binding authority and the projections derived from that authority.

## Imported Authority

- Owner law: [../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md](../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md)
- Implementation umbrella: [../173-runtime-inspect-evidence-end-state/spec.md](../173-runtime-inspect-evidence-end-state/spec.md)
- Reflection baseline: [../167-runtime-reflection-manifest/spec.md](../167-runtime-reflection-manifest/spec.md)
- 172 route closure ledger: [../172-agent-first-runtime-inspect-data-plane/parity-matrix.md](../172-agent-first-runtime-inspect-data-plane/parity-matrix.md)

## Target

Every live target that claims reflected actions must carry a binding fact with:

- `LiveManifestBindingRef`
- manifest digest authority
- schema digest authority
- validator availability authority
- dispatch admission binding header

Action list, payload summary and static summary are derived projections. CLI, daemon, browser adapter, Workbench and canonical evidence may transport or package these projections, but they cannot create the binding authority.

## Current Implementation That Must Yield

The current implementation already has useful pieces, but they are not yet the terminal owner model.

`packages/logix-core/src/internal/reflection/staticLiveBinding.ts` is the closest owner-side pure check. It must become the single binding decision path for reflected live operations.

`packages/logix-core/src/internal/runtime/core/liveInspect.ts` currently defines `LiveManifestBindingRef` and can build action inspect artifacts. It may keep projection helpers, but binding authority must be produced by the reflection live binding path, not by defaulting to `manifest:unknown` as if that were a matched proof.

`packages/logix-core/src/internal/runtime/core/liveAdmission.ts` currently has a fallback path using `currentManifestDigest` and `declaredActions`. That fallback cannot count as terminal owner-backed dispatch proof. Reflected dispatch must either use the binding owner path or deny with a no-mutation evidence gap.

`packages/logix-react/src/internal/dev/liveBrowserAdapter.ts` currently reads `resolved.reflectionManifest` and maps it into action output. That is a producer bridge, not the owner. The adapter must call the owner-side binding path and transport the resulting projection.

React dev lifecycle binding and direct runtime binding must converge on the same target coordinate and manifest binding fact. They cannot keep separate action/payload schemas.

## Binding Outcome Taxonomy

`matched` means the live target resolved to an owner-approved manifest digest, the requested action exists when an action is requested, and schema or validator availability is known.

`missing` means the target exists but no live manifest binding is currently available for that target. This is a per-target transient gap. It is not a structural success state for canonical dogfood targets.

`mismatch` means the request cites a manifest digest, action tag or schema digest that conflicts with the owner-approved binding.

`stale` means the request cites a manifest digest that is known to have been superseded for the target lifecycle.

`unknown` means the target cannot be resolved or the runtime cannot prove enough binding facts. Unknown binding cannot authorize mutation.

Validator unavailable is not a separate binding outcome. It is a dispatch admission denial or degraded projection attached to a binding header.

## Derived Projections

Actions projection derives only from the bound manifest action list. Each action row may expose:

- action tag
- payload kind
- bounded payload summary
- schema digest or schema ref
- validator availability
- row binding status derived from the binding fact

Payload summary projection derives only from reflection manifest payload metadata. If a schema is unknown or over budget, the output must carry a structured gap or degraded marker instead of fabricating a schema.

Static summary projection may include manifest digest, program digest, module digest, action manifest artifact ref and validator digest. It cannot include runtime event history, current state, field graph semantics or host render facts.

## Dispatch Admission Law

For `dispatch.declaredAction`, admission must be no-mutation by default until binding proof passes.

No-mutation denial cases include:

- unauthorized target
- missing binding
- unknown binding
- stale manifest digest
- manifest digest mismatch
- unknown action
- action unavailable in the bound manifest
- payload schema digest mismatch
- validator unavailable when validation is required
- payload validation failure once payload validation is available in this path

Admission success must attach the same binding header that inspect actions would expose for the target. Completed and failed operation facets may cite that header, but they do not become reflection owners.

Non-dispatch inspect reads remain owned by their respective inspect owners. 174 does not make reflection a gate for state reads, event windows, fields, timelines, React host facts or profile facts.

## Runtime And Carrier Boundaries

Reflection live binding owns static binding authority.

Runtime-live owns target coordinate, operation envelope and eventual operation ledger.

Field-runtime owns field semantics.

React host may supply lifecycle context and source context, but it does not own Runtime facts or reflection schema authority.

Browser adapter, daemon and CLI are carriers. They may queue, request, transport and display binding projections, but they cannot create action schema or validator truth.

Canonical evidence packages owner facts and gaps. It cannot synthesize a missing binding into a matched binding.

## Gap Rules

`missing-live-manifest-binding` remains valid only as a target-scoped transient gap.

The canonical dogfood target cannot close 174 while still returning `missing-live-manifest-binding` for `inspect.actions`.

Every binding gap must include:

- owner `reflection`
- target coordinate when known
- stable gap code
- reopen bar
- degraded marker when output is partial

## Budget, Redaction And Disabled Overhead

Binding checks must be pure, bounded and serializable.

When the browser adapter or lifecycle carrier is not installed, no background binding collection is allowed.

When live inspect is disabled, dispatch/run/check/trial hot paths must not allocate action projection payloads.

Manifest and schema payloads must stay behind artifact refs or bounded summaries. Redaction and degraded markers from the reflection owner must be preserved by carriers and evidence export.

## Performance And Memory Hardening

174 treats binding cost as part of the kernel contract.

Action lookup must be indexed or otherwise bounded for large manifests. The terminal implementation should avoid repeated linear scans of manifest action arrays on inspect or dispatch paths.

The binding owner may keep a manifest-scoped action index, but that index must be:

- derived from owner-approved manifest data
- keyed by manifest digest or target binding ref
- built lazily or at lifecycle binding time, not during disabled hot paths
- reused by both inspect projection and dispatch admission
- cleaned when the target binding is removed or the manifest digest is superseded

Projection payloads must be generated on demand. `inspect.actions` may allocate bounded action rows only for an explicit inspect request. Dispatch admission may allocate only the minimal binding header and denial reason needed for the operation result.

Validator checks must remain split:

- validator availability is a cheap binding/admission fact
- full payload validation runs only when explicitly required by the debug dispatch path
- unavailable or over-budget validation returns denial or degraded output instead of running expensive fallback analysis

Carrier memory must remain lease-bound. Browser adapter, daemon and CLI may cache target offers or pending responses, but they must not retain full reflection manifests, schema payloads or action projections as long-lived truth.

The 174 implementation cannot exit until disabled-allocation, large-manifest lookup and lifecycle cleanup are covered by focused tests.

## User Scenarios & Testing

### User Story 1 - Inspect Actions Returns Matched Binding (Priority: P1)

As an Agent inspecting a canonical live target, I can request actions and receive a matched binding with reflected action payload facts.

**Independent Test**: Start the dogfood React target, request `inspect.actions`, and verify the artifact contains a `LiveManifestBindingRef` with `bindingStatus: matched`, the manifest digest, and action rows derived from the same manifest.

### User Story 2 - Dispatch Uses The Same Binding (Priority: P1)

As an Agent dispatching a declared action, I can rely on the same binding header used by inspect actions, so stale or unknown actions are denied before mutation.

**Independent Test**: Dispatch a known action and verify admission attaches the matched binding header. Dispatch an unknown action, stale digest, mismatched schema digest and missing-validator request, and verify each returns a no-mutation denial.

### User Story 3 - Missing Binding Is Transient And Target-Scoped (Priority: P2)

As a maintainer, I can distinguish a temporary target binding gap from a structural closure claim.

**Independent Test**: Simulate a target without a reflection manifest and verify `missing-live-manifest-binding` is emitted as a reflection-owned structured gap with target coordinate and reopen bar; the canonical target test still fails until the binding is matched.

### User Story 4 - Carriers Do Not Invent Reflection Truth (Priority: P2)

As a CLI or browser adapter implementer, I can transport action and binding projections without defining private action schema or validator authority.

**Independent Test**: Browser adapter and CLI live inspect tests verify action payload summaries come from owner binding projection, not adapter-local schema construction.

## Functional Requirements

- **FR-001**: The system MUST expose one owner-side live binding decision path for reflected live targets.
- **FR-002**: The binding decision path MUST emit `matched`, `missing`, `mismatch`, `stale` and `unknown` outcomes.
- **FR-003**: `inspect.actions` MUST derive action list, payload summary and validator availability from the bound reflection manifest.
- **FR-004**: The canonical dogfood target MUST return a matched binding for `inspect.actions`.
- **FR-005**: `missing-live-manifest-binding` MUST remain a reflection-owned, target-scoped transient gap.
- **FR-006**: `dispatch.declaredAction` MUST deny mutation when binding is missing, unknown, stale or mismatched.
- **FR-007**: `dispatch.declaredAction` MUST deny mutation for unknown actions and unavailable action contracts.
- **FR-008**: `dispatch.declaredAction` MUST deny mutation for payload schema digest mismatch.
- **FR-009**: `dispatch.declaredAction` MUST deny mutation when validator availability is required but unavailable.
- **FR-010**: Successful dispatch admission MUST attach the same binding header that `inspect.actions` exposes for the target.
- **FR-011**: Browser adapter and CLI MUST NOT invent payload schema, action authority or validator authority.
- **FR-012**: Canonical evidence export MUST package binding refs and gaps without redefining reflection truth.
- **FR-013**: Binding gaps MUST include owner, code, target when known and reopen bar.
- **FR-014**: Binding projections MUST be bounded, serializable and preserve degraded/redaction markers.
- **FR-015**: Action lookup for binding decisions MUST be indexed or otherwise bounded for large manifests.
- **FR-016**: Binding indexes and projection caches MUST be scoped to manifest or target lifecycle and cleaned when superseded.
- **FR-017**: Dispatch admission MUST allocate only minimal binding headers and denial metadata on the debug mutation path.
- **FR-018**: Full payload validation MUST run only when explicitly required by debug dispatch admission, not during ordinary inspect or disabled runtime paths.

## Non-Functional Requirements

- **NFR-001**: Binding checks MUST be pure and must not perform IO in transaction windows.
- **NFR-002**: Disabled live inspect MUST not allocate action projection payloads or start background binding collection.
- **NFR-003**: Target coordinates MUST reuse runtime-live target identity instead of creating random identifiers.
- **NFR-004**: Binding output MUST be stable enough for snapshot comparison.
- **NFR-005**: Public surface sweep MUST show no new public reflection root or runtime inspect root.
- **NFR-006**: Large-manifest inspect and dispatch paths MUST avoid repeated linear action scans.
- **NFR-007**: Binding indexes and projection caches MUST have explicit cleanup tests.
- **NFR-008**: Carrier-side memory MUST stay lease-bound and must not retain full manifest or schema payloads as authority.

## Key Entities

- **LiveManifestBindingRef**: Stable reference from a live target to reflection manifest authority.
- **StaticLiveBindingHeader**: Admission-facing binding header for a requested operation.
- **StaticLiveBindingDecision**: Pure owner-side decision result with outcome, denial reason and optional degraded markers.
- **ActionProjection**: Derived action row list for `inspect.actions`.
- **BindingGap**: Reflection-owned structured gap for missing, unknown, stale or mismatched binding facts.
- **DispatchAdmissionBindingHeader**: Operation admission copy of the owner binding header.

## Success Criteria

- **SC-001**: Canonical live dogfood target `inspect.actions` returns `bindingStatus: matched`.
- **SC-002**: Action rows in live inspect are derived from the owner binding manifest and include payload kind, schema digest when available and validator availability.
- **SC-003**: Dispatch admission for a known action attaches the same manifest digest and action tag as inspect actions.
- **SC-004**: Unknown action, stale digest, digest mismatch, schema mismatch and missing-validator cases deny mutation.
- **SC-005**: Missing binding emits `missing-live-manifest-binding` only as a target-scoped transient gap.
- **SC-006**: Browser adapter and CLI tests contain no adapter-local payload schema authority.
- **SC-007**: Canonical evidence can package the binding ref without adding a second reflection truth source.
- **SC-008**: Text sweep finds no forbidden public reflection root, runtime inspect root, planning-only code names or second-truth language in the 174 surface.
- **SC-009**: Large-manifest binding lookup is proven indexed or bounded.
- **SC-010**: Disabled live inspect shows no action projection allocation or background binding collection.
- **SC-011**: Binding indexes and carrier projections are cleaned when target binding closes or manifest digest is superseded.

## Reopen Rules

Reopen 174 if:

- direct runtime binding and React lifecycle binding cannot share the same binding decision path
- dispatch cannot deny mutation before executing without unacceptable runtime cost
- payload schema digest comparison requires a new reflection owner law
- canonical evidence cannot package binding refs without redefining reflection truth
- large-manifest action lookup cannot stay indexed or bounded
- disabled-allocation proof requires always-on binding buffers
