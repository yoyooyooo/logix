# Research: Runtime Reflection Manifest vNext

## Decision: Keep Reflection Repo-internal First

Rationale:

- Existing reflection helpers already live under `packages/logix-core/src/internal/reflection/**`.
- Playground, CLI and Devtools need stability before public API naming is worth freezing.
- Public `Logix.Reflection` would immediately become an authoring mental model, which is premature.

Alternatives considered:

- Export `Logix.Reflection` now: rejected because the manifest shape is still being pressure-tested by Playground/CLI/Devtools.
- Let each consumer own its own manifest: rejected because it creates parallel authorities.

## Decision: 166 Consumes Minimum Manifest Slice

Rationale:

- 166 cannot keep source regex as primary action authority.
- 166 does not need full payload validator, service graph or CLI evidence to land MVP.
- A narrow manifest slice lets Playground move forward while 167 owns terminal reflection work.

Alternatives considered:

- Block 166 until all 167 work lands: rejected because layout/session/command work can proceed earlier.
- Keep regex until 167 is done: rejected because it weakens the core Action Workbench path.

## Decision: Full Manifest Includes Program-level And Module-level Data

Rationale:

- Current `ModuleManifest` is module-centered.
- Playground and CLI need Program-level context: root module, imports/services, initial state shape, run/check/trial availability.
- Program-level manifest can carry module manifests without rewriting module reflection.

Alternatives considered:

- Only expand `ModuleManifest`: rejected because Program assembly facts would stay scattered.
- Make manifest a control-plane report: rejected because reflection is context/evidence projection, not diagnostic verdict.

## Decision: Payload Validation Is Reflection-owned Projection

Rationale:

- UI payload input and CLI scripted dispatch both need stable validation before execution.
- Effect Schema can validate at runtime, but the exported result must be bounded and serializable.
- Unknown schema should become an evidence gap.

Alternatives considered:

- Let Playground parse payload ad hoc: rejected because CLI and Devtools would duplicate logic.
- Expose raw Effect Schema AST publicly: rejected because it leaks implementation and is not bounded.

## Decision: Observability Batch Uses Stable Runtime Coordinates

Rationale:

- Playground, CLI and Devtools all need dispatch/run/check/trial lifecycle facts.
- Stable `instanceId / txnSeq / opSeq` coordinates align with existing runtime constraints.
- Batch can be optional and near-zero overhead when diagnostics are disabled.

Alternatives considered:

- Let logs be the primary observable output: rejected because raw logs are not stable enough.
- Make observability mandatory for every dispatch: rejected because disabled diagnostics must stay cheap.

## Decision: 167 Owns Shared Interpretation, Not Playground Execution

Rationale:

- 166 must call existing Runtime faces and own browser/source transport details.
- 167 must provide the shared action/payload/operation DTOs that Playground, CLI and Devtools can all consume.
- Keeping execution transport out of 167 prevents reflection from becoming a hidden Playground runtime layer.

Alternatives considered:

- Put `ProjectSnapshot -> executable module` bundling in 167: rejected because it depends on Playground virtual files and host transport.
- Let Playground keep private operation DTOs: rejected because CLI and Devtools would drift.
- Add a public reflection root for consumers: rejected for this phase because the DTOs still need repo-internal pressure testing.

## Decision: 165 Bridge Is Adapter, Not New Truth

Rationale:

- 165 already owns session-rooted projection law.
- Reflection can feed it as truth input, context ref or evidence gap.
- Reflection must not invent findings or diagnostic verdicts.

Alternatives considered:

- Add workbench semantics directly to manifest: rejected because it mixes authority extraction and UI interpretation.
