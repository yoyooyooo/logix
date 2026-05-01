# Contracts: Runtime Workbench Kernel

This feature has TypeScript/internal contracts rather than HTTP endpoints.

## Package Boundary Contract

Core package manifest must provide workspace-only repo-internal consumption:

```json
{
  "exports": {
    "./repo-internal/workbench-api": "./src/internal/workbench-api.ts"
  },
  "publishConfig": {
    "exports": {
      "./repo-internal/workbench-api": null
    }
  }
}
```

Rules:

- `@logixjs/core` root exports no workbench symbols.
- `@logixjs/core/Runtime`, `@logixjs/core/ControlPlane`, `@logixjs/core/Module`, `@logixjs/core/Program` export no workbench symbols.
- `@logixjs/sandbox` exports no workbench symbols.
- `@logixjs/playground` exports no workbench symbols.
- `@logixjs/devtools-react` exports no public workbench protocol.

## Authority Bundle Contract

Consumer code calls the internal bridge with:

```ts
import { deriveRuntimeWorkbenchProjectionIndex } from "@logixjs/core/repo-internal/workbench-api"

const index = deriveRuntimeWorkbenchProjectionIndex({
  truthInputs: [
    { kind: "control-plane-report", report },
  ],
  contextRefs: [
    { kind: "source-snapshot", digest: "sha256:...", projectId: "logix-react.local-counter" },
  ],
  selectionHints: [
    { kind: "selected-artifact", artifactOutputKey: "trial-report" },
  ],
})
```

Rules:

- Changing only `selectionHints` must not change `index.sessions` or any node id/content.
- Changing only `contextRefs` must not change control-plane findings, but may add digest/context gaps.
- Invalid truth input creates a bounded gap or is rejected by the adapter before kernel call.

## Projection Index Contract

Internal output:

```ts
type RuntimeWorkbenchProjectionIndex = {
  readonly sessions: readonly RuntimeWorkbenchSessionProjection[]
  readonly indexes?: RuntimeWorkbenchProjectionIndexes
}
```

Rules:

- `sessions` is the only semantic root.
- Optional indexes are lookup caches only.
- Every node has `authorityRef` or `derivedFrom`.
- No `selectedSessionId`.
- No host view state.
- No mutable runtime objects.

## Finding Contract

Allowed finding classes:

```ts
type RuntimeWorkbenchFindingClass =
  | "control-plane-finding"
  | "run-failure-facet"
  | "evidence-gap"
  | "degradation-notice"
```

Rules:

- `control-plane-finding` mirrors report finding, verdict, errorCode, `repairHints` or `nextRecommendedStage`.
- `run-failure-facet` mirrors bounded run failure from `Runtime.run` result projection.
- `evidence-gap` explains missing/mismatched authority input.
- `degradation-notice` marks dropped, oversized, incomplete, inconclusive or degraded evidence.
- The kernel cannot invent report code, stage upgrade, repair priority, retry policy or Agent scheduling.

## Coordinate Contract

Owner table:

| Coordinate | Owner | Kernel rule |
| --- | --- | --- |
| `focusRef` | control plane / domain owner | pass through only |
| `artifactOutputKey` | report or evidence package | pass through only |
| source digest/span | source snapshot carrier | context and drilldown only |
| runtime instance/txn/op/event coordinate | runtime debug authority | session grouping and drilldown |
| scenario step id | verification scenario owner | pass through only |

Rules:

- Missing owner coordinate creates evidence gap.
- Raw stack/log/locator/UI selection cannot become coordinate authority.
- Artifact-derived source spans require provenance and digest.

## Host Adapter Contract

### Playground

- Converts snapshot, preview state, Program Run, Check and Trial into authority bundle.
- Keeps source edits and preview lifecycle as host view state.
- Uses projection index for diagnostics and drilldowns only.
- Owns product display through `packages/logix-playground`: top command bar, file navigator, source editor, result/diagnostics panel and bottom `Console / Diagnostics / Trace / Snapshot` strip.
- Does not let projection index store active file, editor cursor, selected panel, console tab, route state, preview lifecycle or viewport/theme state.
- Converts Driver/Scenario execution outputs into truth inputs only after they become Run result, control-plane report, evidence package, artifact ref or stable debug event batch.
- Does not pass Driver declarations, payload schemas, raw action payloads, scenario steps, wait/settle rules or observe/expect rules into the kernel.

### DVTools

- Converts live debug snapshot and imported evidence package into authority bundle.
- Uses the same projection law for live and imported modes.
- Keeps selected panel, timeline tab and layout state as host view state.

### CLI

- Converts evidence input, control-plane report and selection manifest into authority bundle.
- Uses projection to focus output.
- Emits CLI/control-plane transport only.
- Does not consume DVTools-only protocol.

## Negative Contract

Forbidden production/public names or public concepts:

- `Runtime.workbench`
- `runtime.workbench`
- `Runtime.devtools`
- `runtime.devtools`
- `Runtime.inspect`
- `runtime.inspect`
- `Runtime.playground`
- `runtime.playground`
- `SnapshotPreviewWitness`
- public `PlaygroundRunResult`
- public workbench report schema
- sandbox-owned playground report schema
- DVTools-owned evidence envelope
- CLI-owned workbench report protocol
