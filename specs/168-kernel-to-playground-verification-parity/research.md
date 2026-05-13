# Research: Kernel-to-Playground Verification Parity

**Date**: 2026-04-30  
**Status**: First-slice implementation evidence incorporated

## Existing Foundation

### Runtime Control Plane

Adopted facts:

- `runtime.check / runtime.trial / runtime.compare` are the verification control-plane stage family.
- `Runtime.run` is a result face and does not return `VerificationControlPlaneReport`.
- `runtime.check` is a static gate and does not run startup validation.
- `runtime.trial(mode="startup")` owns startup, dependency, configuration, boot and close validation.
- `runtime.trial(mode="scenario")` remains future capability until core scenario executor lands.

Implication for 168:

- Playground must keep Run Result and Diagnostics shape-separated.
- Run failure still needs visible failure projection, otherwise users see false success.

### CLI Control Plane

Adopted facts:

- CLI public command surface is fixed to `check / trial / compare`.
- `CommandResult` is stdout transport only.
- `VerificationControlPlaneReport` remains report authority.
- CLI compare already owns before/after report route through control-plane compare.
- Scenario mode currently returns structured failure when executor is absent.

Implication for 168:

- Playground should become comparable to CLI in report/artifact authority, without copying `CommandResult` as product state.
- Playground compare needs captured report refs equivalent to CLI before/after refs.

### Runtime Workbench Kernel

Adopted facts:

- Workbench Kernel is `AuthorityBundle -> ProjectionIndex`.
- It consumes truthInputs, contextRefs and selectionHints.
- It does not execute Program, generate report or own UI state.
- Findings must derive from control-plane report, run result projection, evidence gap or degradation notice.

Implication for 168:

- Full reflection and dependency information should become authority bundle inputs.
- Playground summary/projection code should not own diagnostic truth.

### Playground Product Workbench

Adopted facts:

- Playground default identity is Logic-first runtime workbench.
- `ProjectSnapshot` is the execution coordinate.
- Run, Check and Trial use real Runtime faces.
- Diagnostics summary/detail can only show owner-backed control-plane reports.
- Visual pressure rows prove layout capacity only.

Implication for 168:

- Existing pressure demos need an authority audit.
- Diagnostics demos must use real build/check/trial/run/validation failures.

### Runtime Reflection Manifest

Adopted facts:

- Reflection remains repo-internal.
- 167A gives Playground minimum Program action manifest.
- 167B owns full Program manifest, payload validation depth, operation event law and workbench bridge hardening.
- Cross-tool facts must be classified as authority, contextRef, debugEvidence, hostViewState or evidenceGap.

Implication for 168:

- 168 should not define new reflection authority.
- It should pressure 167B to include dependency closure and payload validator carrier if adopted.

## Gap Analysis

### Source Review Notes

Observed source facts:

- `packages/logix-core/src/Runtime.ts` already derives `dependencyCauses`, dependency findings and dependency repair hints from trial reports.
- `packages/logix-core/src/internal/workbench/findings.ts` already has `run-failure-facet`.
- `packages/logix-core/src/internal/workbench/authority.ts` currently derives a control-plane report authority id from stage, mode, errorCode/verdict and summary digest. Summary text is too unstable for terminal identity.
- `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts` already emits `runtimeOutput`, `controlPlaneReport`, `transportFailure` and `evidenceGap` through `PlaygroundRuntimeEvidenceEnvelope`.
- `packages/logix-playground/src/internal/runner/runProjection.ts` currently projects `undefined` to `null` with no lossiness metadata.
- `packages/logix-playground/src/internal/summary/workbenchProjection.ts` currently can project compile failure and preview-only host error as `run-result` failed truth inputs.
- `examples/logix-react/src/playground/projects/diagnostics/**` already has real diagnostics projects for missing service/config/import.
- `examples/logix-react/src/playground/projects/pressure/diagnostics-dense` is visual pressure and must not become diagnostics authority.

Implication:

- 168 should not invent a broad dependency closure object before exhausting `VerificationDependencyCause`.
- 168 must classify existing implementation paths and rewrite weak ones.
- The highest-value pressure is not adding more UI rows; it is forcing identity, lossiness and owner boundaries to become impossible to blur.

### G168-001: Run Failure Projection

Observed issue:

- A demo Run can return a success-looking object with `value: null` even when Trial reports a startup/dependency problem.

Required direction:

- Runtime or host runner must expose failure as a result-face failure, transport failure or evidence gap.
- Playground must not render failed execution as successful null value.
- Owner-backed Run failure should become Workbench `run-failure-facet`, not only evidence gap.
- `undefined` success must not be indistinguishable from business `null`.

### G168-002: Dependency Cause Spine

Observed issue:

- Trial can catch missing dependency at startup.
- Runtime already extracts `dependencyCauses`.
- Reflection/check cannot yet explain the full service/config/import closure before startup unless declarations already expose it.

Required direction:

- First strengthen `VerificationDependencyCause`.
- Add broader bounded dependency closure projection only if the spine cannot serve parity.
- Let Check consume only declared dependency risks.
- Keep runtime-only missing dependency authority with Trial.

### G168-003: Payload Validator Carrier

Observed issue:

- Playground can parse JSON text.
- Stable schema-backed validation issue codes are not product-owned.

Required direction:

- Reflection owns schema carrier and validation issue projection.
- Playground shows unknown schema as evidence gap.

### G168-004: Workbench Bridge Thinness

Observed issue:

- Workbench can consume report/evidence inputs, but full reflection is not yet expanded into browseable projection nodes.
- Workbench report identity can currently depend on summary text.
- Preview-only failure can currently enter a run-result truth input through Playground adapter.

Required direction:

- Expand action, payload, dependency, import, service, sourceRef and degradation nodes.
- Replace unstable ids.
- Demote preview-only host failure.

### G168-005: CLI / Playground Adapter Parity

Observed issue:

- CLI and Playground have different transport/session envelopes.
- Both should feed Workbench projection with equivalent authority bundle semantics.

Required direction:

- Define shared adapter law, not a new public protocol.

### G168-006: Scenario Trial Boundary

Observed issue:

- Playground product scenario playback exists.
- CLI scenario trial and core scenario executor are not successful control-plane route yet.

Required direction:

- Keep product playback separate.
- Implement core executor before claiming scenario trial parity.

### G168-007: Demo Authenticity

Observed issue:

- Dense diagnostics can be useful visually, but fake rows undermine trust.

Required direction:

- Split visual pressure fixtures from authority demos.
- Add multiple small real demos for different failure classes.

## Adopted Direction

- Use 168 as parity and sequencing spec.
- Treat existing implementation as evidence to challenge, not as a protected baseline.
- Keep all owner truth in existing SSoT/spec pages.
- Treat missing information as evidence gap until core owner can produce it.
- Prefer more demos over fabricated dense rows.
- First implementation slice used direct dominance audit and focused owner tests.
- `VerificationDependencyCause` is sufficient for the current dependency spine.
- Run value projection carries `valueKind / lossy / lossReasons`.
- Workbench report identity must ignore summary wording.
- Visual pressure routes must declare visual-only authority.

## Deferred Direction

The following remain deferred:

- Exact `DependencyClosureIndex` shape.
- Payload validator carrier shape.
- Playground compare capture model.
- Scenario executor minimum viable shape.
