# Data Model: Kernel-to-Playground Verification Parity

**Status**: Adopted for dependency spine, Run projection lossiness, Workbench identity, reflection bridge nodes and Playground capture refs. Remaining scenario executor shape stays owner-gated.

## Authority Layering

```text
VerificationControlPlaneReport
RuntimeRunResultProjection | RuntimeRunFailureProjection
RuntimeReflectionManifest
VerificationDependencyCause spine
PayloadValidationProjection
CommandResult transport
PlaygroundSessionCapture
RuntimeWorkbenchAuthorityBundle
RuntimeWorkbenchProjectionIndex
```

Only the first five items can carry owner truth. `CommandResult`, `PlaygroundSessionCapture` and Workbench projection are transport, capture or derived projection.

## Dependency Cause Spine

Adopted pressure direction:

```ts
interface VerificationDependencyCauseSpine {
  readonly kind: "service" | "config" | "program-import" | "external-package" | "host-fixture"
  readonly phase: "declaration" | "startup-boot" | "startup-close" | "run" | "scenario"
  readonly ownerCoordinate: string
  readonly providerSource: "program-capabilities" | "runtime-overlay" | "declaration" | "host" | "unknown"
  readonly focusRef?: unknown
  readonly sourceRef?: string
  readonly childIdentity?: string
  readonly errorCode: string
}
```

Rules:

- Existing `VerificationDependencyCause` is the first candidate to satisfy this shape.
- Add fields to the existing spine before creating a broader index.
- Reflection and Workbench can link to this spine; they cannot fork dependency truth.

168 first-slice result:

- `VerificationDependencyCause` is adopted as the active dependency spine.
- Broad `DependencyClosureIndex` remains deferred.

## Dependency Closure Index Candidate

Deferred candidate shape:

```ts
interface DependencyClosureIndex {
  readonly manifestVersion: string
  readonly programId: string
  readonly rootModuleId: string
  readonly digest: string
  readonly dependencies: ReadonlyArray<DependencyClosureNode>
  readonly gaps?: ReadonlyArray<DependencyClosureGap>
}

interface DependencyClosureNode {
  readonly dependencyId: string
  readonly kind: "service" | "config" | "import" | "external-package" | "host-fixture"
  readonly ownerCoordinate: string
  readonly lifecyclePhase: "declaration" | "startup" | "run" | "scenario"
  readonly availability: "declared" | "inferred" | "runtime-evidence" | "missing"
  readonly sourceRef?: string
  readonly focusRef?: string
  readonly evidenceRef?: string
}

interface DependencyClosureGap {
  readonly code:
    | "dependency.owner-unavailable"
    | "dependency.source-ref-unavailable"
    | "dependency.runtime-only"
    | "dependency.truncated"
  readonly ownerCoordinate?: string
  readonly message: string
}
```

Deferred questions are tracked in [discussion.md](./discussion.md).

Default stance:

- Rejected by default until `VerificationDependencyCause` proves insufficient.
- It must not become a second runtime, second dependency graph, or second declaration truth.

## Run Failure Projection

Adopted first-slice carrier shape:

```ts
interface RuntimeRunFailureProjection {
  readonly kind: "runtime-run-failure"
  readonly runId: string
  readonly programId: string
  readonly revision?: number
  readonly failurePhase: "compile" | "startup" | "dependency" | "main" | "serialization" | "transport"
  readonly errorCode: string
  readonly message: string
  readonly focusRef?: string
  readonly dependencyId?: string
  readonly dependencyCause?: VerificationDependencyCauseSpine
  readonly relatedTrialReportRef?: string
  readonly evidenceRef?: string
}
```

Rules:

- This is result-face failure projection, not a `VerificationControlPlaneReport`.
- It can become a Workbench `run-failure-facet`.
- It can point to Trial authority when available.
- It is preferred over evidence gap when owner-backed failure information exists.
- Owner detail missing or host-only failure degrades to evidence gap.

## Run Value Lossiness

Adopted first-slice metadata:

```ts
interface RuntimeRunValueProjection {
  readonly kind: "runtime-run-value"
  readonly runId: string
  readonly value: unknown
  readonly valueKind: "json" | "null" | "undefined" | "void" | "stringified" | "truncated"
  readonly lossy: boolean
  readonly lossReasons?: ReadonlyArray<
    | "undefined-to-null"
    | "function-stringified"
    | "symbol-stringified"
    | "depth-truncated"
    | "array-truncated"
    | "string-truncated"
    | "serialization-fallback"
  >
}
```

Rules:

- Business `null` is not equivalent to projected `undefined`.
- Lossiness metadata must survive into Playground Run Result and Workbench run-result input.
- Run failure is a different shape, never represented as lossy value.
- `undefined -> null` uses `lossReasons: ["undefined-to-null"]`.

## Playground Session Capture

Adopted host-state shape:

```ts
interface PlaygroundSessionCapture {
  readonly captureId: string
  readonly projectId: string
  readonly revision: number
  readonly opSeq: number
  readonly kind: "run" | "run-failure" | "check-report" | "trial-report"
  readonly authorityRef: string
  readonly artifactRefs: ReadonlyArray<string>
  readonly sourceDigest: string
}
```

Rules:

- Capture is host state.
- `authorityRef` points to report or run result/failure authority.
- Compare consumes only admissible captured report refs for the current slice.
- Product scenario result is excluded until core scenario executor exists.

## Reflection Workbench Nodes

Adopted internal projection node:

```ts
interface RuntimeWorkbenchReflectionNodeInput {
  readonly kind: "reflection-node"
  readonly nodeKind: "action" | "payload" | "dependency"
  readonly nodeId: string
  readonly summary: string
  readonly manifestDigest?: string
  readonly actionTag?: string
  readonly payload?: {
    readonly kind: "void" | "nonVoid" | "unknown"
    readonly summary?: string
    readonly schemaDigest?: string
    readonly validatorAvailable?: boolean
  }
  readonly dependency?: {
    readonly kind: "service" | "config" | "program-import" | "external-package" | "host-fixture"
    readonly phase?: "declaration" | "startup-boot" | "startup-close" | "run" | "scenario"
    readonly ownerCoordinate: string
    readonly providerSource?: "program-capabilities" | "runtime-overlay" | "declaration" | "host" | "unknown"
    readonly focusRef?: unknown
    readonly sourceRef?: string
    readonly childIdentity?: string
    readonly errorCode?: string
  }
  readonly focusRef?: unknown
  readonly sourceRef?: string
  readonly degraded?: boolean
  readonly degradationReason?: string
}
```

Rules:

- Reflection owner still lives under 167 and repo-internal core reflection.
- Workbench projection can browse action, payload and dependency nodes derived from owner-approved manifest.
- `fallback-source-regex`, missing manifest, unknown payload schema and stale manifest digest are evidence gaps.
- Dependency nodes reuse the `VerificationDependencyCause` spine coordinates when owner-approved data exists; no broad `DependencyClosureIndex` is introduced.

## Adapter Law Sketch

```ts
interface WorkbenchAuthorityAdapterInput {
  readonly source:
    | { readonly kind: "cli"; readonly commandResultRef: string; readonly artifactRefs: ReadonlyArray<string> }
    | { readonly kind: "playground"; readonly snapshotRef: string; readonly captures: ReadonlyArray<PlaygroundSessionCapture> }
}

interface WorkbenchAuthorityAdapterOutput {
  readonly truthInputs: ReadonlyArray<RuntimeWorkbenchTruthInput>
  readonly contextRefs?: ReadonlyArray<RuntimeWorkbenchContextRef>
  readonly selectionHints?: ReadonlyArray<RuntimeWorkbenchSelectionHint>
}
```

Current first slice keeps core internal Workbench law and package-local adapters. Final export names remain deferred while preserving zero public surface.

## Dominance Classification

```ts
type ExistingImplementationDisposition =
  | "keep"
  | "rewrite-under-owner"
  | "demote-to-host-state"
  | "delete"
```

Rules:

- Every existing path listed in `spec.md` TD-011 must receive one disposition before implementation tasks begin.
- A path marked `keep` needs owner proof, not just passing tests.
- A path marked `demote-to-host-state` cannot feed Workbench truth inputs or diagnostics authority lanes.

## Demo Classification

```ts
type PlaygroundDemoAuthorityClass =
  | "runtime-check-report"
  | "runtime-trial-report"
  | "runtime-run-failure"
  | "reflection-manifest"
  | "payload-validation"
  | "workbench-evidence-gap"
  | "visual-pressure-only"
  | "product-scenario-output"
```

Rules:

- `visual-pressure-only` cannot appear in Diagnostics authority lanes.
- `product-scenario-output` cannot become compare truth.
