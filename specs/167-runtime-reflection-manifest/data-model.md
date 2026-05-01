# Data Model: Runtime Reflection Manifest vNext

These DTOs are repo-internal reflection contracts.

## MinimumProgramActionManifest

166-facing minimum slice.

Fields:

- `manifestVersion`
- `programId`
- `moduleId`
- `revision`
- `digest`
- `actions`

Action fields:

- `actionTag`
- `payload.kind`: `void`, `nonVoid` or `unknown`
- `payload.summary`
- `authority`: `manifest` or `runtime-reflection`

Rules:

- Repo-internal owner is `packages/logix-core/src/internal/reflection/programManifest.ts`.
- Current repo-internal consumer entry is `extractMinimumProgramActionManifest` from `@logixjs/core/repo-internal/reflection-api`.
- Source regex never produces this authority.
- Digest is stable for equivalent action manifest content.
- Unknown payload schema is allowed but explicit.

## 167A And 167B

167A immediate closure contains:

- MinimumProgramActionManifest
- CrossToolConsumptionLaw
- fallback-source-regex evidence-gap classification
- public API negative sweep

167B terminal closure contains:

- RuntimeReflectionManifest
- PayloadSchemaSummary and PayloadValidationResult depth
- RuntimeOperationEventLaw DTO and debug-ref projection
- ManifestDiff
- WorkbenchReflectionBridge
- CLI/Devtools reuse

## RuntimeReflectionManifest

Full Program-level manifest.

Fields:

- `manifestVersion`
- `programId`
- `rootModuleId`
- `rootModule`
- `modules`
- `actions`
- `initialState`
- `logicUnits`
- `effects`
- `processes`
- `imports`
- `services`
- `capabilities`
- `sourceRefs`
- `staticIrDigest`
- `budget`
- `digest`

Rules:

- Full manifest is JSON-safe or explicitly degraded.
- Module-level data can reuse existing `ModuleManifest`.
- Program-level fields are stable sorted.
- Current repo-internal consumer entry is `extractRuntimeReflectionManifest` from `@logixjs/core/repo-internal/reflection-api`.
- CLI `check` and `trial` transport this DTO as `reflectionManifest` artifact with `digest` equal to manifest digest.

## ReflectedActionDescriptor

Fields:

- `actionTag`
- `payload`
- `primaryReducer`
- `effects`
- `source`
- `authority`

Payload fields:

- `kind`
- `summary`
- `schemaDigest`
- `validatorAvailable`
- `example`
- `degraded`

## PayloadSchemaSummary

Fields:

- `kind`
- `label`
- `digest`
- `jsonShape`
- `truncated`
- `unknownReason`

Rules:

- Summary must be deterministic.
- Recursive or too-large schemas must degrade.

## PayloadValidationResult

Variants:

- `success`: parsed value
- `failure`: issues
- `unavailable`: reason/evidence gap

Issue fields:

- `path`
- `code`
- `message`

Rules:

- Messages are bounded.
- Paths are stable.
- Input is JSON-decoded unknown. Text parsing remains consumer-owned.

## RuntimeOperationEventLaw

Fields:

- `events`
- `budget`

Event variants:

- `operation.accepted`
- `operation.completed`
- `operation.failed`
- `evidence.gap`

Common event fields:

- `eventId`
- `instanceId`
- `txnSeq`
- `opSeq`
- `operationKind`: `dispatch`, `run`, `check` or `trial`
- `actionTag`
- `runId`
- `status`
- `timestampMode`: `omitted` unless a host explicitly provides stable clock context
- `attachmentRefs`
- `failure`

Rules:

- State, logs and trace are bounded attachments or refs, not separate event families.
- Event output is debug evidence, not Runtime state or verdict authority.
- Current 167B implementation provides DTO constructors and `RuntimeDebugEventRef`-style projection helpers. It does not install new default runtime hooks.

## ManifestDiff

Fields:

- `beforeDigest`
- `afterDigest`
- `changes`
- `summary`

Change classes:

- `action.added`
- `action.removed`
- `payload.changed`
- `budget.degraded`
- `manifestVersion.changed`

## WorkbenchReflectionBridge

Inputs:

- RuntimeReflectionManifest
- MinimumProgramActionManifest
- RuntimeOperationEventLaw output
- Run result
- Check/Trial report
- Source context refs

Outputs:

- `RuntimeWorkbenchAuthorityBundle.truthInputs`
- `RuntimeWorkbenchAuthorityBundle.contextRefs`
- evidence gaps for missing manifest, missing source coordinate and unknown payload schema

Rules:

- Bridge does not create diagnostic findings.
- Missing manifest or source coordinate becomes evidence gap.
- Driver/Scenario declarations cannot become authority.
- Scenario `expect` failure remains product failure.

## CrossToolConsumptionLaw

Repo-internal consumer-facing classification law for Playground, CLI and Devtools.

Classes:

- `authority`
- `contextRef`
- `debugEvidence`
- `hostViewState`
- `evidenceGap`

Rules:

- Owned by core reflection, consumed by 166 and other internal tools.
- Does not import Playground product types.
- Does not include Driver/Scenario declarations, source bundling details or UI layout state.
- Consumers may derive UI-local view models, but those view models are not shared authority.
