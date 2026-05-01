---
title: Pattern examples
description: 对比 store-agnostic 的 functional pattern 和 state-aware 的 Bound API pattern。
---

Logix 里的 pattern 代码通常有两种形状：

- functional pattern
- Bound API pattern

## Functional pattern

functional pattern 与具体 store 解耦，直接返回 `Effect`：

```ts
export const runBulkOperation = (config: { operation: string }) =>
  Effect.gen(function* () {
    const bulk = yield* BulkOperationService
    const ids = ["1", "2", "3"]

    yield* bulk.applyToMany({ ids, operation: config.operation })
    return ids.length
  })
```

当 pattern 不应依赖某个具体模块时，使用这种形状。

## Bound API pattern

Bound API pattern 是 state-aware 的，显式接收 `$`：

```ts
export const runCascadePattern = <Sh extends Logix.AnyModuleShape, R, T, Data>(
  $: Logix.Module.BoundApi<Sh, R>,
  config: {
    source: (s: Logix.Module.StateOf<Sh>) => T | undefined | null
    loader: (val: T) => Effect.Effect<Data, never, any>
    onReset: (draft: unknown) => void
    onSuccess: (draft: unknown, data: Data) => void
  },
) =>
  $.onState(config.source).runLatest((val) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft) => {
        config.onReset(draft)
      })
      if (val == null) return

      const data = yield* config.loader(val)
      yield* $.state.mutate((draft) => {
        config.onSuccess(draft, data)
      })
    }),
  )
```

当 pattern 需要消费模块状态、watcher 或局部 mutation 时，使用这种形状。

## 选型

- 当 store ownership 应留在 pattern 外部时，用 functional pattern
- 当 pattern 必须消费 state、watcher 或 module-local mutation 时，用 Bound API pattern

## 相关页面

- [Bound API ($)](../../api/core/bound-api)
- [Common recipes](./common-patterns)
