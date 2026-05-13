# Research: Professional Logic Playground vNext

## Decision: Playground Is Logic-first By Default

Rationale:

- The primary value is proving Logix Program behavior through source, state, actions, logs, trace and diagnostics.
- UI preview adds external packager and unpublished package risks that do not help the default runtime proof.
- Documentation demos can still be useful without UI if curated drivers and scenarios provide business-level triggers.

Alternatives considered:

- Keep React preview as the default route: rejected because it keeps Sandpack/network/package resolution on the critical path.
- Maintain two equal modes: rejected for the next phase because it dilutes the runtime workbench closure.

## Decision: Session Is Auto-ready And Reset-only

Rationale:

- A Playground route is opened to run the current Program. A manual start step adds ceremony and unclear state.
- Closing a session has no product value for a static docs/example route.
- Source edits naturally invalidate old runtime state, so automatic restart is simpler and clearer.

Alternatives considered:

- Keep Start/Close controls: rejected because they expose implementation lifecycle rather than user intent.
- Keep stale warning as normal behavior: rejected because it forces manual reset after every source edit.

## Decision: Use Resizable Workbench Panels

Rationale:

- Source editing and runtime observation are both primary tasks.
- Fixed grids force either editor or runtime evidence into cramped scroll islands.
- shadcn Resizable is a wrapper over resizable panel primitives; the package should use a local wrapper or direct dependency to avoid coupling to an app-local design system.

Alternatives considered:

- Keep Tailwind grid: rejected for professional workbench behavior.
- Import shadcn components from examples/docs: rejected because package internals should not depend on consuming app component trees.

## Decision: Run / Check / Trial Must Be Shape-separated

Rationale:

- `Run` produces app-local JSON-safe result.
- `Check` and `Trial` produce verification control-plane reports.
- Mixing these shapes creates a second diagnostic truth and makes the UI harder to trust.

Alternatives considered:

- Put all outputs under one generic Result object: rejected because it hides authority differences.
- Keep command buttons that only expand placeholders: rejected because it creates false affordances.

## Decision: Reflected Actions Are Internal Dogfood, Drivers Are Docs-friendly

Rationale:

- Reflected actions prove Program runtime interactivity and help maintainers/Agents debug.
- Docs readers need business labels and payload examples, not raw action objects.
- Both can share the same session runner and output surfaces.

Alternatives considered:

- Make raw dispatch the default: rejected because it leaks internal action shape as product UX.
- Only support curated drivers: rejected because early dogfood needs action reflection before every example has driver metadata.

## Decision: Regex Action Parsing Is Temporary Fallback

Rationale:

- Current implementation uses source parsing, but it is only migration scaffolding and may be used as labelled fallback or test fixture.
- Terminal authority must come from compiled Program manifest or runtime/module reflection.
- Keeping fallback explicit prevents it from calcifying as a second parser.

Alternatives considered:

- Remove action panel until reflection is complete: rejected because it would lose current dogfood value.
- Treat regex parsing as accepted implementation: rejected because it is brittle and unaligned with runtime authority.

## Decision: 166 Consumes Real Runtime Faces For Default Execution

Rationale:

- `Runtime.run`, `Runtime.openProgram`, `Runtime.check` and `Runtime.trial` already exist as lower-layer authority.
- Playground value comes from editing source and seeing actual Program behavior, so package-local result simulation cannot be the default proof.
- `ProjectSnapshot -> executable module` and sandbox transport are Playground host concerns; action/payload/operation interpretation shared with CLI and Devtools belongs to 167.

Alternatives considered:

- Keep `runLocalProgramSnapshot` and `createDefaultProgramSessionRunner` as default path: rejected because they only prove the UI can update, not that a Program runs.
- Move Playground source bundling into 167: rejected because source graph and browser transport are product host concerns, not reflection authority.
- Add new `Runtime.playground` root: rejected because existing Runtime faces are sufficient and a new root would expand public surface.

## Decision: Scenario Playback Is Product Playback

Rationale:

- No-UI demos need a way to show async linkage, wait/settle and step outcomes.
- The step language is for docs/product playback, not business authoring.
- Expect failures can guide readers but must not rewrite compare/control-plane truth.

Alternatives considered:

- Reuse `runtime.trial(mode="scenario")` as the product scenario surface: rejected because trial has verification authority and should not absorb docs playback semantics.
- DOM event replay: rejected because it binds the product to preview technology.

## Decision: Service Source Files Are Ordinary Source Files

Rationale:

- Users and Agents should edit service behavior through normal source, not a separate mock table.
- Same snapshot revision should feed Run, Driver, Scenario, Check and Trial.
- This avoids public mock APIs and second workspace truth.

Alternatives considered:

- Add mock capabilities to Program: rejected because it pollutes Logix authoring surface.
- Add a service mock panel: rejected because it creates a second source model.

## Decision: Workbench Projection Comes From Produced Outputs

Rationale:

- 165 owns cross-host projection law.
- Playground owns product execution and host view state.
- Driver/Scenario declarations, payload schemas and source buffers are context or product metadata, not workbench truth inputs.

Alternatives considered:

- Let Playground derive private findings directly from logs: rejected because it creates a second diagnostic authority.
- Feed scenario declarations into the kernel: rejected because declarations are not runtime evidence.
