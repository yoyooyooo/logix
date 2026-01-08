---
title: Schema 校验与错误映射
description: 提交时的 Schema.decode、errors.$schema 写回与路径映射。
---

## 1) Schema 错误写到哪里

Form 会把“Schema 解码/校验错误”写到 `errors.$schema` 分支中，和规则错误（`errors.*`）与手动错误（`errors.$manual.*`）区分开。

在 UI 侧，`useField` 会按优先级读取错误：

1. `errors.$manual.<path>`
2. `errors.<path>`（规则错误）
3. `errors.$schema.<path>`（Schema 错误）

## 2) 手动映射 Schema 错误（可选）

当你在某些场景需要“自己 decode 并写回错误”，可以用 `Form.SchemaErrorMapping`：

```ts
const writes = Form.SchemaErrorMapping.toSchemaErrorWrites(schemaError, {
  // 可选：当 schema 的字段名与表单字段名不一致时做 rename
  rename: { amount: "amountText" },
  toLeaf: () => "字段不合法",
})

for (const w of writes) {
  dispatch({ _tag: "setValue", payload: { path: w.errorPath, value: w.error } })
}
```

这会生成符合 `$list/rows[]` 口径的错误路径（例如数组 index 会映射为 `rows`）。
