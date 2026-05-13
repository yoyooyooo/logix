# Data Model: Repair Intent Contract

This file names the stable coordination objects for 185. It is not a database model and does not own exact report schema. Field names must mirror `docs/ssot/runtime/09-verification-control-plane.md`; this file must not define a second report or focus taxonomy.

## Repair Hint

**Purpose**: Structured repair suggestion owned by `VerificationControlPlaneReport`.

**Fields**:

- `code`: stable hint code
- `canAutoRetry`: whether rerunning after repair is meaningful
- `upgradeToStage`: hint-local explanatory stage suggestion, if present
- `focusRef`: stable focus reference or explicit null
- `relatedArtifactOutputKeys`: artifact keys referenced by the hint
- `reason`: optional explanatory prose
- `suggestedAction`: optional explanatory prose

**Validation Rules**:

- must not be required to parse `reason` or `suggestedAction` for routing
- must not override top-level `nextRecommendedStage`
- all artifact output keys must exist in the same report
- must not contain raw source, AST, runtime handles or domain payloads

**Relationships**:

- joins to Owner Fact
- consumed by Repair Intent Path

## Owner Fact

**Purpose**: Machine fact that gives authority to a repair hint.

**Sources**:

- report `findings`
- report `dependencyCauses`
- admissibility details
- report `artifacts`

**Fields**:

- `ownerCoordinate`: declaration, dependency, source, evidence or compare coordinate
- `causeKind`: static, dependency, canonical evidence or compare family
- `phase`: check, trial startup or compare when applicable
- `providerSource`: service/config/import provider information when applicable
- `childIdentity`: imported child Program identity when applicable

**Validation Rules**:

- owner coordinate must be stable or explicitly unavailable
- no invented coordinates when localization is not possible
- carrier output cannot become an owner fact by itself

## Focus Reference

**Purpose**: Stable pointer to the repair target using the `VerificationControlPlaneFocusRef` keys from `09`.

**Fields**:

- `declSliceId`: optional declaration slice id
- `reasonSlotId`: optional opaque reason slot id
- `sourceRef`: optional derived source or evidence reference

**Validation Rules**:

- must be serializable and deterministic
- must not embed raw payloads
- unavailable focus is represented by an empty or null `focusRef`; do not invent replacement keys
- `scenarioStepId` is a reserved `09` focus key, but this offline family must not emit it as positive proof or require scenario repair routing

## Repair Intent Path

**Purpose**: Machine-readable route from report verdict to next repair target.

**Fields**:

- `verdict`: report verdict
- `nextRecommendedStage`: top-level scheduling authority
- `repairHintCode`: selected hint code
- `ownerFactRef`: reference to the owner fact supporting the hint
- `artifactBacklinks`: artifact refs needed to inspect evidence or source context

**Validation Rules**:

- can be followed without parsing prose
- scheduling uses report-level `nextRecommendedStage`
- selection manifest and canonical evidence remain provenance inputs, not report truth
- live output can only become relevant after export into canonical evidence and verification consumption

## Artifact Backlink

**Purpose**: Stable join from repair hint to report artifacts.

**Fields**:

- `outputKey`: key in `artifacts[].outputKey`
- `kind`: report, canonical evidence, source, selection, compare input or lifecycle summary
- `digest`: optional artifact digest
- `file`: optional file-backed artifact path
- `inline`: optional bounded inline payload

**Validation Rules**:

- every referenced output key must exist
- file-backed artifact is preferred over truncated inline preview
- raw evidence payloads are not copied into hints

## Scheduling Authority

**Purpose**: The report-level field that tells Agents what verification stage to run next.

**Fields**:

- `nextRecommendedStage`: nullable top-level stage recommendation
- `currentStage`: check, trial startup or compare
- `passBoundary`: current-stage pass explanation when relevant

**Validation Rules**:

- hint-local `upgradeToStage` is not authoritative
- live outputs have no scheduling authority
- entry gate scheduling remains owned by 184/162; this lane does not introduce entry scheduling
