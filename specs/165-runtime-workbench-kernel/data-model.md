# Data Model: Runtime Workbench Kernel

This feature uses internal TypeScript data contracts. Names below are implementation targets, not public package contracts.

## RuntimeWorkbenchAuthorityBundle

Top-level input to the projection kernel.

Fields:

- `truthInputs`: readonly array of `RuntimeWorkbenchTruthInput`.
- `contextRefs`: optional readonly array of `RuntimeWorkbenchContextRef`.
- `selectionHints`: optional readonly array of `RuntimeWorkbenchSelectionHint`.

Validation rules:

- At least one of the arrays may be empty; an empty bundle produces an empty projection index.
- Truth derivation reads only `truthInputs`.
- `contextRefs` can create digest mismatch or missing-context gaps.
- `selectionHints` can only be forwarded to host adapters and never affect projection truth.

## RuntimeWorkbenchTruthInput

Authority-owned input.

Variants:

- `run-result`: bounded `Runtime.run` result projection.
- `control-plane-report`: `VerificationControlPlaneReport`.
- `evidence-package`: canonical evidence package.
- `artifact-ref`: control-plane or evidence artifact ref.
- `debug-event-batch`: slim runtime debug events with stable runtime coordinates.

Validation rules:

- Unknown values are rejected or represented by evidence gap.
- Run result input must not pass `ControlPlane.isVerificationControlPlaneReport`.
- Control-plane report input must pass `ControlPlane.isVerificationControlPlaneReport`.
- Debug event inputs without runtime coordinate cannot create diagnostic findings.

## RuntimeWorkbenchContextRef

Host-owned contextual locator.

Variants:

- `source-snapshot`: project id, digest, optional file spans.
- `source-locator`: locator string plus provenance.
- `package-identity`: package/example id.
- `imported-artifact-locator`: artifact locator without output key.

Validation rules:

- Context refs cannot create control-plane findings.
- Source span requires digest or owner-provided coordinate.
- Raw locators can only create drilldown locators or evidence gaps.

## RuntimeWorkbenchSelectionHint

Hint-only selection input.

Variants:

- selected session hint.
- selected finding hint.
- selected artifact hint.
- imported DVTools selection manifest.

Validation rules:

- Selection hints cannot affect id, existence, summary, severity or authority of projection nodes.
- Selection hint artifact keys must be validated against evidence/report artifact keys by host adapters before being used for initial focus.

## RuntimeWorkbenchProjectionIndex

Internal output DTO.

Fields:

- `sessions`: readonly array of `RuntimeWorkbenchSessionProjection`.
- `indexes`: optional lookup indexes for host convenience.

Validation rules:

- `sessions` is the only semantic root.
- Optional indexes are caches, not root lanes.
- Every node has `authorityRef` or `derivedFrom`.
- No selected state is stored in the index.

## RuntimeWorkbenchSessionProjection

Authority-backed interpretation window.

Fields:

- `id`: derived stable id.
- `authorityRef`: input authority reference.
- `inputKind`: run, check, trial, compare, evidence or debug.
- `status`: copied or derived from authority input.
- `sourceDigest`: optional digest.
- `findingRefs`: child finding ids.
- `artifactRefs`: child artifact ids or output keys.
- `drilldownRefs`: child drilldown ids.
- `gapRefs`: child gap ids.

Validation rules:

- Id is derived from authority refs and stable coordinates.
- Session cannot carry selected state.
- Session cannot be created from selection hint alone.

## RuntimeWorkbenchFindingProjection

Authority-backed finding projection.

Fields:

- `id`: derived stable id.
- `class`: `control-plane-finding`, `run-failure-facet`, `evidence-gap`, or `degradation-notice`.
- `authorityRef` or `derivedFrom`.
- `summary`: bounded projection of authority input.
- `severity`: copied from authority input or fixed gap/degradation table.
- `focusRef`: optional owner-provided focusRef.
- `artifactOutputKeys`: related artifact output keys.
- `repairMirror`: optional read-only mirror of `repairHints` or `nextRecommendedStage`.

Validation rules:

- No custom report code namespace.
- No custom repair action namespace.
- No stage upgrade or repair priority invented by the kernel.
- Debug events can only produce degradation notices or gaps unless tied to evidence/debug authority and stable coordinate.

## RuntimeWorkbenchArtifactProjection

Artifact attachment.

Fields:

- `id`: derived stable id.
- `authorityRef` or `derivedFrom`.
- `artifactOutputKey`: optional owner key.
- `artifactRef`: optional locator.
- `kind`: report/evidence/run/debug/source.
- `sourceRefs`: readonly source projection refs.
- `preview`: optional bounded preview payload or locator.

Validation rules:

- Use `artifacts[].outputKey` when present.
- Raw locator cannot become output key.
- Evidence package artifact keys remain in evidence namespace.
- Over-budget payload becomes bounded preview plus gap.

## RuntimeWorkbenchSourceProjection

Locator with provenance.

Fields:

- `id`: derived stable id.
- `authorityRef` or `derivedFrom`.
- `focusRef`: optional pass-through focusRef.
- `sourceDigest`: optional digest.
- `path`: optional source path.
- `span`: optional line/column span.
- `provenance`: source snapshot, artifact, report, evidence or debug.

Validation rules:

- Source projection is not source truth.
- Missing digest or provenance creates evidence gap.
- Stack traces and raw logs cannot become canonical source spans.

## RuntimeWorkbenchEvidenceGap

First-class gap node.

Fields:

- `id`: derived stable id.
- `code`: fixed gap code.
- `owner`: session, finding, artifact, source or bundle.
- `authorityRef` or `derivedFrom`.
- `summary`: bounded explanation.

Initial gap code set:

- `missing-focus-ref`
- `missing-artifact-output-key`
- `missing-source-digest`
- `digest-mismatch`
- `raw-locator-without-owner`
- `debug-event-without-stable-coordinate`
- `over-budget-evidence`
- `preview-only-host-error`

Validation rules:

- Gap code set is bounded.
- Gap severity table is fixed and cannot become a second diagnostic priority system.

## Host Adapter View State

Host adapters may store view state outside the projection index.

Allowed host state:

- selected session/finding/artifact
- expanded panels
- selected result/diagnostics/console/trace/snapshot tab
- active source file
- editor cursor and local editor viewport
- source edits
- preview lifecycle
- route state and project id resolution state
- preview viewport/theme controls
- CLI output format choices

Forbidden host state:

- replacement report truth
- replacement evidence truth
- replacement source truth
- replacement finding authority
- replacement artifact key namespace
