---
title: 动态列表（Field Array）
description: useFieldArray、row identity、rows 错误树与跨行校验。
---

## 1) 声明一个数组字段（list trait）

在 `rules` 中显式把数组字段声明为 list，并为稳定 identity 提供 `trackBy`（推荐）：

```ts
const Values = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
})

const $ = Form.from(Values)
const z = $.rules

const ItemsForm = Form.make("ItemsForm", {
  values: Values,
  initialValues: { items: [] },
  rules: z(
    z.list("items", {
      identity: { mode: "trackBy", trackBy: "id" },
      item: {
        deps: ["name"],
        validateOn: ["onBlur"],
        validate: (row: any) => (String(row?.name ?? "").trim() ? undefined : { name: "必填" }),
      },
      list: {
        // 跨行校验：一次扫描 rows，写回 { rows: [...] }
        deps: ["name"],
        validateOn: ["onChange"],
        validate: (rows: ReadonlyArray<any>) => {
          const by = new Map<string, Array<number>>()
          for (let i = 0; i < rows.length; i++) {
            const v = String(rows[i]?.name ?? "").trim()
            if (!v) continue
            const bucket = by.get(v) ?? []
            bucket.push(i)
            by.set(v, bucket)
          }
          const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
          for (const indices of by.values()) {
            if (indices.length <= 1) continue
            for (const i of indices) rowErrors[i] = { name: "重复" }
          }
          return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
        },
      },
    }),
  ),
})
```

## 1.1) `useFieldArray` 和 list trait 的关系

- `useFieldArray(form, listPath)` 负责**增删/重排 values**（append/remove/swap/move），不要求你一定声明 list trait。
- list 声明（`rules` 里的 `z.list(listPath, ...)`）负责表达“这是一个动态列表”的**领域语义**：
  - Form 不会“自动猜测”某个字段需要按动态列表语义处理；只有写成 list 结构时才会启用 `trackBy`/`item.check`/`list.check`
  - `identity.trackBy`：用业务字段生成稳定 row id（推荐），缺失时会降级为运行时 row id（再退回 index）
  - `item`：行级校验（只看当前行）
  - `list`：列表级/跨行校验（一次扫描，多行写回 `$list/rows[]`）

## 2) 在 React 中操作数组：`useFieldArray`

```tsx
import { useFieldArray } from "@logixjs/form/react"

const { fields, append, remove, swap, move } = useFieldArray(form, "items")
```

- `fields[index].id` 用于 React `key`（优先来自 `trackBy`，否则使用运行时维护的 rowId，再退回 index）
- `append/remove/swap/move` 会同步维护 values/errors/ui 的数组对齐，避免错位

## 3) 错误树位置

- 行内字段错误：`errors.items.rows.0.name`
- 行级错误：`errors.items.rows.0.$item`
- 列表级错误：`errors.items.$list`

你通常不需要手动拼路径：`useField(form, "items.0.name")` 会自动读取正确的错误位置。
