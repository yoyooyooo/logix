---
title: Sources
description: 表单字段的 remote facts，resource owner 留在 Form 外部。
---

source 把字段连接到 remote fact。Form 拥有 field receipt 与 submit impact；resource owner 留在 Form 外部。

## Declaration

```ts
$.field("provinceId").source({
  resource: ProvincesByCountry,
  deps: ["countryId"],
  key: (countryId) => countryId ? { countryId } : undefined,
  triggers: ["onMount", "onKeyChange"],
  debounceMs: 150,
  concurrency: "switch",
  submitImpact: "observe",
})
```

## Inactive key

`key` 返回 `undefined` 时，source inactive。dependent fields 使用这条路线。

## Submit impact

- `block`: pending/stale source work 可以阻塞 submit。
- `observe`: source state 可见，但本身不阻塞 submit。

## 边界

source 不是 options API。它不拥有 final errors、candidates 或 UI availability。errors 用 rules，local soft facts 用 companion。
