---
title: ExternalStore - reduce useEffect glue
description: Use ExternalStore + StateTrait.externalStore to declaratively wire external push sources (or cross-module selectors) into your state graph and avoid tearing.
---

ExternalStore lets you upgrade the chain “external input (push) → state writeback → downstream derivation/rendering” from hand-written `useEffect + useState` / watcher glue into a **declarative trait**, so dependencies are easier to maintain and explain.

## 1) When do you need it?

Typical cases:

- **External push sources**: route location, session/auth state, feature flags, websocket messages, host events… (values change, but don’t belong in reducers as manual writeback).
- **Cross-module read consistency**: a component reads multiple modules and you want snapshots observed in one render to come from the same observation window (avoid “module A new / module B old” tearing).

## 2) Basic usage: `StateTrait.externalStore`

Declare a field as “external-owned” and have an external source write it back:

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

const State = Schema.Struct({
  location: Schema.String,
  // other business fields...
})

export const AppDef = Logix.Module.make('App', {
  state: State,
  actions: {},
  traits: Logix.StateTrait.from(State)({
    location: Logix.StateTrait.externalStore({
      store: Logix.ExternalStore.fromService(LocationService, (svc) => svc.locationStore),
      // optional: map the snapshot into the field type
      select: (loc) => String(loc),
      // optional: coalesce bursts (e.g. high-frequency events)
      coalesceWindowMs: 16,
    }),
  }),
})
```

Key constraints:

- `getSnapshot()` must be synchronous and pure (don’t hide IO/Promises inside).
- `subscribe(listener)` must call the listener on every change (don’t miss notifications).
- Don’t write an external-owned field from reducers/computed/link/source; derive into a different field via `computed/link` if needed.

## 3) Module-as-Source: treat another module as the source

If you really need “module B’s field is driven by a selector from module A”, use Module-as-Source:

```ts
traits: Logix.StateTrait.from(BState)({
  aView: Logix.StateTrait.externalStore({
    store: Logix.ExternalStore.fromModule(AModule, (s) => s.value),
  }),
})
```

Notes:

- `fromModule` requires a resolvable, stable `moduleId` (don’t pass a read-only ModuleHandle).
- The selector must have a stable selectorId (otherwise it will fail fast).

## 4) Decision guide: ReadQuery vs fromModule vs externalStore vs link

- `ReadQuery`: **read**. Stable selectors for UI/logic (fine-grained subscriptions / performance).
- `StateTrait.link`: **in-module linkage**. Field B is derived/moved from field A (within one module).
- `StateTrait.externalStore`: **external push writeback**. The field value is owned by something outside the module (service/ref/stream/module selector).
- `ExternalStore.fromModule`: **cross-module dependency**. Use another module’s selector as an external source for writeback (powerful for strong consistency / avoiding tearing; prefer consolidating state/derivations into one module when possible).

## Runnable example

- Index: [Runnable examples](./runnable-examples)
- Code: `examples/logix/src/scenarios/external-store-tick.ts`
