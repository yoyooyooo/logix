# Contracts: Logix Playground

This feature has TypeScript/runtime contracts rather than HTTP endpoints.

## Package Public Surface

Public package shape:

```json
{
  "name": "@logixjs/playground",
  "exports": {
    ".": "./src/index.ts",
    "./Playground": "./src/Playground.tsx",
    "./Project": "./src/Project.ts",
    "./package.json": "./package.json",
    "./internal/*": null
  }
}
```

Rules:

- `./Playground` owns the user-facing shell component.
- `./Project` owns the minimal project declaration helpers and types.
- `src/internal/**` owns file store, snapshot builder, preview adapter, sandbox runner, summary derivation and UI internals.
- Public exports must not include `FileModel`, `ProgramEngine`, `PreviewAdapter`, `Evidence`, runner projection contracts, Sandpack types or sandbox worker action families.
- The package may depend on `@logixjs/sandbox`; sandbox must not depend on Playground.

## Project Declaration Contract

Consumer-provided project:

```ts
import type { PlaygroundProject } from "@logixjs/playground/Project"

export const project: PlaygroundProject = {
  id: "logix-react.local-counter",
  files: {
    "/src/logic/localCounter.logic.ts": {
      language: "ts",
      content: "...",
      editable: true,
    },
    "/src/App.tsx": {
      language: "tsx",
      content: "...",
      editable: true,
    },
    "/src/program.ts": {
      language: "ts",
      content: "...",
      editable: true,
    },
  },
  preview: {
    entry: "/src/App.tsx",
  },
  program: {
    entry: "/src/program.ts",
  },
  capabilities: {
    preview: true,
    run: true,
    check: true,
    trialStartup: true,
  },
  fixtures: {
    // minimal curated fixtures required by this project
  },
}
```

Program entry rules:

- Program files use fixed exports: `export const Program` and `export const main`.
- `Program` is the only value consumed by Check/Trial.
- `main` remains app-local runner convention for `Runtime.run`.
- Public project declarations do not support custom `programExport` or `mainExport` names in v1.

Project rules:

- `id` is stable and URL-safe.
- Preview entry and Program entry reference files in the same project.
- A project can be preview-only or Program-only, but disabled panels must show an explicit unavailable state.
- Title, description, docs route, rich dependency policy, generated-file policy and adapter config can exist as consumer-local catalog/internal metadata, but they are not v1 public contract.

## ProjectSnapshot Contract

Internal shell and runner create one execution coordinate:

```ts
type ProjectSnapshot = {
  readonly projectId: string
  readonly revision: number
  readonly files: ReadonlyMap<string, ProjectSnapshotFile>
  readonly generatedFiles: ReadonlyMap<string, ProjectSnapshotFile>
  readonly previewEntry?: ResolvedPreviewEntry
  readonly programEntry?: ResolvedProgramEntry
  readonly dependencies: Readonly<Record<string, string>>
  readonly fixtures: unknown
  readonly diagnostics: {
    readonly check: boolean
    readonly trialStartup: boolean
  }
  readonly envSeed: string
}
```

Rules:

- Source viewer/editor, preview adapter and internal runner consume snapshots derived from the same workspace revision.
- Preview and runtime operations must not read original project files after edits when a current snapshot exists.
- Snapshot includes current files, generated files, resolved entries, dependencies, fixtures, diagnostic options and deterministic env seed.
- Same-source proof targets the snapshot, not only raw file text.

## Preview Boundary

Default internal adapter:

```text
internal Sandpack preview/edit adapter
```

Rules:

- Sandpack-specific types must not become the public project contract.
- Preview failures are captured into bounded preview errors.
- Preview reset remounts from the current `ProjectSnapshot`.
- The outer shell remains usable when preview fails.
- Automated tests may use an internal preview witness to avoid iframe lifecycle instability. This witness is not public contract and must still consume the same `ProjectSnapshot`.

## Runtime Boundary

Internal runner operations:

```text
run           -> Runtime.run(Program, main, options)
check         -> Runtime.check(Program, options?)
trialStartup  -> Runtime.trial(Program, { mode: "startup", ... })
```

Rules:

- The runner is internal to `@logixjs/playground`.
- Run output is a bounded JSON-safe app-local projection, not a public named type.
- Check output must pass `ControlPlane.isVerificationControlPlaneReport`.
- Startup Trial output must pass `ControlPlane.isVerificationControlPlaneReport`.
- Scenario trial, replay and compare are not Playground v1 contract.
- Run failures must not be reported as Trial failures.

Shape separation rule:

```ts
expect(ControlPlane.isVerificationControlPlaneReport(runProjection)).toBe(false)
expect(ControlPlane.isVerificationControlPlaneReport(trialReport)).toBe(true)
```

## Derived Summary Contract

The shell may derive a bounded JSON-safe summary:

```ts
type DerivedPlaygroundSummary = {
  readonly projectId: string
  readonly revision: number
  readonly changedFiles: readonly string[]
  readonly preview: { readonly status: string; readonly errorCount: number }
  readonly run?: { readonly status: string; readonly runId?: string }
  readonly check?: { readonly status: string; readonly verdict?: string }
  readonly trialStartup?: { readonly status: string; readonly verdict?: string }
  readonly errors: readonly { readonly kind: string; readonly message: string }[]
  readonly truncated?: boolean
}
```

Rules:

- Summary is derived from snapshot, preview session, Run projection and core reports.
- Summary is not mutable source of truth.
- Summary must not redefine `VerificationControlPlaneReport`.
- Summary exists for UI, tests and Agent inspection, not as public diagnostic authority.

## Sandbox Boundary Contract

Allowed public sandbox root exports remain:

```ts
Object.keys(await import("@logixjs/sandbox")).sort()
// ["SandboxClientLayer", "SandboxClientTag"]
```

Allowed sandbox public subpath:

```text
@logixjs/sandbox/vite
```

Forbidden sandbox public concepts:

- `Playground`
- `PlaygroundProject`
- `PlaygroundRunResult`
- `PreviewHost`
- `SourceTab`
- `RUN_EXAMPLE`
- `RUNTIME_CHECK`
- `RUNTIME_TRIAL`
- sandbox-owned report schema

## Docs/Example Consumer Contract

Consumer route shape:

```tsx
import { PlaygroundPage } from "@logixjs/playground/Playground"
import { logixReactPlaygroundRegistry } from "./playground/registry"

export function ExamplePlaygroundRoute({ id }: { readonly id: string }) {
  return <PlaygroundPage registry={logixReactPlaygroundRegistry} projectId={id} />
}
```

Rules:

- Docs/examples can open an app-owned route such as `/playground/:id`.
- Route ownership stays with the consuming app.
- Consumers pass registry/project id; they do not copy shell panels, snapshot builder, preview host or runtime panels.
- Docs must consume the same curated project authority or a generated index from it.
- Docs must not reauthor a parallel project entry for the same project id.
- Missing project id renders a bounded not-found state.
