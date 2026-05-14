---
title: Schema
description: Values schema、submit decode schema 与 form state shape。
---

Form 在两处使用 Effect Schema：editable values 和 submit decode。

## Values schema

```ts
const Values = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})
```

`values` 定义可编辑字段和它们的类型级 paths。

## Submit decode

```ts
const Submit = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

$.submit({ decode: Submit })
```

submit decode 是 final boundary validation。field rules 用于引导交互；decode 决定什么可以离开 form。

## State shape

Form state 包含 values，以及领域拥有的 support state：`errors`、`ui`、`$form`。读取它们应通过 Form/core selectors，不要依赖 raw object contract。
