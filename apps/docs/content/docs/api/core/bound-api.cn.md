---
title: Bound API ($)
description: Module.logic 内可用的 module-bound API。
---

Bound API 是传给 `Module.logic` 的 `$`。它绑定到一个 module instance 和它的 runtime environment。

## State

```ts
yield* $.state.update((prev) => ({ ...prev, count: prev.count + 1 }))
yield* $.state.mutate((draft) => { draft.count += 1 })
const state = yield* $.state.read
```

## Actions and watchers

```ts
yield* $.onAction("submitted").runLatest(handleSubmit)
yield* $.onState((state) => state.query).debounce(200).runLatest(handleQuery)
```

## Dispatch

```ts
yield* $.dispatch("increment")
yield* $.dispatch({ _tag: "increment", payload: undefined })
yield* $.dispatchers.increment()
```

## Services and imports

```ts
const api = yield* $.use(ApiService)
const child = yield* $.use(Child.tag)
const imported = yield* $.imports.get(Child.tag)
```

## Readiness

```ts
yield* $.readyAfter(loadConfig, { id: "config" })
```

## Field declarations

```ts
$.fields({
  fullName: $.fields.computed({ deps: ["first", "last"], get: (first, last) => `${first} ${last}` }),
})
```

字段声明是局部 builder grammar，会在 program 装配时编译。
