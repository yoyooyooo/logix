---
title: Runnable examples index
description: Map guide patterns and recipes to runnable examples in the repository.
---

This index maps guide pages to runnable examples under `examples/*`.

## Example locations

- `examples/logix`: scenario scripts without UI
- `examples/logix-react`: runnable React application with DevTools

## Docs runner convention

Runnable non-UI Program examples use an app-local adapter:

```ts
export const Program = Logix.Program.make(RootModule, {
  initial: { count: 0 },
  logics: [],
})

export const main = (ctx, args) =>
  Effect.gen(function* () {
    const state = yield* ctx.module.getState
    return { count: state.count, args }
  })
```

The docs runner calls `Runtime.run(Program, main, options)` for the result panel. Check and Trial are separate on-demand diagnostics and return `VerificationControlPlaneReport`.

## Patterns

| Guide page | Runnable code |
| --- | --- |
| pagination | `examples/logix-react/src/modules/querySearchDemo.ts` |
| optimistic update | `examples/logix/src/scenarios/optimistic-toggle.ts` |
| search and detail linkage | `examples/logix/src/scenarios/search-with-debounce-latest.ts` |
| i18n | `examples/logix/src/i18n-message-token.ts`, `examples/logix-react/src/modules/i18n-demo.ts` |

## Notes

- runnable examples are evidence, not authority
- public contracts remain defined by API docs and SSoT
- raw Effect smoke examples can run as smoke examples, but they do not expose Check or Trial
