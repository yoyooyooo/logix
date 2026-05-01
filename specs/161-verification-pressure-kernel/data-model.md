# Data Model: Verification Pressure Kernel

## StaticPressure

Represents a check-stage machine finding that does not require runtime startup.

Fields:

- `kind`: blueprint, import, declaration, sourceRef or pass-boundary
- `ownerCoordinate`: Program or declaration coordinate
- `focusRef`: optional coordinate projected into `VerificationControlPlaneFocusRef`
- `errorCode`: stable machine code
- `summary`: short human-readable explanation
- `sourceArtifactRef`: optional derived source artifact locator/ref/digest

Validation:

- Must not require runtime boot evidence.
- Must not embed raw source truth.
- Must map into `VerificationControlPlaneReport` without a second report object.

## DerivedSourceArtifact

Represents source/package/typecheck provenance consumed by `runtime.check`.

Fields:

- `sourceRef`: stable locator or owner-defined reference
- `digest`: declaration or source provenance digest
- `producer`: source, package, typecheck or CLI source producer
- `artifactRef`: optional external artifact locator

Validation:

- Cannot become declaration truth.
- Must be treated as provenance and pressure input only.
- Must be stable enough for repeatability proof.

## DependencyCausePressure

Represents startup dependency failure cause.

Fields:

- `kind`: service, config, Program import, child dependency or provider source
- `phase`: check, startup boot or startup close
- `ownerCoordinate`: Program/module/import owner
- `providerSource`: Program capabilities, runtime overlay, internal harness or future host layer
- `childIdentity`: optional imported child identity
- `focusRef`: repair coordinate
- `errorCode`: stable machine code

Validation:

- Must not require free-text parsing.
- Must distinguish missing config from invalid config.
- Must distinguish parent import slot from child dependency failure.

## LifecycleDualSummary

Represents boot and close failure visibility in one trial report.

Fields:

- `primaryFailure`: boot or startup failure summary
- `closeSummary`: optional close failure summary
- `artifactOutputKeys`: related artifacts using `artifacts[].outputKey`
- `phase`: startup boot or close

Validation:

- Close summary must not replace primary failure.
- Artifact links must use `artifacts[].outputKey`.

## CompareAdmissibility

Represents the compare input gate.

Fields:

- `declarationDigest`
- `scenarioPlanDigest`
- `evidenceSummaryDigest`
- `environmentFingerprint`
- `result`: admissible or inconclusive
- `errorCode`: stable machine code for mismatch

Validation:

- Mismatch must return admissibility result.
- Full raw evidence must not become default compare axis.

## RepeatabilityEnvelope

Represents fields used to prove repeated runs are stable.

Fields:

- `ignoredFields`: runId and allowed path/outDir differences
- `stableFields`: verdict, errorCode, artifact keys, digest, next stage
- `normalizedInputDigest`
- `reportDigest`

Validation:

- Ignored field list must remain narrow.
- Stable fields must not change for same normalized input.
