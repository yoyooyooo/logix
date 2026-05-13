---
title: Field arrays
description: Form handle 下的结构编辑、row identity 与数组校验。
---

## Runtime API

数组编辑统一收口到 form handle：

```ts
const items = form.fieldArray("items")

yield* items.append({ sku: "", qty: 1 })
yield* items.prepend({ sku: "", qty: 1 })
yield* items.insert(2, { sku: "", qty: 1 })
yield* items.update(2, { sku: "A-01", qty: 3 })
yield* items.replace(nextItems)
yield* items.remove(1)
yield* items.swap(0, 1)
yield* items.move(4, 0)
yield* items.byRowId("row-17").remove()
```

## 在 React 中读取行

```tsx
const rows = useSelector(form, (s) => s.items)

return rows.map((row, index) => (
  <input
    key={String(row.id)}
    value={String(row.name ?? "")}
    onChange={(e) =>
      void Effect.runPromise(form.field(`items.${index}.name`).set(e.target.value))
    }
  />
))
```

这个示例默认列表使用的是业务键 identity，例如 `trackBy: "id"`。

读取统一走 `useSelector(...)`。
写入统一走 `form.field(...)` 和 `form.fieldArray(...)`。

## Identity 模型

Form 保留两条编辑轴：

- positional edits，用来处理即时列表操作
- identity edits，通过 `byRowId(...)` 处理重排后仍要保持 owner 归属的场景

`replace(nextItems)` 固定表示 roster replacement。
它是显式信号，表示当前 row roster 被整体重写。

## 如何选择 `identity.mode`

列表 identity 本质上是在回答一个问题：

- 当 roster 发生结构编辑或重排时，row continuity 到底从哪里来？

当前源码支持 3 种模式：

| mode | identity 来源 | 适用场景 | 重排后的 continuity | 建议 |
| --- | --- | --- | --- | --- |
| `trackBy` | 行上的业务字段，例如 `id` | 行本身已经有稳定业务 id | 最强 | 默认推荐 |
| `store` | runtime 内部维护的 row id store | 行暂时没有稳定业务 id，但仍需要稳定的结构编辑语义 | 在当前 runtime 实例内稳定 | 推荐的后备方案 |
| `index` | 当前行位置 | 只适用于纯 positional 的窄场景 | 最弱 | 不建议用于重排频繁的列表 |

### `trackBy`

当行本身已经有稳定业务键时，用 `trackBy`：

```ts
form.list("items", {
  identity: { mode: "trackBy", trackBy: "id" },
})
```

这样可以让：

- render key 回到同一份业务 identity
- `byRowId(...)` 回到同一份 row identity
- reorder 语义更容易理解

### `store`

当行是客户端临时创建的，还没有稳定业务键时，用 `store`：

```ts
form.list("draftRows", {
  identity: { mode: "store" },
})
```

这样可以在当前 runtime 实例里保持稳定的 row ownership，而不要求行对象自己携带业务 id。

### `index`

`index` 当前源码接受，但它是最弱的一档。
只适合真正纯 positional 的列表，不适合依赖重排后 continuity 的场景。

如果你关心这些能力：

- `byRowId(...)`
- reorder-safe ownership
- 稳定 render key

优先选 `trackBy` 或 `store`。

## 校验模型

行内问题用 field rule。
依赖整组数组的判断用 list-level rule，例如：

- SKU 去重
- 跨行互斥
- 最少行数

所有失败最终都落到同一份 canonical error carrier。

## 路由恢复与性能

列表较大时，优先使用 keyed 实例和稳定 identity：

```tsx
const form = useModule(InventoryForm, {
  key: `inventory:${warehouseId}`,
  gcTime: 60_000,
})
```

路由切换后在 `gcTime` 窗口内恢复实例时，row ownership、errors、cleanup receipt 与当前 values 会跟随同一个 runtime instance 保留。

性能上保持三点：

- 读取列表时只订阅实际渲染的切片
- 重排或删除后继续用 `byRowId(...)` 处理 identity-sensitive 操作
- 大列表避免 `index` identity

## 延伸阅读

- [Instances](/cn/docs/form/instances)
- [Performance](/cn/docs/form/performance)
- [Selectors and support facts](/cn/docs/form/selectors)
