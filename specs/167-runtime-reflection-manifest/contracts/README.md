# Contracts: Runtime Reflection Manifest vNext

This feature defines repo-internal TypeScript contracts.

## Boundary Contract

Allowed:

- Add repo-internal reflection DTOs under `packages/logix-core/src/internal/reflection/**`.
- Extend `packages/logix-core/src/internal/reflection-api.ts`.
- Let `packages/logix-playground` consume through repo-internal workspace wiring or internal adapter.
- Let CLI/control-plane and Devtools consume the same DTOs.
- Provide repo-internal consumption contracts that let 166 adapt reflection outputs without inventing private terminal DTOs.

Forbidden:

- `export * as Reflection` from `@logixjs/core`.
- Public `Logix.Reflection`.
- Public `Runtime.playground`, `Runtime.driver`, `Runtime.scenario`.
- Public `Program.capabilities.mocks`.
- Consumer-owned private manifest schema.
- 167-owned Playground source bundling, sandbox transport, UI state or Driver/Scenario product metadata.

## Minimum Manifest Contract

```ts
interface MinimumProgramActionManifest {
  readonly manifestVersion: string
  readonly programId: string
  readonly moduleId: string
  readonly revision?: number
  readonly digest: string
  readonly actions: ReadonlyArray<{
    readonly actionTag: string
    readonly payload: {
      readonly kind: "void" | "nonVoid" | "unknown"
      readonly summary?: string
    }
    readonly authority: "manifest" | "runtime-reflection"
  }>
}
```

Rules:

- Used by 166 Action Workbench.
- Repo-internal owner is `packages/logix-core/src/internal/reflection/programManifest.ts`.
- Consumer entry is `@logixjs/core/repo-internal/reflection-api` through `extractMinimumProgramActionManifest`.
- Regex fallback is outside this contract.
- Digest excludes host UI state.

## Payload Validation Contract

```ts
type PayloadValidationResult =
  | { readonly _tag: "success"; readonly value: unknown }
  | { readonly _tag: "failure"; readonly issues: ReadonlyArray<PayloadValidationIssue> }
  | {
      readonly _tag: "unavailable"
      readonly reason: "unknown-schema" | "unsupported-schema"
      readonly evidenceGap: ReflectionEvidenceGap
    }

interface PayloadValidationIssue {
  readonly path: string
  readonly code: string
  readonly message: string
}
```

Rules:

- Input is JSON-decoded unknown.
- Consumers own text input, JSON parsing and UI presentation.
- Output is bounded.
- Unknown schema returns unavailable with explicit reflection evidence gap.

## Runtime Reflection Manifest Contract

```ts
interface RuntimeReflectionManifest {
  readonly manifestVersion: "runtime-reflection-manifest@167B"
  readonly programId: string
  readonly rootModuleId: string
  readonly rootModule: ModuleManifest
  readonly modules: ReadonlyArray<ModuleManifest>
  readonly actions: ReadonlyArray<ReflectedActionDescriptor>
  readonly initialState?: PayloadSchemaSummary
  readonly logicUnits: ReadonlyArray<unknown>
  readonly effects: ReadonlyArray<unknown>
  readonly processes: ReadonlyArray<unknown>
  readonly imports: ReadonlyArray<unknown>
  readonly services: ReadonlyArray<unknown>
  readonly capabilities: { readonly run: "available"; readonly check: "available"; readonly trial: "available" }
  readonly sourceRefs: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly staticIrDigest?: string
  readonly budget: RuntimeReflectionBudget
  readonly digest: string
}
```

Rules:

- Consumer entry is `extractRuntimeReflectionManifest` from `@logixjs/core/repo-internal/reflection-api`.
- Manifest extraction does not execute Program.
- `diffRuntimeReflectionManifest` reports action addition/removal, payload change and budget degradation.
- CLI `check` and `trial` may transport this DTO as `reflectionManifest` artifact; CLI does not own the DTO authority.

## Runtime Event Law Contract

```ts
type RuntimeOperationEventName =
  | "operation.accepted"
  | "operation.completed"
  | "operation.failed"
  | "evidence.gap"

type RuntimeOperationKind = "dispatch" | "run" | "check" | "trial"

interface RuntimeOperationEvent {
  readonly name: RuntimeOperationEventName
  readonly eventId: string
  readonly operationKind?: RuntimeOperationKind
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
  readonly actionTag?: string
  readonly runId?: string
  readonly message?: string
  readonly timestampMode: "omitted" | "host-provided"
  readonly attachmentRefs: ReadonlyArray<RuntimeOperationAttachmentRef>
  readonly failure?: RuntimeOperationFailure
}
```

Rules:

- Event ids use stable operation coordinates.
- State, logs and trace are bounded attachments or refs.
- Event output is debug evidence, not verdict authority.
- Current implementation provides DTO constructors plus projection from existing runtime debug refs. It does not install a new default collection hook.
- DTOs must not import `packages/logix-playground` types.

## Cross-tool Consumption Law

Cross-tool classes:

- `authority`
- `contextRef`
- `debugEvidence`
- `hostViewState`
- `evidenceGap`

Rules:

- This law is owned by `packages/logix-core/src/internal/reflection/**`.
- Playground, CLI and Devtools may adapt it into UI-local or tool-local view models.
- Tool-local models must not become shared authority.
- Driver/Scenario/Service Source Files remain outside authority except as host context refs, product metadata or evidence gaps.

## Workbench Bridge Contract

Allowed 165 classifications:

- authority: owner-approved manifest
- authority: run result from Runtime output
- authority: Check/Trial report from control plane
- debugEvidence: operation event
- contextRef: source snapshot digest/span
- hostViewState: selection hints
- evidenceGap: missing manifest, missing source coordinate, unknown schema, truncated payload

Forbidden:

- payload schema as diagnostic finding
- raw log as source truth
- Driver/Scenario declaration as truth input
- Service Source File body as truth input
- Playground product session state as reflection truth
