# Research: Runtime Workbench Kernel

## Decision 1: Owner Is Core Internal Workbench

**Decision**: place implementation under `packages/logix-core/src/internal/workbench/**`.

**Rationale**:

- The kernel consumes runtime, control-plane, evidence and debug authority. Core already owns these types and internal protocols.
- A separate package would need a public-looking import path or deeper workspace wiring before there is evidence that it reduces complexity.
- Core package publish config already supports repo-internal subpaths that are blocked in published exports.

**Alternatives considered**:

- `packages/logix-workbench`: rejected for now because it adds package identity and a likely public mental model.
- `packages/logix-devtools-react/src/internal/state/workbench`: rejected because DVTools would remain the owner and Playground/CLI would import a UI-adjacent truth.
- `packages/logix-playground`: rejected because Playground is a source snapshot host, not workbench authority.

## Decision 2: Use Repo-Internal Bridge, Not Public Export

**Decision**: expose implementation to monorepo consumers through `@logixjs/core/repo-internal/workbench-api` during source development, with publish config set to `null`.

**Rationale**:

- Current core package already uses repo-internal bridges for debug, evidence, reflection and runtime contracts.
- Playground, DVTools and CLI need a stable monorepo import without reaching into `src/internal/**`.
- Blocking the subpath in publish config preserves zero public surface.

**Required guard**:

- package manifest test must prove `publishConfig.exports["./repo-internal/workbench-api"] === null`.
- public surface tests must prove root exports do not include workbench symbols.

## Decision 3: Projection Index Is Internal DTO

**Decision**: implement `RuntimeWorkbenchProjectionIndex` as an internal DTO, not as a public or CLI protocol.

**Rationale**:

- The adopted candidate requires shared derivation law, not shared external report shape.
- CLI output remains CLI/control-plane transport.
- DVTools UI can map projection into view state, but the mapping cannot become authority.

**Implication**:

- The index may have optional lookup maps for performance, but `sessions` remains the only semantic root.
- Any top-level `findings`, `artifacts` or `gaps` must be explicitly named index/cache, not root lanes.

## Decision 4: Truth Inputs, Context Refs, Selection Hints

**Decision**: split inputs into `truthInputs`, `contextRefs` and `selectionHints`.

**Rationale**:

- Selection manifest is already hint-only in DVTools/CLI flow.
- Source snapshot digest and package identity can help grouping and drilldown but cannot create finding truth.
- Truth derivation must be testable as a pure function over authority inputs.

**Rule**:

- Changing only `selectionHints` must never change session/finding/artifact/gap identity, existence, severity or authority.
- Changing only `contextRefs` may affect labels, digest mismatch gaps or drilldown locators, but not report-derived findings.

## Decision 5: Authority-Backed Finding Only

**Decision**: findings are restricted to four classes:

- `control-plane-finding`
- `run-failure-facet`
- `evidence-gap`
- `degradation-notice`

**Rationale**:

- `VerificationControlPlaneReport` owns machine diagnostics.
- `Runtime.run` owns result/failure projection.
- Debug/evidence data can explain gaps and degradation but cannot invent repair priority.

**Rejected**:

- A general advisor finding engine in the kernel.
- A custom severity namespace.
- A custom repair action namespace.

## Decision 6: Coordinate Owner Table

**Decision**: coordinates are passed through only when owner-provided.

**Rationale**:

- `focusRef` belongs to runtime control plane and domain owners.
- `artifactOutputKey` belongs to reports or evidence packages.
- source digest/span belongs to the source snapshot carrier.
- raw stack, log, locator and UI selection are not coordinate authority.

**Proof requirement**:

- Missing owner coordinate produces evidence gap.
- Artifact-derived source spans require artifact provenance and digest.

## Decision 7: DVTools Existing Workbench Becomes Adapter

**Decision**: DVTools keeps live/imported normalization and UI state, but session/finding/artifact/gap semantics move to core internal workbench.

**Rationale**:

- DVTools currently has useful fixtures and UI components, but its internal `WorkbenchModel` has authority risks.
- 14 already delegates cross-host projection semantics to 165.

**Migration shape**:

- Introduce core kernel first.
- Convert DVTools tests to assert equivalence through core projection.
- Rename or demote old model objects to host view state if they remain.

## Decision 8: Playground Consumes Projection Without Owning Diagnostic Report

**Decision**: Playground summary remains host view state and can consume projection output, but it does not define diagnostic authority.

**Rationale**:

- 164 owns Playground UI path.
- `docs/ssot/runtime/17-playground-product-workbench.md` owns Playground product capabilities and display shape.
- 165 owns projection law.
- `Runtime.run` and `VerificationControlPlaneReport` stay shape-separated.

**Implication**:

- Playground can reshape its shell into top command bar, file navigator, source editor, result panel and bottom console strip without reopening 165.
- Kernel output can feed Result, Diagnostics, Trace and Snapshot lanes, but cannot store active file, editor cursor, selected tab, route state, preview lifecycle or viewport/theme controls.

## Decision 9: CLI Uses Projection For Focus, Not Protocol

**Decision**: CLI can derive a focused repair projection from workbench index, but output remains CLI/control-plane transport.

**Rationale**:

- CLI already imports evidence and selection.
- Selection remains hint-only.
- A kernel-owned CLI report schema would create a second report protocol.

## Open Questions

No open design blockers. Implementation must still decide exact adapter file names within the planned paths.
