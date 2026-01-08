---
title: Pattern examples
description: How to write reusable business logic with BoundApi Patterns and Functional Patterns.
---

This page shows how to use Patterns to write reusable, modular business logic.

### Who is this for?

- Architects/senior engineers who design Pattern/Template/asset systems within a team.
- You want to turn high-frequency business flows (e.g. “cascading load”, “optimistic update”) into configurable assets.

### Prerequisites

- Familiar with Effect, Layer, and Service Tags.
- Understand the relationship between Logix Logic and BoundApi.

### What you’ll get

- A complete recipe of “Pattern asset + Effect implementation + consumption inside Logic”.
- Guidance on when to use Functional Patterns vs BoundApi Patterns.

## 1. Functional Pattern (utility-style)

A store-agnostic `(config) => Effect` function that acquires dependencies via Services:

```typescript
// patterns/bulk-operation.ts
import { Effect, Context } from 'effect'

// Service contract
class BulkOperationService extends Context.Tag('@svc/BulkOp')<
  BulkOperationService,
  { applyToMany: (params: { ids: string[]; operation: string }) => Effect.Effect<void> }
>() {}

// Functional Pattern: does not depend on a specific Store
export const runBulkOperation = (config: { operation: string }) =>
  Effect.gen(function* () {
    const bulk = yield* BulkOperationService
    const ids = ['1', '2', '3'] // In real code: get from params or a Service

    yield* bulk.applyToMany({ ids, operation: config.operation })
    return ids.length
  })
```

Characteristics:

- Entry is `runXxx(config)` and returns an `Effect`.
- Reusable across multiple Stores / Runtimes.

## 2. BoundApi Pattern (state-aware)

A state-aware Pattern that depends on Store state and explicitly accepts `$: BoundApi`:

```typescript
// patterns/cascade.ts
import { Effect } from 'effect'
import * as Logix from '@logixjs/core'

/**
 * @pattern Cascade
 * @description Watch upstream field -> reset downstream -> load data -> update result
 */
export const runCascadePattern = <Sh extends Logix.AnyModuleShape, R, T, Data>(
  $: Logix.BoundApi<Sh, R>,
  config: {
    source: (s: Logix.StateOf<Sh>) => T | undefined | null
    loader: (val: T) => Logix.Logic.Of<Sh, R, Data, never>
    onReset: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>
    onSuccess: (prev: Logix.StateOf<Sh>, data: Data) => Logix.StateOf<Sh>
  },
) => {
  return $.onState(config.source).runLatest((val) =>
    Effect.gen(function* () {
      yield* $.state.update(config.onReset)
      if (val == null) return

      const data = yield* config.loader(val)
      yield* $.state.update((s) => config.onSuccess(s, data))
    }),
  )
}
```

Characteristics:

- Entry is `runXxxPattern($, config)`, where the first argument is `BoundApi`.
- Uses module capabilities via `$` (e.g. `$.onState / $.state.update`).

## 3. Consume Patterns inside Logic

```typescript
// features/address/logic.ts
import { Effect } from 'effect'
import { AddressModule } from './module'
import { runCascadePattern } from '@/patterns/cascade'

export const AddressLogic = AddressModule.logic(($) =>
  Effect.gen(function* () {
    // Use a BoundApi Pattern
    yield* runCascadePattern($, {
      source: (s) => s.provinceId,
      loader: (provinceId) =>
        Effect.gen(function* () {
          const api = yield* $.use(AddressApi)
          return yield* api.getCities(provinceId)
        }),
      onReset: (s) => ({ ...s, cities: [], cityId: null }),
      onSuccess: (s, cities) => ({ ...s, cities }),
    })
  }),
)
```

## 4. Naming conventions

| Form       | Naming                    | Example                         |
| ---------- | ------------------------- | ------------------------------- |
| Functional | `runXxx(config)`          | `runBulkOperation(config)`      |
| BoundApi   | `runXxxPattern($, config)`| `runCascadePattern($, config)`  |

## Next

- API reference: [API Reference](../../api/)
- Core mindset: [Thinking in Logix](../essentials/thinking-in-logix)
- Back to docs home: [Docs home](../../)
