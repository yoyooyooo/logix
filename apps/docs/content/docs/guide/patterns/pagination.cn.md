---
title: 分页
description: 把 page 或 cursor 建模为 runtime state，而不是组件局部 bookkeeping。
---

分页有持久行为：当前页、query key、loading window、过期响应处理。当这些影响业务行为时，放进 module。

## Page state

```ts
state: Schema.Struct({
  q: Schema.String,
  page: Schema.Number,
  pageSize: Schema.Number,
  total: Schema.Number,
  rows: Schema.Array(Row),
  loading: Schema.Boolean,
})
```

后端是 cursor-based 时，用 cursor 字段替代 `page`。

## Transitions

- `queryChanged` 把 `page` 重置为 `1`。
- `pageChanged` 保留当前 query。
- `pageSizeChanged` 通常重置 cursor/page。
- request 完成时，只在结果仍匹配 active key 时写入 rows。

## React

组件派发 page intent，读取 page state。组件不拥有请求取消。
