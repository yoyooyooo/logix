# Playground Render Fanout Selector Closure Proposal

- date: 2026-04-30
- slug: playground-render-fanout-selector-closure
- status: adopted-product-witness

## Supersession Note

Superseded for kernel selector law by [2026-04-30 Kernel Projection Dirty Evidence Terminal Contract](./2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md).

Playground remains a product witness for render fanout and region ownership. It does not own terminal rules for public React reads, selector route, selector fingerprint, dirty/read path authority, or strict precision policy.

Current authority:

- public React reads use `useSelector(handle, selector, equalityFn?)`
- public no-arg `useSelector(handle)` is outside the terminal host contract
- core selector law owns precision classification and route decision
- React host consumes core route
- selector fingerprint, including path-authority digest or epoch, owns topic identity
- dirty-side fallback and read-side broad / dynamic fallback reject under default dev/test policy when they affect host projections

## Executive Summary

Playground exposes a concrete dogfood failure: local UI interactions can make the whole workbench render because `PlaygroundShell` owns too many subscriptions and constructs every region slot. The adopted plan is a bounded fanout cutover: move reads to region owners, use existing selector carriers/static reads, narrow dirty evidence to nested paths, and prove fanout with tests.

This plan deliberately does not add `Logix.Select.*`, a new public selector builder, or a second React host read model. If the bounded fanout cutover proves that existing selector carriers and declared reads cannot support the tool, selector builder design must reopen as a separate public/internal selector admission proposal.

## Problem

- `PlaygroundShell` subscribes to nearly the whole workbench module and then constructs all layout slots on every render.
- Region state is not owned by the region that renders it.
- `inspector` and `runtimeEvidence` are currently dirtied as coarse roots, so unrelated selectors can be evaluated after narrow interactions.
- The runtime already has selector graph and read-query topic machinery, but Playground is not dogfooding it at the region boundary.
- React host diagnostics currently record useful selector traces, but Playground lacks a contract test that fails when local interactions leak into unrelated regions.

## Background / Evidence

- `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
  - lines 61 to 76 subscribe to `checkExpanded`, `trialExpanded`, `runState`, `checkState`, `trialStartupState`, `runtimeEvidence`, `programSession`, `sessionSeq`, `sessionActions`, `bottomTab`, `workspaceRevision`, `activeFile`, `layout`, and `inspector`.
  - lines 450 to 523 construct `HostCommandBar`, `FilesPanel`, `SourcePanel`, `RuntimeInspector`, and `WorkbenchBottomPanel` as slots for `ResizableWorkbench`.
- `packages/logix-playground/src/internal/layout/ResizableWorkbench.tsx`
  - accepts prebuilt `ReactNode` slots, so parent render rebuilds every region node.
- `packages/logix-playground/src/internal/state/workbenchProgram.ts`
  - `selectInspectorTab`, `setAdvancedDispatchExpanded`, `selectDriver`, `setDriverExecution`, `selectScenario`, and `setScenarioExecution` all sink `inspector`.
  - `recordRuntimeEvidence` sinks `runtimeEvidence` even though many consumers only need one lane such as `runtimeEvidence.reflect`.
- `packages/logix-react/src/internal/hooks/useSelector.ts`
  - `useSelector` uses `useSyncExternalStoreWithSelector`, so the host can support local selector subscriptions when components are split correctly.
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - selector graph already supports dirty path filtering and value equality before publishing selector updates.
- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
  - explicit read-query input and declared reads already exist; this plan must dogfood them before proposing another selector builder.
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - terminal public React read formula is `useSelector(handle, selector, equalityFn?)`.
  - public no-arg host read is outside the terminal host contract.
  - the page explicitly does not reserve another runtime builder family in core authority.

## Terminal Claim

Playground render fanout must be bounded by region ownership and selector evidence, using current React host law.

Required interaction contracts:

- right inspector tab selection updates inspector tab chrome and the active inspector pane; unrelated command bar, files, source, and bottom drawer selectors must not receive relevant updates.
- bottom drawer tab selection updates bottom tab chrome and the active bottom pane; unrelated command bar, files, source, and runtime inspector selectors must not receive relevant updates.
- file selection updates file navigator active markers and source editor; command bar, runtime inspector, and bottom drawer must not receive relevant updates.
- Run/Check/Trial state changes update command bar and the runtime/result/diagnostics consumers that read those fields; source navigator and inactive panes must not receive relevant updates.
- `runtimeEvidence.reflect/run/dispatch/check/trialStartup` changes must notify only selectors that read the changed lane or an explicitly broad evidence summary.

The measurable target is not an absolute React render-count promise. The measurable target is:

- `PlaygroundShell` has no fast workbench-state subscriptions.
- fast interactions have an allowed affected region set.
- test-only render counters or Profiler wrappers run after warmup and ignore initial mount.
- unrelated regions must have no selector commit or visible commit beyond the allowed budget for that interaction.

## Constraints

- Do not add a second React host state model.
- Do not add a Playground-specific public core API.
- Do not add `Logix.Select.*` or any new public core root in this plan.
- Do not widen public React hooks beyond `useModule / useSelector / useDispatch`.
- Keep Playground workbench state in a Logix module. External mutable adapters such as Monaco and workspace remain host bridges with minimal Logix projection.
- Do not move workbench state back to React `useState`.
- Preserve existing runtime transaction constraints. No IO in reducer or transaction window.

## Adopted Candidate

### C-prime: Region Ownership + Existing Selector Carrier

The adopted candidate combines the reviewer proposals:

- A1 `Shell-zero-subscription region ownership`
- A1 `Nested-dirty-first workbench state`
- A2 `Compressed closure`
- A3 `Region ownership + existing ReadQuery carrier`
- A4 `Two-step closure`

It replaces the initial Option C. The first implementation loop closes only:

- Playground region ownership.
- current selector carrier dogfood.
- narrow nested dirty evidence.
- render fanout contract tests.
- derived diagnostics from existing traces where needed.

It defers public selector builder design. A future `path/struct` helper can only enter via a separate admission proposal after this cutover proves current carriers insufficient.

## Proposed Change

### Lane 1: Shell-Zero-Subscription Region Ownership

Refactor `PlaygroundShell` into a thin orchestration shell.

`PlaygroundShell` may hold:

- static `workspace` reference.
- Logix module handle.
- runtime invoker and session runner bridge.
- long-running effects that bridge to runtime operations.
- stable command callback providers.

`PlaygroundShell` must not subscribe to fast workbench state such as:

- `layout`
- `activeFile`
- `bottomTab`
- `inspector.*`
- `runtimeEvidence.*`
- `runState`
- `checkState`
- `trialStartupState`
- `programSession`
- `sessionActions`

New region containers:

- `WorkbenchLayoutRoot`
  - owns `layout` selector and layout dispatch.
  - passes stable component boundaries into `ResizableWorkbench`.
- `CommandBarContainer`
  - owns `snapshot` identity, `runState`, `checkState`, `trialStartupState`, and `programSession` reads needed by command bar.
- `FilesPanelContainer`
  - owns `activeFile`, file grouping projection, file select dispatch.
- `SourcePanelContainer`
  - owns `activeFile`, `workspaceRevision`, and edit bridge.
- `RuntimeInspectorContainer`
  - owns inspector tab and inspector-specific runtime/session projections.
- `BottomPanelContainer`
  - owns `bottomTab`.
  - delegates content to `ConsolePane`, `TracePane`, `SnapshotPane`, `DiagnosticsPane`, and `ScenarioPane`.

`ProjectSnapshot` and `workbenchProjection` must move to the narrowest owner that needs them. If a shared derived value is needed, place it behind a stable internal provider whose consumers subscribe locally. It must not pull fast state back into `PlaygroundShell`.

### Lane 2: Narrow Dirty Evidence

Keep semantic grouping unless tests prove grouping itself causes unavoidable fanout.

Preferred first move:

- keep `inspector` as a semantic object.
- change reducers from `sink?.('inspector')` to narrow paths:
  - `inspector.activeInspectorTab`
  - `inspector.advancedDispatchExpanded`
  - `inspector.selectedDriverId`
  - `inspector.driverExecution`
  - `inspector.selectedScenarioId`
  - `inspector.scenarioExecution`

Also narrow `runtimeEvidence`:

- `runtimeEvidence.reflect`
- `runtimeEvidence.run`
- `runtimeEvidence.dispatch`
- `runtimeEvidence.check`
- `runtimeEvidence.trialStartup`

Flattening `inspector` or `runtimeEvidence` to top-level fields is allowed only if:

- nested dirty path proof fails after correct path usage, or
- the field has a genuinely independent lifecycle and ownership boundary.

The implementation must prove that:

- `sink('inspector.activeInspectorTab')` does not evaluate or publish selectors that only read `inspector.driverExecution`.
- `sink('runtimeEvidence.reflect')` does not evaluate or publish selectors that only read `runtimeEvidence.dispatch`.

### Lane 3: Existing Selector Carrier Dogfood

This plan does not add a new public selector builder.

Playground hot selectors must avoid function-source inference by using one of the existing accepted paths:

- explicit internal read-query input where allowed by current sealed selector family.
- selector functions with declared `fieldPaths` metadata when that is the established internal path.
- existing Form/core selector primitives where applicable.

The semantic requirements for any hot selector are:

- stable selector id.
- declared read paths.
- equality semantics.
- no reliance on function-source parsing for hot region selectors.

Selector identity law:

- selector identity must include enough shape to distinguish operators and projections, not just read paths.
- if two selector carriers share `selectorId` but disagree on static IR, dev/test diagnostics must fail.
- initial implementation may satisfy this by using existing `ReadQuery.make` style explicit identity or by improving internal validation.

Public selector builder admission is deferred. Reopen conditions:

- Playground cannot meet bounded fanout and type ergonomics using existing selector carriers.
- The candidate passes public-surface review and does not resurrect `ReadQuery` as a public noun.
- The candidate updates `docs/ssot/runtime/01-public-api-spine.md`, `docs/ssot/runtime/10-react-host-projection-boundary.md`, and public-surface tests before implementation.

### Lane 4: Path Registry Same-Source Proof

Nested dirty path precision depends on selector reads and reducer sink paths being interpreted through the same path normalization and registry.

Acceptance requires proof that:

- reducer `sink` dot paths normalize to the same field path representation used by selector reads.
- when registry is available, SelectorGraph does not fall back to full evaluation for the covered interactions.
- if registry is missing and the runtime falls back, the test exposes it as a fanout or selector-eval failure.

This lane verifies existing infrastructure. It does not create a second dirty-evidence API.

### Lane 5: Diagnostics From Existing Traces

Prefer deriving gates from existing events before adding new DebugSink events.

Use or extend only as needed:

- `trace:react-selector`
- `trace:selector:eval`
- read-query strict gate and build grade diagnostics

Required dev/test gates:

- hot Playground selectors must not be dynamic lane.
- hot interactions must not dirty broad roots when a narrower path is expected.
- broad no-arg host reads are outside the terminal public contract and banned in the hot Playground region paths covered by the fanout test.

If existing traces cannot express one of these gates, add one aggregate slim diagnostic rather than a new event family.

### Lane 6: Performance Matrix Only When Core Changes

The selector topic performance matrix is required only if this plan changes core selector graph, runtime store, scheduler, or read-query internals.

If required, it must define:

- sample size and fixture shape.
- baseline command.
- threshold.
- failure handling.

If implementation stays in Playground and React test harness only, matrix work is deferred.

## Implementation Sketch

### Files To Touch

- `packages/logix-playground/src/internal/components/PlaygroundShell.tsx`
  - shrink to orchestration shell.
  - remove fast workbench-state subscriptions.
  - stop constructing all region nodes from changing state.
- `packages/logix-playground/src/internal/components/PlaygroundWorkbenchRoot.tsx`
  - optional new composition root.
- `packages/logix-playground/src/internal/components/*Container.tsx`
  - add command bar, files, source, inspector, bottom containers.
- `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
  - split tab chrome from tab panes where needed.
- `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
  - split tab chrome from tab lanes where needed.
- `packages/logix-playground/src/internal/state/workbenchProgram.ts`
  - narrow `inspector.*` and `runtimeEvidence.*` sink paths.
- `packages/logix-playground/src/internal/state/workbenchTypes.ts`
  - update only if state shape changes are proven necessary.
- `packages/logix-playground/test/*render-fanout*.test.tsx`
  - add region render and selector fanout contract tests.
- `packages/logix-react/src/internal/hooks/useSelector.ts`
  - only if existing selector trace cannot expose dynamic hot selectors in tests.
- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
  - only if selector identity collision validation is missing and needed for hot selector proof.
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - only if nested dirty path proof exposes a real runtime bug.
- `docs/ssot/runtime/17-playground-product-workbench.md`
  - record Playground region ownership and render fanout law after plan adoption.
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - update only if React host selector law or diagnostics law changes. No update is required for a Playground-only cutover.

### What Not To Do

- Do not introduce `usePlaygroundState`, `useWorkbenchTab`, or any Playground-specific state hook family.
- Do not introduce `Logix.Select.*` in this implementation plan.
- Do not move workbench state back to React `useState`.
- Do not memoize the broad shell as the final fix.
- Do not rely on `React.memo` as the core solution.
- Do not flatten nested state as the first move when narrow nested sink can express the same ownership.
- Do not add new DebugSink event families before proving existing traces are insufficient.

## Test Plan

### Unit

- `workbenchProgram` reducer tests:
  - inspector actions sink narrow nested paths.
  - runtime evidence actions sink narrow evidence lane paths.
- selector carrier tests for hot Playground selectors:
  - stable selector id.
  - declared reads.
  - equality semantics.
  - no dynamic lane.
- selector graph tests only if a runtime bug is found:
  - nested dirty path overlap.
  - registry same-source behavior.

### React Integration

Add a Playground render fanout contract test with test-only render counters or Profiler wrappers.

Rules:

- run after initial mount and auto-start effects have settled.
- normalize StrictMode if enabled.
- each interaction declares an allowed affected region set.
- unrelated regions must stay within zero or explicitly bounded visible commits.
- selector trace assertions should confirm hot selectors remain static and narrow.

Required interactions:

- right inspector tab click.
- bottom drawer tab click.
- file selection.
- Run.
- Check.
- Trial.
- runtimeEvidence reflect update.
- runtimeEvidence dispatch update.

### Verification Commands

```bash
pnpm --filter @logixjs/playground test
pnpm typecheck
pnpm lint
```

If React host tracing changes:

```bash
pnpm --filter @logixjs/react test
```

If selector graph, runtime store, scheduler, or read-query internals change:

```bash
pnpm --filter @logixjs/core test
pnpm check:effect-v4-matrix
```

## Acceptance Criteria

- `PlaygroundShell` has no fast workbench-state subscriptions.
- region containers own their own selectors and dispatches.
- `inspector.*` updates use narrow nested dirty paths or a proven better shape.
- `runtimeEvidence.*` updates use narrow nested dirty paths or a proven better shape.
- hot Playground selectors use explicit reads and do not rely on function-source parsing.
- selector identity collision risk is covered by existing or added dev/test validation.
- nested dirty path proof shows unrelated selectors are not evaluated or published.
- render fanout contract tests cover right tabs, bottom tabs, file selection, host commands, and evidence lanes.
- no new public React hook family is introduced.
- no `Logix.Select.*` or new public core root is introduced.
- public selector builder remains a separate reopen item with explicit admission criteria.

## Rollout / Backout

Forward-only rollout:

1. Add render fanout tests that fail against the current broad shell.
2. Split Playground region containers and remove shell fast subscriptions.
3. Narrow `inspector.*` and `runtimeEvidence.*` sink paths.
4. Convert hot selectors to existing explicit-read carriers.
5. Add trace-derived gates for hot selector static lane and narrow dirty paths.
6. Update Playground SSoT.

Backout is local to the branch before merge. After merge, regressions should be fixed forward by narrowing the offending subscription, selector, or dirty path. Do not restore the broad shell subscription pattern.
