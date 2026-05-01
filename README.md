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
- **Runtime**: hosts Program instances, runs Program-mounted Logic, and wires service Layers.

## Minimal example

```ts
import * as Logix from '@logixjs/core'
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

export const CounterProgram = Logix.Program.make(CounterDef, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const CounterRuntime = Logix.Runtime.make(CounterProgram)
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

- `packages/logix-core` → `@logixjs/core` (kernel: Module / Logic / Flow / Runtime / `$`)
- `packages/logix-react` → `@logixjs/react` (React adapter: `RuntimeProvider`, hooks)
- `packages/logix-devtools-react` → `@logixjs/devtools-react` (devtools UI)
- `packages/logix-sandbox` → `@logixjs/sandbox` (run Logix/Effect in a browser Worker)
- `packages/logix-test` → `@logixjs/test` (testing utilities)

Add-ons and feature kits live in `packages/logix-form`, `packages/logix-query`, `packages/i18n`, `packages/domain`.

## Documentation

- Getting started: `apps/docs/content/docs/guide/get-started/introduction.en.md`
- Quick start: `apps/docs/content/docs/guide/get-started/quick-start.en.md`
- Tutorial (form): `apps/docs/content/docs/guide/get-started/tutorial-first-app.en.md`

## Repository Skills

- Canonical skill source lives at `skills/`.
- Current migrated skill: `logix-best-practices` (`skills/logix-best-practices`).
- Compatibility discovery path for Codex remains `.codex/skills/logix-best-practices` (symlink).

### Install via Skillshare

Official project: `https://github.com/runkids/skillshare`

```bash
# Install skillshare (choose one)
curl -fsSL https://raw.githubusercontent.com/runkids/skillshare/main/install.sh | sh
# or: brew install skillshare

# Install this repository skill (project mode)
skillshare install github.com/yoyooyooo/logix/skills/logix-best-practices -p
skillshare sync
```

### Install via Vercel Skills CLI

Official project: `https://github.com/vercel-labs/skills`

```bash
# Install from this repository to Codex (project scope)
npx skills add yoyooyooo/logix --skill logix-best-practices -a codex

# Global install example
npx skills add yoyooyooo/logix --skill logix-best-practices -a codex -g
```

Tip: if you install from your fork, replace `yoyooyooo/logix` with your own repository.

## Development

- Build packages (needed by some examples/tools): `pnpm build:pkg`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test` (or `pnpm test:turbo`)
