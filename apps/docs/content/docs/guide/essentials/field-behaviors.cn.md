---
title: 字段行为
description: 通过 `$.fields(...)` 或领域 DSL 声明 computed、source 和 external 字段行为。
---

字段行为当前在两个位置声明：

- core 里的 `$.fields(...)`
- 领域包自己的 DSL，例如 `Form.make(...)`

## Core 字段声明

```ts
const Fields = Counter.logic("fields", ($) => {
  $.fields({
    total: $.fields.computed({
      deps: ["count"],
      get: (count) => Number(count ?? 0) + 1,
    }),
  })

  return Effect.void
})
```

当前 core 字段面承接：

- `computed`
- `source`
- `external`

## 领域字段行为

领域包也可以通过自己的 DSL 投影同一类能力。
例如 Form 把校验和表单特有联动留在 `Form.make(...)` 里。

## 历史说明

旧材料里如果出现 `trait`，当前统一把它理解成字段行为声明。
