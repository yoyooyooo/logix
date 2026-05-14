---
title: 搜索 + 详情
description: 把搜索状态、选择和详情拉取保留在 runtime 中。
---

搜索详情页通常由三个状态原子组成：查询参数、结果行、选中身份。

## State

```ts
state: Schema.Struct({
  q: Schema.String,
  page: Schema.Number,
  selectedId: Schema.NullOr(Schema.String),
  rows: Schema.Array(Row),
  detail: Schema.NullOr(Detail),
})
```

`selectedId` 是稳定 authority。不要用数组 index 作为详情身份。

## Actions

```ts
actions: {
  queryChanged: Schema.String,
  pageChanged: Schema.Number,
  rowSelected: Schema.NullOr(Schema.String),
}
```

query 改变通常重置 page 和 selection。选中一行不应该重写列表。

## Runtime work

查询和详情拉取使用 `runLatest`。最新查询获胜；过期响应不应覆盖新状态。

## React 读取

```tsx
const [q, page, selectedId] = useSelector(browser, fieldValues(["q", "page", "selectedId"]))
const rows = useSelector(browser, fieldValue("rows"))
const detail = useSelector(browser, fieldValue("detail"))
```

只有 UI 同时消费这些字段时才组合读取。
