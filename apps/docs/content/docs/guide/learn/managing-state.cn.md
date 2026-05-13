---
title: Managing state
description: 通过 `$.state` 和用例级动作把状态保持为单一事实源。
---

每个模块都持有一棵状态树。
所有渲染、联动和 effects 都应继续围绕这棵状态树展开。

## 状态访问

在 logic 中，状态通过这些入口访问：

- `$.state.read`
- `$.state.mutate(...)`
- `$.state.update(...)`
- `$.state.ref(...)`

```ts
const state = yield* $.state.read

yield* $.state.mutate((draft) => {
  draft.count += 1
})
```

## 建议

普通更新优先使用 `$.state.mutate(...)`。

只有当“整棵状态替换”本身就是语义单元时，再使用 `$.state.update(...)`。

## 用例级动作

当前一步必须看到前一步写入后的状态时，把这串步骤收进一个明确的用例级动作：

```ts
const logic = Search.logic("search-logic", ($) =>
  $.onAction("applyFilterAndReload").run(({ payload }) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft) => {
        draft.filter = payload.filter
      })

      const state = yield* $.state.read
      yield* runSearchWithFilter(state.filter)
    }),
  ),
)
```

这样时序 owner 会继续留在 logic 里，而不是推回调用方。

## 说明

- 避免在调用方写 dispatch + sleep + dispatch
- 让一个用例级动作拥有一条有序业务序列

## 相关页面

- [Modules & State](../essentials/modules-and-state)
- [Common recipes](../recipes/common-patterns)
