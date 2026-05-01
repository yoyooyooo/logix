# Data Model: CLI Verification Transport

## CommandResult

Represents CLI stdout transport envelope.

Fields:

- `schemaVersion`
- `kind`
- `runId`
- `command`
- `ok`
- `inputCoordinate`
- `artifacts`
- `primaryReportOutputKey`
- `error`

Validation:

- Must not own machine report truth.
- `primaryReportOutputKey` must reference `artifacts[].outputKey`.
- Error result must still expose a report artifact or a deterministic transport failure.

## CommandInputCoordinate

Represents exact rerun and stage upgrade coordinate.

Fields:

- `command`
- `entry`
- `evidence`
- `selection`
- `trialMode`
- `scenario`
- `beforeReport`
- `afterReport`
- `beforeEvidence`
- `afterEvidence`
- future argv snapshot or digest when needed

Validation:

- Must include only inputs used by the command.
- Large or sensitive data must be referenced by artifact ref or digest.
- Same normalized coordinate must support repeatability checks.

## ArtifactOutput

Represents CLI artifact transport item.

Fields:

- `outputKey`
- `kind`
- `schemaVersion`
- `ok`
- `file`
- `inline`
- `truncated`
- `budgetBytes`
- `actualBytes`
- `digest`
- `reasonCodes`
- `error`

Validation:

- `outputKey` is the only artifact key namespace.
- Ordering must be deterministic.
- Inline payload may be truncated only with metadata and fallback where required.

## CanonicalEvidenceInput

Represents canonical evidence package consumed by CLI.

Fields:

- `ref`
- `kind`
- `packageId`
- `artifactOutputKeys`

Validation:

- Must be canonical evidence package.
- Must not become CLI-specific evidence envelope.

## SelectionManifestInput

Represents DVTools selection hint.

Fields:

- `ref`
- `kind`
- `selectionId`
- `sessionId`
- `findingId`
- `artifactOutputKey`
- `focusRef`
- `authority`

Validation:

- `authority` must remain `hint-only`.
- `artifactOutputKey` must exist in canonical evidence package artifacts when evidence is present.
- Must not alter evidence truth or report truth.

## TransportGateFailure

Represents pre-control-plane failure.

Fields:

- `code`
- `message`
- `command`
- `inputCoordinate`
- `primaryReportOutputKey`

Validation:

- Must not create a fourth runtime stage.
- Must not set `nextRecommendedStage` for usage/input failures.

## ClosureProofPack

Represents end-to-end Agent repair closure.

Fields:

- `beforeCommandResult`
- `beforeReport`
- `repairEditRef`
- `rerunCoordinate`
- `afterCommandResult`
- `afterReport`
- `compareCommandResult`

Validation:

- Must be reproducible from artifact refs and inputCoordinate.
- Must cover Program assembly, source/declaration and dependency failure families.
