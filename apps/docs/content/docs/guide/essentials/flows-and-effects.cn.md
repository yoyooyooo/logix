---
title: Reactions & Effects
description: 通过 Effect 和显式运行策略响应 action 与状态变化。
---

状态和 action 的反应负责把模块事件连接到 effects。

常见 source 有：

- `$.onAction(...)`
- `$.onState(...)`

Effect 负责描述 source 命中后要执行的工作。

## Action 到 effect

```ts
const UserLogic = UserModule.logic("user-logic", ($) =>
  $.onAction("fetchUser").run(({ payload: userId }) =>
    Effect.gen(function* () {
      const api = yield* $.use(UserApi)
      const user = yield* api.getUser(userId)

      yield* $.state.mutate((draft) => {
        draft.user = user
      })
    }),
  ),
)
```

## State 到 effect

```ts
const SearchLogic = SearchModule.logic("search", ($) =>
  $.onState((s) => s.keyword)
    .debounce(300)
    .runLatest((keyword) =>
      Effect.gen(function* () {
        const api = yield* $.use(SearchApi)
        const results = yield* api.search(keyword)

        yield* $.state.mutate((draft) => {
          draft.results = results
        })
      }),
    ),
)
```

## 运行策略

最常见的策略包括：

- `run`，串行执行
- `runLatest`，最新优先
- `runExhaust`，执行中忽略后续
- `runParallel`，无界并行

## 说明

- Effect 描述做什么
- 反应逻辑继续停在 `Logic`
- 状态写回继续通过 reducer 或 `$.state.*` 显式完成

## 相关页面

- [Effect basics](./effect-basics)
- [Lifecycle](./lifecycle)
- [Bound API ($)](../../api/core/bound-api)
