---
title: 搜索 + 详情
description: 在不把 owner 挪到 React 的前提下协调列表查询和选中详情。
---

搜索详情页有两块持久逻辑：列表查询和选中项。把它们保留在 program 中，导航、重试和诊断就不会散落到组件树里。

## 状态

```ts
const Browser = Logix.Module.make("Browser", {
  state: Schema.Struct({
    q: Schema.String,
    page: Schema.Number,
    selectedId: Schema.NullOr(Schema.String),
    results: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String })),
    detail: Schema.NullOr(Schema.Struct({ id: Schema.String, title: Schema.String })),
  }),
  actions: {
    qChanged: Schema.String,
    pageChanged: Schema.Number,
    selected: Schema.NullOr(Schema.String),
  },
})
```

`selectedId` 是持久 authority。React key 和列表 index 只是视图层细节。

## 协调

```ts
const BrowserLogic = Browser.logic("browser", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("qChanged").runLatest((action) =>
      $.state.mutate((draft) => {
        draft.q = action.payload
        draft.page = 1
        draft.selectedId = null
      }),
    )

    yield* $.onAction("selected").runLatest((action) =>
      $.state.mutate((draft) => {
        draft.selectedId = action.payload
      }),
    )
  }),
)
```

选中详情可以由 service、Query domain program 或 Form source 拉取。owner 规则不变：React 读取结果，不拥有请求生命周期。

## React

```tsx
const browser = useModule(BrowserProgram, { key: "browser" })
const [q, page, selectedId] = useSelector(browser, fieldValues(["q", "page", "selectedId"]))
```

少量一起消费的 UI 原子字段可以用 `fieldValues`。不同组件消费不同字段时，优先使用独立 selector。
