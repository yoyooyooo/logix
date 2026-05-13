# Data Model: Runtime Timeline Continuation And Evidence Segment

## TimelineCursorResumeCertificate

Represents an opaque resume token used by CLI consumers.

Fields:

- `schemaVersion`
- `targetKey`
- `attachmentId?`
- `queryFingerprint`
- `runtimeResumeWatermark`
- `coverageEndWatermark`
- `completenessAtIssue`
- `locatorHint?`

Rules:

- The token is public only as an opaque string.
- `locatorHint` is disposable and non-semantic.
- Ordering and comparison derive only from Runtime watermark fields.
- Token mismatch or expiry produces structured gap.

## TimelineQueryFingerprint

Represents same-query identity for cursor continuation.

Fields:

- `targetKey`
- `attachmentId?`
- `fieldFilter?`
- `projectionSchemaVersion`
- `redactionPolicyDigest`
- `projectionMode`

Rules:

- `projectionMode` starts with `timeline-default` and `timeline-field-filtered`.
- `limit` is not part of the fingerprint.
- lease budget and request byte budget are not part of the fingerprint unless a future projection mode changes item semantics.

## EvidenceLease

Represents explicit permission to retain Runtime owner facts beyond request delivery.

Fields:

- `leaseId`
- `workspace`
- `attachmentId`
- `target`
- `purpose`
- `budget`
- `redactionPolicy`
- `retentionPolicy`
- `consumerIdentity`
- `createdAt?` as metadata only

Allowed purposes:

- `export-evidence`
- `workbench-session`
- `qa-recording`
- `maintenance-debug`

Rules:

- Ordinary timeline reads do not create lease.
- Lease drain must not block Runtime transaction windows.
- Lease drain can copy only bounded owner facts and refs.

## DaemonRetainedOwnerSegment

Represents daemon retention over Runtime-owned facts.

Fields:

- `segmentId`
- `target`
- `attachmentId`
- `startWatermark`
- `endWatermark`
- `ownerEventIds`
- `boundedEventProjections`
- `artifactRefs`
- `digests`
- `gaps`
- `redacted`
- `degraded`
- `retention`
- `leaseProvenance`

Rules:

- Does not own ordering or completeness.
- Does not store source-chain indexes, work-session history or QA replay steps as core truth.
- Must obey TTL, size cap, redaction and workspace partition.

## TimelineSourceSegment

Represents source material handed to timeline projection.

Fields:

- `sourceKind`: `runtime-head` or `daemon-retained-segment`
- `target`
- `attachmentId?`
- `startWatermark`
- `endWatermark`
- `completeness`
- `gaps`
- `dropped`
- `degraded`
- `redacted`
- `retainedSegmentRef?`

Rules:

- Merge is allowed only for comparable, continuous source segment chains.
- Segment ordering cannot use daemon write time, wall clock, row id, request id or locator hint.

## SafeResumeBoundary

Represents where a consumer can safely resume after a partial or failed continuation.

Fields:

- `target`
- `attachmentId?`
- `resumeWatermark?`
- `reason`
- `gaps`

Rules:

- Present when continuation cannot be fully proven but a safe future cursor can be provided.
- Must preserve owner-coded gap reasons.
