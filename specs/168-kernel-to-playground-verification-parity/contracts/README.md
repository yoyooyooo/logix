# Contracts: Kernel-to-Playground Verification Parity

**Status**: Adopted for dependency spine, Run projection lossiness, Workbench identity, reflection bridge nodes, Playground capture refs and diagnostics authority classes. These are internal planning contracts, not public API.

## Contract 1: Authority Preservation

Every fact displayed in Playground authority lanes must map to one of:

- `VerificationControlPlaneReport`
- `Runtime.run` success or failure projection
- owner-approved reflection manifest fact
- owner-approved payload validation projection
- canonical evidence artifact or evidence gap
- Workbench projection derived from the above

Forbidden:

- Playground-private diagnostics code
- visual pressure row as Runtime authority
- CLI `CommandResult` as report truth
- product scenario expect failure as compare truth
- preview-only host failure as Runtime run-result truth
- summary text as stable finding identity

## Contract 2: Run / Check / Trial Shape Separation

```text
Run
  -> Run Result or Run Failure Projection

Check
  -> VerificationControlPlaneReport(stage="check")

Trial
  -> VerificationControlPlaneReport(stage="trial", mode="startup")
```

Rules:

- Run failure can link to Trial report authority.
- Check cannot silently run Trial.
- Trial cannot return business result.
- Playground can show all three in one UI, but must preserve their source authority.
- Business `null`, business `undefined`, void return, lossy projection and run failure must remain distinguishable.

## Contract 3: CLI / Playground Workbench Adapter Parity

Both adapters must produce the same layered shape for equivalent authority:

```text
truthInputs
contextRefs
selectionHints
```

CLI adapter:

- consumes `CommandResult`
- consumes report/evidence artifacts
- emits control-plane truth inputs and artifact context refs

Playground adapter:

- consumes `ProjectSnapshot`
- consumes session captures
- emits run/check/trial truth inputs and source context refs

Selection hints never affect finding ids, severity, verdict or existence.

## Contract 3B: Reflection Bridge Expansion

Workbench bridge may project owner-approved reflection facts as `reflection-node` truth inputs:

- action nodes
- payload metadata nodes
- service and Program import dependency nodes
- missing manifest, unknown payload schema, stale manifest digest and fallback source regex evidence gaps

Rules:

- Reflection node authority comes from 167 repo-internal reflection DTOs.
- Dependency nodes reuse owner coordinates compatible with the `VerificationDependencyCause` spine.
- Payload validator availability and payload issue projection stay reflection-owned.
- Source regex remains evidence gap only.

## Contract 3A: Workbench Identity Stability

Workbench projection ids must be derived from owner coordinates:

- runId
- stage
- mode
- errorCode
- focusRef
- ownerCoordinate
- artifact outputKey
- owner-provided digest

Forbidden id inputs:

- human summary text
- UI selected tab
- current panel order
- preview-only message
- unstable stack text

Adopted first-slice proof:

- Control-plane report identity is stable across summary wording changes.
- Report ids derive from owner coordinates, stage, mode, errorCode, focusRef, artifact output key or owner digest.

## Contract 4: Diagnostics Demo Authenticity

Each diagnostics demo must declare one class:

- runtime-check-report
- runtime-trial-report
- runtime-run-failure
- reflection-manifest
- payload-validation
- workbench-evidence-gap
- visual-pressure-only
- product-scenario-output

Only the first six classes can appear in diagnostics authority lanes. `visual-pressure-only` belongs to layout pressure tests. `product-scenario-output` belongs to Scenario UI and can link to evidence, but cannot become compare truth.

## Contract 4A: Existing Implementation Dominance

Before new implementation begins, existing paths must be classified:

| Disposition | Allowed next step |
| --- | --- |
| keep | Add parity proof and use as baseline |
| rewrite-under-owner | Change owner contract or implementation before consumer work |
| demote-to-host-state | Remove from authority bundle and diagnostics lanes |
| delete | Remove after tests are adjusted |

No task may depend on an unclassified existing path.

## Contract 5: Open Contract Items

The following remain unresolved:

- dependency closure index exact shape
- check dependency finding code namespace
- adapter module name and export path
- scenario executor ownership and first slice

These items are tracked in [discussion.md](../discussion.md).

The following are closed for the first implementation slice:

- `VerificationDependencyCause` is the active dependency spine.
- Run failure carrier is result-face projection consumed by Workbench `run-failure-facet`.
- Lossy Run value projection uses `valueKind / lossy / lossReasons`.
- Reflection bridge expands manifest actions, payload metadata and dependency nodes.
- Playground Check/Trial and Run failure captures produce compare-compatible refs for report pairs.
- CLI scenario trial remains structured failure until a core-owned executor exists.
- Existing implementation disposition table is recorded in [notes/verification.md](../notes/verification.md).
