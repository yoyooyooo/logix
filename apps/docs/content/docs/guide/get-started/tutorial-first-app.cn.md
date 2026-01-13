---
title: 教程：第一个业务流（可取消搜索）
description: 用一个“搜索框 + 结果列表”体验防抖、自动取消与依赖注入。
---

本教程将带你从零开始构建一个“可取消搜索”小应用：用户输入关键字后，系统会 **防抖** 触发搜索，并在用户快速输入时 **自动取消旧请求**，永远只展示最新结果。

> [!NOTE]
> 这是一个“单字段输入 + 异步查询”的场景，用普通 `Logix.Module` 就足够了。
>
> 如果你要做的是“多字段 + 校验 + 动态数组”的表单，请直接走 `@logixjs/form`：
> - [Form 什么时候用](../../form/when-to-use)
> - [Form 快速开始](../../form/quick-start)

### 适合谁

- 完成过「快速开始」计数器示例，想写一个更贴近业务的异步交互；
- 想要一份“把复杂异步从组件里拿出来”的最小参考写法。

### 前置知识

- 基本 TypeScript 与 React；
- 对 Module / Logic / Bound API (`$`) 有一个粗略印象即可。

### 读完你将获得

- 一套可复用的“输入 → 防抖 → 搜索 → 取消旧请求 → 渲染最新结果”的模板；
- 对 `$.onState(...).debounce(...).runLatest...` 的直觉心智模型；
- 知道如何用 Service Tag + Layer 把 IO 依赖注入到 Logic 中。

## 1. 定义 Module（状态 + 动作）

创建 `src/features/search/search.def.ts`：

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

export const SearchState = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(Schema.String),
  isSearching: Schema.Boolean,
  errorMessage: Schema.optional(Schema.String),
})

export const SearchActions = {
  setKeyword: Schema.String,
}

export const SearchDef = Logix.Module.make('Search', {
  state: SearchState,
  actions: SearchActions,
  immerReducers: {
    setKeyword: (draft, keyword) => {
      draft.keyword = keyword
    },
  },
})
```

这里我们做了一件很重要的事：**把“输入框 onChange”收敛成一个明确的意图（Action）**，而不是让组件里散落一堆 `useEffect`。

## 2. 定义 SearchApi（Service Tag + Layer）

创建 `src/features/search/search.service.ts`：

```ts
import { Context, Data, Effect, Layer } from 'effect'

export class SearchError extends Data.TaggedError('SearchError')<{
  readonly message: string
}> {}

export interface SearchApi {
  readonly search: (keyword: string) => Effect.Effect<ReadonlyArray<string>, SearchError>
}

export class SearchApiTag extends Context.Tag('@svc/SearchApi')<SearchApiTag, SearchApi>() {}

export const SearchApiLive = Layer.succeed(SearchApiTag, {
  search: (keyword) =>
    Effect.gen(function* () {
      yield* Effect.sleep('200 millis')
      if (keyword === 'error') {
        return yield* Effect.fail(new SearchError({ message: '模拟：服务端错误' }))
      }
      return [`${keyword} 结果 A`, `${keyword} 结果 B`, `${keyword} 结果 C`]
    }),
})
```

这一步的价值：Logic 不直接依赖 `fetch/axios` 等具体实现，而是依赖抽象（`SearchApiTag`），便于测试与替换。

## 3. 编写 Logic（debounce + runLatest）

创建 `src/features/search/search.logic.ts`：

```ts
import { Cause, Effect, Option } from 'effect'
import { SearchDef } from './search.def'
import { SearchApiTag } from './search.service'

export const SearchLogic = SearchDef.logic<SearchApiTag>(($) =>
  Effect.gen(function* () {
    yield* $.onState((s) => s.keyword).debounce(300).runLatestTask({
      pending: (keyword) =>
        $.state.mutate((draft) => {
          const trimmed = keyword.trim()
          draft.errorMessage = undefined

          if (trimmed.length === 0) {
            draft.isSearching = false
            draft.results = []
            return
          }

          draft.isSearching = true
        }),

      effect: (keyword) =>
        Effect.gen(function* () {
          const trimmed = keyword.trim()
          if (trimmed.length === 0) {
            return [] as ReadonlyArray<string>
          }

          const api = yield* $.use(SearchApiTag)
          return yield* api.search(trimmed)
        }),

      success: (results) =>
        $.state.mutate((draft) => {
          draft.isSearching = false
          draft.results = Array.from(results)
        }),

      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.isSearching = false

          const failure = Cause.failureOption(cause)
          draft.errorMessage =
            Option.isSome(failure) && typeof (failure.value as any)?.message === 'string'
              ? String((failure.value as any).message)
              : '搜索失败'
        }),
    })
  }),
)
```

核心点：

- `debounce(300)`：用户快速输入时，不为每个字符都发请求；
- `runLatestTask(...)`：永远只保留“最新一次搜索”，旧请求会被自动取消（竞态收敛到一条清晰链路）。

## 4. 组装 Module 与 Runtime

创建 `src/features/search/search.module.ts`：

```ts
import * as Logix from '@logixjs/core'
import { SearchDef } from './search.def'
import { SearchLogic } from './search.logic'
import { SearchApiLive } from './search.service'

export const SearchModule = SearchDef.implement({
  initial: {
    keyword: '',
    results: [],
    isSearching: false,
    errorMessage: undefined,
  },
  logics: [SearchLogic],
})

export const AppRuntime = Logix.Runtime.make(SearchModule, {
  label: 'GetStartedSearch',
  devtools: true,
  layer: SearchApiLive,
})
```

## 5. 连接 UI（React）

在应用入口挂载 Runtime（任意位置皆可）：

```tsx
import { RuntimeProvider } from '@logixjs/react'
import { AppRuntime } from './features/search/search.module'
import { SearchView } from './features/search/SearchView'

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <SearchView />
    </RuntimeProvider>
  )
}
```

组件只负责渲染与派发意图：

```tsx
import { useModule, useSelector } from '@logixjs/react'
import { SearchModule } from './search.module'

export function SearchView() {
  const search = useModule(SearchModule)
  const keyword = useSelector(search, (s) => s.keyword)
  const results = useSelector(search, (s) => s.results)
  const isSearching = useSelector(search, (s) => s.isSearching)
  const errorMessage = useSelector(search, (s) => s.errorMessage)

  return (
    <div>
      <input value={keyword} onChange={(e) => search.actions.setKeyword(e.target.value)} placeholder="输入关键字…" />

      {isSearching && <div>搜索中...</div>}
      {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}

      <ul>
        {results.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}
```

> [!TIP]
> 试试输入 `error`，你会看到错误如何在 Logic 内被收敛并回写到 state。

## 下一步

- [教程：复杂列表查询](./tutorial-complex-list) —— 把“筛选 + 分页 + 刷新”变成可组合的多条 Flow；
- （表单）[Form 快速开始](../../form/quick-start) —— 多字段/校验/动态数组直接走领域包。
