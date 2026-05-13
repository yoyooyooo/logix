# Data Model: Agent Debug Closure

This document names the diagnosis entities needed by 183. It describes semantic shape and authority boundaries, not exact TypeScript definitions.

## DiagnosisEvidencePackage

Represents the Agent-facing diagnosis package assembled through canonical evidence packaging.

Contains:

- Runtime owner fact refs
- host adjunct sidecar refs
- interaction linkage refs
- local profile summary refs
- structured gaps
- disagreement markers
- redaction/degraded markers
- source/module/route refs when available

Rules:

- It is not a new evidence envelope authority.
- It preserves each source authority marker.
- It cannot synthesize missing Runtime facts.
- It cannot contain verification verdicts or repair hints as live truth.
- Large or sensitive payloads become artifact refs, bounded summaries, redaction markers or gaps.

## HostAttachmentEvidence

Adjunct sidecar linking a Runtime target to its host projection context.

Fields:

- target coordinate
- attachment id
- host locator ref
- route ref or route gap
- React root ref or host gap
- Program host ref when available
- render boundary refs when available
- lifecycle cleanup marker
- redaction/degraded markers
- structured gaps

Rules:

- The evidence is read-only relative to Runtime truth.
- Missing or ambiguous host refs become structured gaps.
- It cannot own target identity, attachment identity or Runtime ordering.
- It must be target-scoped or attachment-scoped and lifecycle-cleaned.

## SelectorSubscriptionEvidence

Adjunct sidecar linking a core selector route to host subscription evidence.

Fields:

- target coordinate
- attachment id
- selector fingerprint
- core route identity or diagnostic label
- subscription ref
- equality/projection summary when admitted by host law
- redaction/degraded markers
- structured gaps

Rules:

- React host consumes core selector law. It does not define selector authority.
- `selectorId` may be a diagnostic label, not a unique read-topic identity.
- Broad, dynamic, missing or ambiguous selector routes produce structured gaps or degraded markers.
- It cannot backfill field semantics or Runtime state.

## RenderBoundaryEvidence

Adjunct sidecar linking host render observations to Runtime coordinates.

Fields:

- target coordinate
- attachment id
- render boundary ref
- subscription ref
- observed version/tick ref when available
- source/module refs when available
- route ref when available
- redaction/degraded markers
- structured gaps

Rules:

- Render evidence only proves host projection linkage.
- It cannot own Runtime ordering, timeline completeness or verification verdicts.
- Missing source/module/route refs remain explicit gaps instead of guessed paths.
- Host/runtime conflicts produce disagreement markers with Runtime truth preserved.

## InteractionLinkageEvidence

Provenance sidecar linking host/user interaction to declared action dispatch and Runtime operation coordinates.

Fields:

- interaction ref
- target coordinate
- attachment id
- declared action tag or admission gap
- dispatch admission ref
- `txnSeq`
- `opSeq`
- `linkId`
- operation artifact ref
- redaction/degraded markers
- structured gaps

Rules:

- Interaction ref is provenance only.
- No Runtime operation may be fabricated from a host event.
- Missing declared action admission returns admission or linkage gap.
- Multi-attachment ambiguity prevents chain merge unless attachment is supplied.

## LocalProfileSummary

Bounded local diagnosis evidence for cost symptoms.

Fields:

- profile summary ref
- authorization marker
- target coordinate
- attachment id when applicable
- time range ref
- link refs such as `txnSeq / opSeq / linkId`
- budget summary
- redaction/degraded markers
- structured gaps

Rules:

- Local-only and observation-only.
- Raw samples are not Runtime facts and do not enter timeline.
- Unauthorized, unavailable, over-budget or cross-target profile requests return structured profile gaps.
- Disabled profile capture allocates no sample buffer.

## DiagnosisGap

Structured reason why a diagnosis chain cannot be proven.

Required fields:

- owner
- code
- target coordinate when known
- attachment id when relevant
- reopen bar or next proof requirement
- redaction/degraded marker when relevant

Representative owner families:

- `runtime-live`
- `field-runtime`
- `reflection`
- `react-host-adjunct`
- `interaction-linkage`
- `local-profile`
- `canonical-evidence`
- `cli-carrier`

Rules:

- Gaps are first-class evidence, not stderr text.
- Host/profile gaps do not weaken Runtime owner truth.
- Carrier gaps cannot claim fact ownership.

## DiagnosisDisagreement

Structured marker for host/profile sidecar conflicts with Runtime owner facts.

Fields:

- owner
- code
- runtime fact ref
- sidecar ref
- conflict summary
- redaction/degraded markers

Rules:

- Runtime owner fact remains authoritative.
- Disagreement marker is preserved into canonical evidence packaging.
- Disagreement cannot become a verification verdict.

