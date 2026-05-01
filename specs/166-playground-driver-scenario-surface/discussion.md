# Discussion: 166 Playground Workbench Risk Ledger

**Status**: Revised after plan-optimality-loop Round 1  
**Date**: 2026-04-29  
**Authority refs**: [spec](./spec.md), [plan](./plan.md), [tasks](./tasks.md), [product SSoT](../../docs/ssot/runtime/17-playground-product-workbench.md), [167 discussion](../167-runtime-reflection-manifest/discussion.md)

## Review Result

Round 1 did not pass `implementation-ready`.

Adopted direction:

- 166 must close Runtime Proof First before UI pressure can count as product closure.
- The legacy wide execution adapter concept is too broad as a planning object. The execution path should be described as `ProjectSnapshotRuntimeInvoker` plus strictly bounded output classes.
- Action authority must come from 167 minimum manifest. 166 may define UI view models, not manifest-like DTOs.
- Async results need a commit predicate, not just a stale warning.
- Driver and Scenario stay quarantined as product metadata until execution authority, reflection authority and projection classification gates pass.

## Gate Matrix

These gates are planning pressure gates. They do not replace the spec success criteria; they prevent success criteria from being used across layers.

| Gate | Name | Owner | Closure rule | Cannot be satisfied by |
| --- | --- | --- | --- | --- |
| G0 | Runtime Proof | 166 | Current `ProjectSnapshot` executes through real `Runtime.run`, `Runtime.openProgram`, `Runtime.check` and `Runtime.trial`; source edit changes Runtime output; production shell has no fake runner or local-counter parsing | UI polish, visual pressure, source-string simulation |
| G1 | Execution Boundary | 166 | `ProjectSnapshotRuntimeInvoker` only returns `runtimeOutput`, `controlPlaneReport`, `transportFailure` or `evidenceGap` | action manifest parsing, payload validation, operation vocabulary, fabricated state |
| G2 | Reflection Authority | 167A consumed by 166 | Action Workbench consumes 167 minimum manifest when available; regex fallback is labelled `fallback-source-regex` and emits evidence gap | 166 private manifest DTO, source regex as primary authority |
| G3 | Lifecycle Commit | 166 | Async output can mutate current UI state only if `(projectId, revision, sessionId, opSeq)` matches current session root | stale completion, worker order, prior snapshot logs |
| G4 | Projection Classification | 166 plus 167 bridge | Outputs are classified as runtime output, control-plane report, debug evidence, context ref, host view state or evidence gap | generic `convertible` containers |
| G5 | Driver/Scenario Quarantine | 166 | Driver can run after G0/G2/G3; Scenario can run after Driver output classification is closed | treating declarations or `expect` as Runtime truth |
| G6 | UI Pressure | 166 | Visual pressure cases use deterministic fixtures and prove scroll/resizer/tab behavior | Runtime authority proof |

## Adopted Closure Laws

### L166-001 Runtime Proof First

166 implementation order must treat G0 as the first closure. Monaco, resizable layout, Driver, Scenario and visual pressure can proceed in parallel as work, but they do not close 166 until G0 has passed.

Minimum proof:

- Run result changes after source edit through `Runtime.run`.
- Dispatch state changes after source edit through `Runtime.openProgram`.
- Check and Trial use current snapshot and existing Runtime faces.
- Production UI does not import `runLocalProgramSnapshot`, `createDefaultProgramSessionRunner` or local-counter source parsing.

### L166-002 ProjectSnapshotRuntimeInvoker Boundary

The broad legacy execution adapter concept is replaced for planning purposes by `ProjectSnapshotRuntimeInvoker`.

Allowed responsibilities:

- build or load executable module from current `ProjectSnapshot`
- call existing Runtime faces
- attach host provenance such as project id, revision and session id
- classify compile, load or transport failure

Allowed outputs:

- `runtimeOutput`
- `controlPlaneReport`
- `transportFailure`
- `evidenceGap`

Forbidden responsibilities:

- action authority
- payload schema or validation issue shape
- operation coordinate vocabulary
- Program state fabrication
- session reducer ownership
- Driver or Scenario semantics

### L166-003 Lifecycle Commit Predicate

Every async result from run, check, trial, dispatch, driver or scenario step must carry a session-root coordinate:

```text
projectId + revision + sessionId + opSeq
```

Only a result matching the current session root may update current state, result, logs, trace or diagnostics. Non-matching completions can only become bounded stale lifecycle log or evidence gap. Source edit and reset close the previous session root.

### L166-004 Action Panel View Model Only

166 may define an `ActionPanelViewModel` for UI selection, button state and editor state.

166 must not define a private manifest-like DTO containing action authority, payload kind, payload summary, digest or validator availability. Those fields come from 167 minimum manifest or are absent with `fallback-source-regex` evidence gap.

### L166-005 Driver/Scenario Product Quarantine

Driver and Scenario remain product metadata and are staged after runtime proof:

1. Reflected actions via 167A manifest.
2. Curated Driver after G0/G2/G3 pass.
3. Scenario playback after Driver output classification is explicit.

Driver declarations, Scenario declarations and Scenario `expect` are never Runtime Workbench Kernel truth. Scenario `expect` failure is product failure.

### L166-006 UI Pressure Does Not Prove Runtime

Visual pressure fixtures prove layout and product usability only. They must never be used as substitute proof for Runtime execution authority, reflection authority or lifecycle correctness.

## Risk Index

| Risk | Authority ref | Unresolved question | Closure gate | Owner |
| --- | --- | --- | --- | --- |
| R166-001 executable snapshot | TD-003A, L166-001 | What is the first production bundling path that can prove source edit changes real Runtime output? | G0 | 166 |
| R166-002 broad adapter | L166-002 | Do all production call sites use bounded invoker outputs? | G1 | 166 |
| R166-003 stale async result | L166-003 | Can old dispatch/run/check/trial result mutate current view state? | G3 | 166 |
| R166-004 regex dependency window | L166-004, 167A | Is regex impossible as primary authority when manifest exists? | G2 | 166 plus 167A |
| R166-005 payload UI drift | 167 Payload Ownership Law | Does 166 only parse JSON text and render 167 issues? | G2/G4 | 166 plus 167 |
| R166-006 bridge ambiguity | G4, 167 bridge matrix | Are Driver/Scenario outputs classified without becoming truth? | G4/G5 | 166 plus 167 |
| R166-007 UI pressure false closure | L166-006 | Are visual fixtures isolated from Runtime proof gates? | G6 | 166 |

## Applied Planning Patches

These adopted Round 1 deltas have been reflected into `spec.md`, `plan.md`, `tasks.md`, `data-model.md`, `contracts/README.md`, checklist entries and the product SSoT where applicable:

- Rename or redefine legacy execution adapter references as the narrower `ProjectSnapshotRuntimeInvoker`, or keep old filenames only as fixture/test implementation detail with the narrower contract.
- Add G0 Runtime Proof First tasks before UI pressure closure.
- Add lifecycle commit predicate tests for stale run, dispatch and reset/source edit.
- Replace any 166 manifest-like terminal shape with `ActionPanelViewModel` consuming 167 DTO.
- Split Driver and Scenario tasks behind G0/G2/G3/G4 gates.
- Add deterministic UI pressure fixture tasks, but keep them under G6 only.

## Residual Review Questions

Round 2 should only check:

1. Did the adopted laws remove the wide adapter ambiguity?
2. Did the gate matrix prevent UI pressure from substituting runtime proof?
3. Did Driver/Scenario quarantine reduce product metadata leakage risk?
4. Did 166 stop defining manifest-like authority?
