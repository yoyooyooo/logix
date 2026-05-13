# Data Model: Live Diagnosis Evidence Closure

This file names the stable coordination objects for 187. It is not a database model and does not own exact live wire schemas.

## Live Target Coordinate

**Purpose**: Identifies a live runtime target selected from target discovery.

**Fields**:

- `runtimeId`: runtime identity
- `moduleId`: module identity
- `instanceId`: runtime instance identity
- `attachmentId`: optional host or browser attachment identity
- `targetRef`: serialized target coordinate used by CLI live tasks

**Validation Rules**:

- target-specific commands must use a coordinate discovered from actual live targets
- ambiguous or disappeared targets return structured gaps
- carriers cannot invent target facts

**Relationships**:

- input to live inspect, capture, snapshot, wait, dispatch, profile and export tasks
- linked to evidence package provenance

## Live Command Result

**Purpose**: CLI stdout envelope for `logix live <task>`.

**Fields**:

- `ok`: live transport success flag
- `command`: live task identity
- `primaryLiveOutputKey`: selected live artifact output key
- `artifacts`: live artifacts, operation facets, evidence refs or gaps
- `targetCoordinate`: target coordinate when target-specific
- `error`: structured live transport error when applicable

**Validation Rules**:

- must not contain `verdict`, `repairHints`, `nextRecommendedStage` or `primaryReportOutputKey`
- must not be consumed as `CommandResult`
- non-zero exits can still return structured live output or gap

## Live Inspect Artifact

**Purpose**: Owner-backed or gap-bearing inspect output for a live section.

**Fields**:

- `section`: state, actions, events, timeline, fields, field graph, field summary, summary or related drilldown section
- `targetCoordinate`: selected target
- `ownerFacts`: bounded owner-backed projection
- `gaps`: structured owner-coded gaps
- `artifactRefs`: referenced source, evidence, lease or retained segment refs
- `redactionMarkers`: redaction/degraded/dropped markers

**Validation Rules**:

- must derive from owner APIs and owner markers
- cannot synthesize missing runtime truth
- outputs are bounded and serializable

## Canonical Evidence Package

**Purpose**: Verification-consumable evidence export from live diagnosis material.

**Fields**:

- `evidenceRef`: canonical evidence package ref
- `sourceArtifacts`: captured live artifact refs
- `ownerMarkers`: owner fact provenance
- `gaps`: structured gaps included in evidence
- `leaseProvenance`: lease and retention provenance
- `budgetMarkers`: byte/event/retention/degraded/redaction markers

**Validation Rules**:

- packages owner facts and gaps without synthesizing missing facts
- preserves redaction, degraded, dropped and gap markers
- can be consumed by trial or compare before repair hints appear

## Evidence Gap

**Purpose**: Structured reason requested live facts or evidence are unavailable or inadmissible.

**Fields**:

- `owner`: fact owner or carrier boundary
- `code`: stable gap code
- `targetCoordinate`: target coordinate when relevant
- `reasonClass`: missing, ambiguous, expired, over budget, redacted, degraded, denied or unavailable
- `reopenHint`: optional owner route for future promotion

**Validation Rules**:

- no natural-language-only failure
- no carrier-owned fact synthesis
- gap survives canonical evidence export when relevant

## Evidence Lease

**Purpose**: Authority for retaining owner facts beyond immediate live response.

**Fields**:

- `leaseId`: stable lease reference
- `targetCoordinate`: scoped target
- `ttl`: lease lifetime
- `sizeCap`: retention size cap
- `sourceSegmentRefs`: retained owner segment refs
- `cleanupState`: active, expired, released or cleaned

**Validation Rules**:

- ordinary live timeline or inspect does not create hidden retention leases
- retained owner segments remain bounded and lifecycle-cleaned
- lease material is provenance, not daemon-owned truth
