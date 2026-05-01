# Data Model: Kernel Selector Route Contract

This document describes the internal contract entities needed by `169`. Names are planning vocabulary unless later frozen by owner SSoT or implementation.

## Selector Input

Represents a public read input consumed by `useSelector(handle, selector, equalityFn?)`.

Attributes:

- `kind`: core-owned helper, domain-owned primitive, expert function, or internal object residue
- `label`: optional diagnostic label
- `declaredReads`: optional declared path list
- `equalitySemantics`: object identity, shallow struct, custom, or unknown
- `projectionShape`: scalar, path, struct, domain primitive, dynamic, or unknown

Rules:

- Public docs teach core-owned helpers and domain primitives first.
- Function selector is expert-only.
- No public no-arg host read is represented as a valid public selector input.

## Selector Precision Record

Core-owned internal classification for a host-visible read.

Attributes:

- `diagnosticLabel`
- `selectorFingerprint`
- `selectorIdLabel`
- `normalizedReadIds`
- `equalityKind`
- `precisionQuality`: exact, broad-root, broad-state, dynamic, debug, or unknown
- `routeDecision`
- `fallbackReason`
- `pathAuthorityVersion`
- `debugOrResilienceMarker`

Rules:

- Every host-visible read must have a record before React chooses route.
- Exact precision is required for normal read-topic subscription.
- Broad, dynamic, unknown, and unsafe debug precision reject under dev/test policy when host projection is affected.

## Route Decision

Core-owned internal decision consumed by React host.

Attributes:

- `kind`: exact subscription, reject, or internal resilience
- `failureCode`
- `repairHint`
- `diagnosticPayload`
- `selectorFingerprint`

Rules:

- React host consumes this decision and does not recompute broad or dynamic eligibility.
- Internal resilience requires explicit internal marker and diagnostic visibility.
- Rejected reads do not silently fall back to broad module subscription.

## Selector Fingerprint

Stable identity for selector topic and graph entry matching.

Attributes:

- `staticShapeDigest`
- `readsDigest`
- `equalityDigest`
- `projectionOrOperatorDigest`
- `pathAuthorityDigestOrEpoch`

Rules:

- `selectorId` is a label only.
- Same label with different fingerprint must not reuse topic or graph entry.
- Fingerprint changes when path authority changes.

## Path Authority

Internal authority for comparing read paths and dirty paths.

Attributes:

- `digestOrEpoch`
- `pathIdMap`
- `pathKind`
- `schemaAvailability`
- `normalizationRules`

Rules:

- Read and dirty paths normalize through this authority.
- Missing authority is a precision failure when host projection depends on overlap.
- Broad classification may use path kind and schema availability.

## Dirty Precision Record

Write-side precision classification for a transaction or commit.

Attributes:

- `dirtyPathIds`
- `dirtyAll`
- `dirtyAllReason`
- `sourceMark`
- `precisionQuality`
- `fallbackKind`

Rules:

- Dirty-all requires a structured reason.
- Inferred dirty information must be source-marked.
- Unsafe coarse root and evaluate-all fallback reject or surface strict failure under dev/test policy when host projection is affected.

## Selector-Quality Artifact

Evidence consumed by the verification control plane.

Attributes:

- `stage`: static, startup, scenario, host-harness
- `producer`
- `selectorFingerprint`
- `precisionQuality`
- `routeDecision`
- `fallbackKind`
- `repairHint`
- `sourceRef`

Rules:

- `runtime.check` consumes only static/build artifacts.
- Startup consumes selector policy wiring and startup artifacts.
- Host projection precision enters only through explicit host evidence, scenario, or repo-internal harness artifact.

## Public Surface Witness

Proof that public material no longer teaches removed shapes.

Attributes:

- `surface`: SSoT, README, skill, example, type surface, package export
- `forbiddenShape`
- `result`: pass or fail
- `evidenceRef`

Rules:

- No public success witness may include no-arg host read.
- Internal or negative examples must be clearly classified.

## State Transitions

```text
selector input
  -> core precision record
  -> core route decision
  -> React host subscription or rejection
  -> dirty/read overlap on commit
  -> diagnostics and selector-quality artifact when needed
```

Strict failure transition:

```text
broad/dynamic/unknown/unsafe read
  -> reject under dev/test
  -> structured diagnostic
  -> repair hint
```

Dirty fallback transition:

```text
dirty-all / missing path authority / unsafe coarse root / evaluate-all
  -> strict failure under dev/test when host projection is affected
  -> structured diagnostic
  -> repair hint
```
