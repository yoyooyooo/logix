---
title: Bound API ($)
description: Module.logic builder 内可用的 API。
---

`$` 是传给 `Module.logic(id, ($) => ...)` 的 Bound API。它已经绑定到当前 module shape、runtime、services、imports、state 与 action tokens。

## 常用成员

| 成员 | 用途 |
| --- | --- |
| `$.state.read` | 在 Effect 代码中读取当前 state。 |
| `$.state.update(fn)` | 返回写入新 state 的 Effect。 |
| `$.state.mutate(fn)` | 返回修改 draft 的 Effect。 |
| `$.onAction(...)` | 从 action token/tag/schema 构造 intent stream。 |
| `$.dispatch(...)` / `$.dispatchers.*` | 派发 actions。 |
| `$.use(...)` | 从 Env 中解析 imported module 或 service。 |
| `$.imports.get(Module.tag)` | 从 `Program.make(..., { capabilities: { imports } })` 解析子 Program。 |
| `$.fields(...)` | 在 logic builder 阶段声明 field behavior。 |
| `$.readyAfter(effect, options?)` | 在 logic builder 阶段声明 startup readiness work。 |
| `$.effect(token, handler)` | 注册 action side-effect handler。 |

## Declaration phase 与 run phase

Declaration-only 调用必须同步发生在 builder body 中。logic 的 runtime work 通过返回的 long-running effect 表达。

```ts
const Logic = Module.logic("logic-id", ($) => {
  $.fields({
    total: $.fields.computed({
      deps: ["items"],
      get: (items) => items.reduce((sum, item) => sum + item.price, 0),
    }),
  })

  return Effect.gen(function* () {
    yield* $.onAction("checkout").runParallelFork(/* ... */)
  })
})
```

公开代码不要返回 `{ setup, run }`。

## Imports

子 Program 在 assembly 阶段提供：

```ts
const HostProgram = Logix.Program.make(Host, {
  initial,
  capabilities: { imports: [ChildProgram] },
})
```

在 host logic 内部：

```ts
const child = yield* $.imports.get(Child.tag)
yield* child.actions.save()
```

## See also

- [Module](./module)
- [Program](./program)
- [useImportedModule](/cn/docs/api/react/use-imported-module)
