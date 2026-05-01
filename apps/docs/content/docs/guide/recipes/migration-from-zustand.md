---
title: Migration from Zustand
description: Move state, actions, and async logic from Zustand into Modules, Programs, and Effects.
---

The table below maps the most common Zustand mental model onto Logix.

## Mapping

| Zustand | Logix | Role |
| --- | --- | --- |
| `createStore` | `Logix.Module.make` | definition |
| store | Module + Program | definition + assembly |
| state | state schema | state shape |
| inline actions | actions + reducers or logic | operations |
| selectors | `useSelector(...)` | read path |
| async actions | Effects inside logic | side effects |

## Example

### Zustand

```ts
const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  incrementAsync: async () => {
    await new Promise((r) => setTimeout(r, 1000))
    set((state) => ({ count: state.count + 1 }))
  },
}))
```

### Logix

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    incrementAsync: Schema.Void,
  },
  reducers: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
  },
})

const CounterLogic = Counter.logic("counter-logic", ($) =>
  $.onAction("incrementAsync").run(() =>
    Effect.gen(function* () {
      yield* Effect.sleep(1000)
      yield* $.state.mutate((draft) => {
        draft.count += 1
      })
    }),
  ),
)

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## React side

```tsx
const counter = useModule(Counter.tag)
const count = useSelector(counter, (s) => s.count)
const dispatch = useDispatch(counter)
```

## Migration sequence

1. define the target module
2. move sync transitions into reducers
3. move async work into logic
4. switch React reads to `useSelector(...)`
5. switch writes to `useDispatch(...)`

## See also

- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
