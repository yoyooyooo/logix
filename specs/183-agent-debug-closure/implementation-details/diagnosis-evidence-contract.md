# Diagnosis Evidence Contract

This contract freezes the narrow cross-lane semantics needed by 183. It is not a second SSoT. Owner and public-surface decisions must remain in [../spec.md](../spec.md), [SSoT 18](../../../docs/ssot/runtime/18-runtime-inspect-evidence-contract.md), [SSoT 10](../../../docs/ssot/runtime/10-react-host-projection-boundary.md) and [SSoT 15](../../../docs/ssot/runtime/15-cli-agent-first-control-plane.md).

## Public Output Contract

183 may expose diagnosis material only through these existing routes:

- `LiveInspectArtifact`
- `LiveProfileSummary`
- `CanonicalEvidencePackageRef`
- `EvidenceGap`
- repo-internal harness output

Forbidden public outputs:

- `HostEvidence`
- `HostAdjunctEvidence`
- a new `logix debug` namespace
- a second canonical evidence envelope
- a live output that embeds `VerificationControlPlaneReport` as a success verdict

If implementation proves a new public artifact kind is required, stop and reopen SSoT 18 plus SSoT 15 before code continues.

## Authority Markers

Every diagnosis payload or ref must preserve an authority marker:

- Runtime facts: `runtime-live`, `field-runtime`, `reflection`, `timeline-projection`, `summary-projection`
- Host adjunct: `react-host-adjunct`
- Interaction linkage: `interaction-linkage`
- Local profile summary: `local-profile`
- Export package: `canonical-evidence`
- Carrier failure: `cli-carrier` or `browser-carrier`

Carrier authorities can only describe transport or preservation gaps. They cannot own Runtime facts.

## Link Vocabulary

Allowed linkage keys:

- target coordinate
- attachment id
- `txnSeq`
- `opSeq`
- `linkId`
- artifact ref
- source ref
- selector fingerprint
- core selector route identity
- render boundary ref
- host locator ref
- profile summary ref
- route ref with confidence/redaction marker

Forbidden linkage keys as truth:

- component display name
- DOM text
- CSS selector
- wall-clock ordering
- daemon request id
- source path guessed without explicit source ref
- raw profiler sample id

Forbidden keys may appear only as redacted provenance hints or repo-internal harness notes, never as Runtime truth or public comparison identity.

## Host Adjunct Payload Boundary

Host adjunct sidecars may contain:

- target coordinate and attachment id
- host locator ref
- route ref or route gap
- React root ref or host gap
- selector fingerprint / core route identity / diagnostic label
- subscription ref
- render boundary ref
- observed render/version ref when admitted by host law
- source/module refs when available
- redaction/degraded markers
- structured host gaps
- disagreement markers

Host adjunct sidecars must not contain:

- Runtime ordering truth
- timeline completeness
- field semantic payload truth
- verification verdict
- repair hint
- selector authority independent from SSoT 10
- guessed component/source paths

## Interaction Linkage Boundary

Interaction linkage sidecars may contain:

- interaction ref
- target coordinate and attachment id
- declared action tag
- dispatch admission ref or admission gap
- `txnSeq / opSeq / linkId`
- operation artifact ref
- render linkage ref or gap
- redaction/degraded markers

Rules:

- Host interaction is provenance only.
- Declared action admission is required before linkage can claim a Runtime operation coordinate.
- Missing admission, stale manifest, denied mutation, ambiguous attachment or absent operation returns a structured gap.
- No sidecar may fabricate operation facts from a UI event.

## Local Profile Summary Boundary

Profile summary may contain:

- profile summary ref
- authorization marker
- target/time/link refs
- bounded cost summary
- budget and dropped markers
- redaction/degraded markers
- structured profile gaps

Profile summary must not contain:

- raw sample stream as Runtime truth
- timeline item ordering
- verification verdict
- repair hint
- cross-target merged samples without explicit degraded marker

Authorization states:

- `authorized`
- `denied`
- `unavailable`
- `over-budget`
- `cross-target`

Only `authorized` can produce a profile summary. Other states produce structured gaps.

## Gap And Disagreement Codes

Required stable gap families:

- `missing-host-attachment`
- `ambiguous-host-attachment`
- `missing-selector-fingerprint`
- `ambiguous-selector-subscription`
- `missing-render-boundary`
- `missing-interaction-link`
- `missing-dispatch-admission`
- `profile-unauthorized`
- `profile-unavailable`
- `profile-over-budget`
- `profile-cross-target`
- `source-ref-unavailable`
- `host-runtime-disagreement`

Each gap must include:

- owner
- code
- target coordinate when known
- attachment id when relevant
- reopen bar or next proof requirement
- redaction/degraded marker when applicable

Disagreement markers must include:

- Runtime fact ref
- sidecar ref
- conflict summary
- statement that Runtime fact remains authoritative

## Disabled-Overhead Contract

When host adjunct capture and profile capture are disabled:

- no host capture buffer is allocated
- no render subscription fanout is added
- no profile sample buffer is allocated
- no diagnosis projection cache is allocated
- no transaction-window IO occurs
- no source-map lookup or AST parse occurs
- no carrier-retained host/profile payload survives request delivery

The implementation must prove this with focused guard tests. A passing bundle test alone is not sufficient for disabled-overhead proof.

## Bounded-Memory Contract

When diagnosis capture is enabled:

- host buffers are target-scoped or attachment-scoped
- profile buffers are target-scoped or capture-scoped
- every buffer has explicit size cap and cleanup trigger
- overflow emits dropped/degraded markers or structured gaps
- daemon/browser carriers preserve owner markers and gaps without rewriting them
- cleanup follows target, attachment, provider and carrier lifecycle

## Production Bundle Contract

Normal production business imports must not reach:

- `@logixjs/react/dev/live`
- `@logixjs/react/dev/lifecycle`
- browser live adapter implementation
- lifecycle carrier implementation
- debug capture/profile carrier implementation

The proof authority remains the repo-wide live evidence safety gate in [Harness And Proof Assets Standard](../../../docs/standards/harness-and-proof-assets-standard.md). The concrete business-project witness for this wave is `examples/logix-react`.

## Canonical Evidence Packaging

Canonical evidence packaging may include:

- Runtime owner fact refs
- host adjunct refs
- profile summary refs
- interaction linkage refs
- structured gaps
- disagreement markers
- redaction/degraded markers

It must not:

- synthesize missing Runtime facts
- remove owner markers
- convert gaps into success
- include live diagnosis as verification verdict
- introduce a host evidence envelope as authority

