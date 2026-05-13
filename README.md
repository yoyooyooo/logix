# Logix

[English](README.md) | [中文](README.zh-CN.md)

Logix is an **Effect-native runtime for frontend state and business logic**.

This repository is the active Logix monorepo: runtime packages, React bindings, domain packages, devtools, sandbox/runtime lab, examples, and project standards.
The current line is forward-only and is treated as the future Logix line.

## Project status

- Logix is under active development. Public API shape can still be simplified aggressively.
- New runtime work targets Effect v4 only. The repo currently pins `effect@4.0.0-beta.28` and related Effect packages.
- npm packages remain prerelease packages while the upstream Effect v4 dependency remains beta.
- The intended stable lane is `main`. A stable npm `latest` release should be a deliberate cutover after the release gate, not an automatic rename of the current beta lane. See [Release Lane Standard](docs/standards/release-lane-standard.md).
- Current design facts live in [docs/ssot](docs/ssot/README.md), [docs/standards](docs/standards/README.md), and [logix-best-practices](skills/logix-best-practices/SKILL.md).

## Default route

```text
Module.logic(id, build)
  -> Program.make(Module, config)
  -> Runtime.make(Program)
  -> RuntimeProvider + useModule + useSelector
```

- `Module` defines state and action contracts.
- `Module.logic(id, build)` attaches behavior to that module. The build phase registers declarations synchronously and returns the run effect.
- `Program.make(Module, config)` assembles initial state, mounted logic, services, and imports.
- `Runtime.make(Program)` hosts execution.
- React reads stay on `useSelector(handle, selector, equalityFn?)`; instance resolution stays on `useModule(...)`.

## Minimal core slice

```ts filename="counter.ts"
import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

export const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

export const CounterLogic = Counter.logic('counter-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(
      $.state.update((state) => ({ count: state.count + 1 })),
    )
  }),
)

export const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const counterRuntime = Logix.Runtime.make(CounterProgram)
```

## React host slice

```tsx filename="App.tsx"
import { RuntimeProvider, useModule, useSelector } from '@logixjs/react'
import { Counter, counterRuntime } from './counter'

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, (state) => state.count)

  return (
    <button type="button" onClick={() => counter.dispatchers.inc()}>
      Count: {count}
    </button>
  )
}

export function App() {
  return (
    <RuntimeProvider runtime={counterRuntime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## What Logix owns

- State/action contracts and module identity.
- Effect-based business logic mounted through `Program`.
- Runtime-scoped service wiring and child program imports.
- React host projection, module instance resolution, and selector-based subscriptions.
- Domain packages such as Form, Query, I18n, and Domain pattern kits when they map back to the same runtime law.
- Verification and diagnostics control-plane entry points such as `Runtime.check(...)` and `Runtime.trial(...)`.

## Run this repo

```bash
pnpm install
pnpm check:effect-v4-matrix
pnpm typecheck
pnpm test:turbo
```

Run the React example:

```bash
pnpm -C examples/logix-react dev
```

Run the docs site:

```bash
pnpm -C apps/docs dev
```

## Packages

- `@logixjs/core`: Module, Program, Runtime, control-plane facade.
- `@logixjs/react`: React bindings, `RuntimeProvider`, `useModule`, `useSelector`, dispatch helpers.
- `@logixjs/form`: Form domain package for the current runtime.
- `@logixjs/query`: Query domain package for the current runtime.
- `@logixjs/domain`: Program-first domain pattern kits.
- `@logixjs/i18n`: I18n domain package.
- `@logixjs/cli`: Node-only runtime control-plane CLI.
- `@logixjs/devtools-react`: React devtools UI.
- `@logixjs/playground`: Embeddable playground components.
- `@logixjs/sandbox`: Browser Worker sandbox runtime.
- `@logixjs/test`: Testing utilities.
- `@logixjs/perf-evidence`: private CI/performance evidence tooling.

## Documentation

- Docs root: [docs/README.md](docs/README.md)
- Public API spine: [docs/ssot/runtime/01-public-api-spine.md](docs/ssot/runtime/01-public-api-spine.md)
- Canonical authoring: [docs/ssot/runtime/03-canonical-authoring.md](docs/ssot/runtime/03-canonical-authoring.md)
- React host boundary: [docs/ssot/runtime/10-react-host-projection-boundary.md](docs/ssot/runtime/10-react-host-projection-boundary.md)
- API guardrails: [docs/standards/logix-api-next-guardrails.md](docs/standards/logix-api-next-guardrails.md)
- Performance observability: [docs/standards/kernel-performance-observability-standard.md](docs/standards/kernel-performance-observability-standard.md)
- Release lane: [docs/standards/release-lane-standard.md](docs/standards/release-lane-standard.md)
- Agent guidance: [skills/logix-best-practices/SKILL.md](skills/logix-best-practices/SKILL.md)

## Development

- Effect baseline: `pnpm check:effect-v4-matrix`
- Package build: `pnpm build:pkg`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Tests: `pnpm test` or `pnpm test:turbo`
- Release status: `pnpm release:check`
