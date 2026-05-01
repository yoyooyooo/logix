# Quickstart: Logix Playground

## Goal

Prove `@logixjs/playground` can be consumed by `examples/logix-react` and later by `apps/docs` without copying the Playground shell or creating a second project registry truth.

## Package Setup

Create `packages/logix-playground` with shell-first public surface:

- public shell: `PlaygroundPage`
- public project declaration helpers and types
- internal snapshot builder
- internal Sandpack preview adapter
- internal sandbox-backed runner
- internal derived summary helpers

Expected public import shape:

```ts
import { PlaygroundPage } from "@logixjs/playground/Playground"
import type { PlaygroundProject } from "@logixjs/playground/Project"
```

Forbidden public import shape:

```ts
import { ProgramEngine } from "@logixjs/playground/ProgramEngine"
import { PreviewAdapter } from "@logixjs/playground/Preview"
import { PlaygroundEvidence } from "@logixjs/playground/Evidence"
```

## First Example Project

Extract one `examples/logix-react` demo into a project registry entry.

Preferred first proof:

- id: `logix-react.local-counter`
- source: local counter module/logic/program
- preview: React counter UI with increment/decrement
- Program: same logic file plus fixed exports `Program` and `main`
- diagnostics: Check and startup Trial enabled

The shared snapshot must make this true:

```text
edit shared logic file
  -> ProjectSnapshot revision increments
  -> preview behavior changes
  -> Runtime.run result changes
```

## Example Route

Add an example route shaped like:

```tsx
import { PlaygroundPage } from "@logixjs/playground/Playground"
import { logixReactPlaygroundRegistry } from "./playground/registry"

export function PlaygroundRoute({ id }: { readonly id: string }) {
  return <PlaygroundPage registry={logixReactPlaygroundRegistry} projectId={id} />
}
```

Route expectation:

```text
/playground/logix-react.local-counter
```

The route is consumer-owned. `@logixjs/playground` owns the shell, panels, snapshot builder and internal runner.

## Required UI Proof

Open the route and verify:

- source tree is visible
- selected source file content is visible
- React preview renders non-empty content
- clicking the counter button changes visible UI
- Run returns a bounded JSON-safe result
- Check/Trial display core control-plane reports
- Trial is startup Trial
- Check/Trial do not auto-run or auto-expand on initial render
- reset remounts preview and clears captured errors/logs

## Required Automated Commands

The authoritative witness list is the acceptance matrix in [plan.md](./plan.md). Run the narrow gates first:

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test
rtk pnpm -C examples/logix-react typecheck
rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser
rtk pnpm -C packages/logix-sandbox exec vitest run test/SandboxPublicSurface.contract.test.ts
```

Then run workspace gates when the narrow gates pass:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

If implementation changes runtime core, sandbox worker protocol or React host lifecycle, also run the perf commands listed in [plan.md](./plan.md).

## Public Surface Sweep

Before closing, run text sweeps for forbidden public leakage:

```bash
rtk rg -n "PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|programExport|mainExport" packages/logix-sandbox/src packages/logix-sandbox/package.json specs/164-logix-playground
```

Expected result:

- no product API exports from sandbox
- no sandbox-owned report schema
- no custom Program/main export names in live contract
- remaining matches in this spec are marked as forbidden shape

## Docs Readiness Check

This spec does not require full `apps/docs` integration. It requires a consumption shape that docs can use:

```tsx
<PlaygroundPage registry={sharedGeneratedRegistry} projectId="logix-react.local-counter" />
```

Docs must consume the same curated project authority or a generated index from it.

Docs must not copy:

- shell layout
- source tabs
- preview host
- Program result panel
- Check/Trial report panels
- snapshot builder
- internal runner

Docs must not maintain a separate hand-written project definition for the same project id.

## Done Condition

The spec can move to `Done` only when every AM witness in [plan.md](./plan.md) passes.
