# Logix

[English](README.md) | [中文](README.zh-CN.md)

Logix is an **Effect-native runtime for frontend state and business logic**.

This repository is the incubation monorepo for Logix: runtime packages, the React adapter, devtools, a browser sandbox, and runnable examples.
It evolves quickly and is **forward-only** (no backward compatibility guarantees).
This README intentionally focuses on Logix; other directories may contain experiments and can change or disappear.

## What is Logix for?

- Build **type-safe Modules** (State + Actions) with `effect/Schema`.
- Orchestrate async business flows with **Effect programs** instead of ad-hoc `useEffect` chains.
- Compose large apps from smaller modules with explicit boundaries, testability, and observability hooks.

## Core mental model

- **Module**: a unit of business boundary (identity + State/Actions shape).
- **Logic**: an Effect program that reacts to Actions / State changes via the bound API `$`.
- **Runtime**: hosts module instances, runs Logic/Processes, and wires service Layers.

## Minimal example

```ts
import * as Logix from '@logix/core'
import { Effect, Schema } from 'effect'

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').update((s) => ({ ...s, count: s.count + 1 }))
  }),
)

export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## Quick start (from this monorepo)

1. Install dependencies:

```bash
pnpm install
```

2. Run the React demo:

```bash
pnpm -C examples/logix-react dev
```

3. Run a standalone Node scenario:

```bash
pnpm tsx examples/logix/src/scenarios/and-update-on-action.ts
```

4. Read the docs (bilingual):

```bash
pnpm -C apps/docs dev
# open http://localhost:3000
```

## Packages

- `packages/logix-core` → `@logix/core` (kernel: Module / Logic / Flow / Runtime / `$`)
- `packages/logix-react` → `@logix/react` (React adapter: `RuntimeProvider`, hooks)
- `packages/logix-devtools-react` → `@logix/devtools-react` (devtools UI)
- `packages/logix-sandbox` → `@logix/sandbox` (run Logix/Effect in a browser Worker)
- `packages/logix-test` → `@logix/test` (testing utilities)

Add-ons and feature kits live in `packages/logix-form`, `packages/logix-query`, `packages/i18n`, `packages/domain`.

## Documentation

- Getting started: `apps/docs/content/docs/guide/get-started/introduction.en.md`
- Quick start: `apps/docs/content/docs/guide/get-started/quick-start.en.md`
- Tutorial (form): `apps/docs/content/docs/guide/get-started/tutorial-first-app.en.md`

## Development

- Build packages (needed by some examples/tools): `pnpm build:pkg`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test` (or `pnpm test:turbo`)
