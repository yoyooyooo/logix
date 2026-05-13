# Data Model: Entry And Declaration Authority Closure

This file names the stable coordination objects for 184. It is not a database model and does not own exact runtime or CLI schemas.

## Program Entry Coordinate

**Purpose**: Identifies the CLI-selected Program export.

**Fields**:

- `modulePath`: normalized module locator supplied by CLI input
- `exportName`: selected export name, explicit or default according to current CLI grammar
- `argvSnapshot`: command token snapshot used for rerun reconstruction
- `outRoot`: artifact output root when provided

**Validation Rules**:

- must resolve without relying on old IR toolbox routes
- must not inline source, AST or blueprint payloads
- must remain stable across normalized reruns

**Relationships**:

- input to CLI entry gate
- preserved in `CommandResult.inputCoordinate`
- referenced by entry failure and repaired runtime-stage result

## Admissible Program

**Purpose**: A Program export that can be handed to runtime verification stages.

**Fields**:

- `programIdentity`: stable Program identity or equivalent declaration coordinate
- `blueprintAuthority`: internal declaration authority proving this is not a fake Program
- `imports`: Program-only imports declared by the Program
- `declarationDigest`: digest used by static check and compare admissibility when available

**Validation Rules**:

- must be a real Program, not Module, Logic, plain object or fake `_kind` shape
- must carry runtime declaration authority
- imports must be Program entries and duplicates must be reported as declaration pressure

**Relationships**:

- accepted by `Runtime.check`
- accepted by `Runtime.trial(mode="startup")`
- optional provenance for `compare --entry`

## Declaration Finding

**Purpose**: Structured `Runtime.check` finding for static declaration pressure.

**Fields**:

- `code`: stable finding code
- `ownerCoordinate`: declaration owner slice or focus reference
- `sourceRef`: derived source artifact ref when source freshness is involved
- `artifactOutputKey`: report artifact key when the finding links to an artifact
- `severity`: current control-plane severity vocabulary

**Validation Rules**:

- must be emitted without runtime boot, readiness execution or dependency acquisition
- must not contain raw source, AST or internal blueprint payloads
- must be deterministic under equivalent declaration input

**Relationships**:

- can produce repair intent in 185
- can participate in before/after compare in 186

## Entry Gate Failure

**Purpose**: `162` transport-gate failure that still returns a machine-readable CLI result.

**Fields**:

- `failureCode`: stable entry failure code
- `inputCoordinate`: original Program Entry Coordinate
- `primaryReportOutputKey`: key for the primary transport error artifact when the transport gate can materialize one
- `artifacts`: artifact refs and optional inline/file-backed machine material
- `nextRecommendedStage`: always null unless a runtime owner actually ran

**Validation Rules**:

- must preserve run id, command and entry coordinate
- must not claim check/trial/compare findings when no runtime stage ran
- must not introduce `stage="entry"` or any fourth control-plane stage
- must not expose a `VerificationControlPlaneReport`, stage verdict, repair truth or scheduling authority
- must not depend on human log parsing

**Relationships**:

- consumed by 186 exact-rerun planning as transport failure evidence
- rerun after repair can become an accepted runtime-stage result

## Primary Machine Artifact

**Purpose**: The machine artifact selected by `primaryReportOutputKey`.

**Fields**:

- `outputKey`: stable artifact key
- `inline`: optional bounded inline payload
- `file`: optional file fallback path
- `digest`: artifact digest when available
- `truncated`: truncation marker when stdout budget applies

**Validation Rules**:

- selected through `artifacts[].outputKey`
- file-backed report is preferred over truncated inline preview
- keys and digest must remain stable under normalized repeatability checks
- if the artifact represents an entry gate failure, it is a `162` transport error artifact rather than a `VerificationControlPlaneReport`
