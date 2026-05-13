# Data Model: React Host Adjunct Evidence Closure

This file names the stable coordination objects for 188. It is not a database model and does not own exact host evidence wire schemas.

## Host Adjunct Evidence

**Purpose**: React host context that supplements runtime owner facts.

**Fields**:

- `targetCoordinate`: runtime target coordinate
- `attachmentId`: host or browser attachment identity
- `artifactRef`: canonical evidence or harness artifact ref
- `authorityClass`: adjunct, local-only, gap, degraded or disagreement
- `redactionMarkers`: redaction and degraded markers
- `ownerFactRefs`: runtime owner facts this evidence supplements

**Validation Rules**:

- cannot override runtime owner facts
- cannot contain verification verdicts, repair hints, next-stage scheduling or compare truth
- must be bounded and serializable

## Interaction Linkage

**Purpose**: Approved refs connecting host event or render context to runtime operation facts.

**Fields**:

- `targetCoordinate`: runtime target coordinate
- `attachmentId`: attachment identity
- `txnSeq`: runtime transaction sequence
- `opSeq`: runtime operation sequence
- `linkId`: operation linkage id
- `hostEventRef`: host-local event or render boundary ref
- `artifactRef`: evidence or harness artifact ref

**Validation Rules**:

- links only to admitted runtime operations
- ambiguous or missing linkage returns gap
- host event cannot fabricate runtime operation facts

## Local Profile Summary

**Purpose**: Bounded local performance context for diagnosis.

**Fields**:

- `targetCoordinate`: runtime target coordinate
- `timeWindowRef`: local capture window ref
- `budget`: event, sample, byte and duration budget
- `summary`: bounded local profile summary
- `runtimeRefs`: target/time/link refs into runtime owner facts
- `redactionMarkers`: redaction/local-only/degraded markers

**Validation Rules**:

- local-only and non-authoritative for Runtime facts
- raw samples do not become timeline items
- denied, disabled or over-budget capture returns gap or degraded marker

## Disagreement Marker

**Purpose**: Structured output when host adjunct evidence conflicts with runtime owner facts.

**Fields**:

- `runtimeFactRef`: authoritative runtime fact ref
- `hostEvidenceRef`: conflicting host evidence ref
- `reasonCode`: stable disagreement code
- `authorityResolution`: runtime-truth-wins
- `degradedMarkers`: optional degraded/redacted markers

**Validation Rules**:

- must not convert host evidence into truth
- must preserve both refs for diagnosis
- must remain serializable and deterministic

## Host Evidence Gap

**Purpose**: Structured reason host adjunct evidence is missing, ambiguous, delayed, redacted, degraded or denied.

**Fields**:

- `code`: stable gap code
- `targetCoordinate`: target coordinate when available
- `attachmentId`: attachment identity when available
- `reasonClass`: missing, ambiguous, delayed, redacted, degraded, denied, over budget or disabled
- `reopenHint`: optional owner path for future evidence promotion

**Validation Rules**:

- no guessing or heuristic backfill
- gaps can be packaged as canonical evidence or harness output
- gap cannot schedule verification stages

## Disabled Capture Gate

**Purpose**: Proof boundary that host adjunct collection imposes no disabled cost.

**Fields**:

- `enabled`: false for disabled proof
- `captureBufferAllocated`: expected false
- `extraSubscriptionFanout`: expected false
- `transactionWindowIo`: expected false
- `cleanupWitness`: target/host lifecycle cleanup proof ref

**Validation Rules**:

- disabled mode must allocate no host capture buffer
- disabled mode must add no render subscription fanout
- host collection must not perform IO inside runtime transaction windows
