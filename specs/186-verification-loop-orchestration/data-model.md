# Data Model: Verification Loop Orchestration Contract

This file names the stable coordination objects for 186. It is not a database model and does not own exact CLI or report schemas.

186 is the family orchestrator for the `184 -> 185 -> 186` proof stack. The data model below only names loop coordination objects; entry/declaration details stay in 184 and repair intent details stay in 185.

## Command Result

**Purpose**: CLI stdout transport envelope for check, trial startup and compare.

**Fields**:

- `ok`: command transport success flag
- `command`: executed public command root and mode when relevant
- `inputCoordinate`: normalized input coordinate and argv snapshot
- `primaryReportOutputKey`: key of the primary verification report artifact for runtime-stage results, or transport error artifact for pre-control-plane gate failures
- `artifacts`: output artifacts, inline previews and file fallbacks
- `error`: structured transport error when applicable

**Validation Rules**:

- not the owner of report verdict or repair truth
- must remain machine-readable on non-zero exits when structured output is available
- must preserve enough coordinate to rerun or advance the loop

## Primary Report Artifact

**Purpose**: The runtime-stage verification report selected by `primaryReportOutputKey`.

**Fields**:

- `outputKey`: stable artifact key
- `kind`: verification report artifact family
- `inline`: optional bounded report payload
- `file`: optional report file path
- `digest`: report digest when available
- `truncated`: stdout budget marker when applicable

**Validation Rules**:

- selected only through `artifacts[].outputKey`
- file-backed artifact is preferred over truncated inline preview
- artifact key and digest are part of repeatability proof

## Rerun Coordinate

**Purpose**: Stable command input snapshot sufficient to rerun the same verification stage.

**Fields**:

- `argvSnapshot`: normalized command tokens
- `entryCoordinate`: Program entry locator
- `mode`: startup for trial, stage family for check/compare
- `evidenceRefs`: canonical evidence refs
- `selectionRefs`: selection manifest refs
- `compareRefs`: before and after report refs for compare
- `outRoot`: artifact output root when provided

**Validation Rules**:

- volatile fields such as new run id may be normalized according to existing repeatability rules
- large evidence and selection inputs remain refs
- rerun coordinate must not embed raw source, AST or live payloads

## Compare Admissibility

**Purpose**: Determines whether before/after reports can support repair closure.

**Fields**:

- `beforeReportRef`: artifact ref or file path
- `afterReportRef`: artifact ref or file path
- `declarationDigest`: comparable declaration coordinate
- `evidenceSummaryDigest`: comparable evidence summary coordinate when relevant
- `environmentFingerprint`: comparable environment coordinate
- `scenarioPlanDigest`: nullable/pass-through axis inherited from `09`; in the current offline loop proof it must be null, absent by owner contract, or equal on both sides
- `result`: closed, regression, mismatch or inconclusive
- `reasonCode`: stable mismatch or inconclusive reason

**Validation Rules**:

- mismatched coordinates return inconclusive, not pass
- compare preserves before and after refs as artifacts
- closed repair requires admissible comparable inputs
- the current offline loop must not require scenario execution or scenario proof

## Loop Stage Boundary

**Purpose**: Expresses current-stage pass/fail boundary and next stage scheduling.

**Fields**:

- `currentStage`: check, trial startup or compare
- `verdict`: report verdict for the current stage
- `passBoundary`: statement of what this stage has proven
- `nextRecommendedStage`: nullable top-level scheduling authority

**Validation Rules**:

- check pass can recommend startup trial but cannot imply startup passed
- startup trial pass marks the default offline gate complete unless compare is explicitly requested
- scenario and host deep validation are not default loop stages
