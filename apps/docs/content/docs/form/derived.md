---
title: 派生与联动（derived / Trait）
description: 用 Form.computed/link/source 声明 computed/link/source，并通过 deps-as-args 约束依赖。
---

## 1) 为什么用 derived

`derived` 用来声明“由 values 推导出的额外字段/视图状态”，例如：

- 聚合统计（合计、数量、是否可提交的辅助信息）
- 联动字段（一个字段变化同步到另一个字段）
- 异步资源（按字段依赖拉取 options，并写回到 values 的 snapshot 字段）

`@logix/form` 对 derived 做了边界约束：默认只允许写回 `values` / `ui`，避免业务把校验与错误树写成“第二套事实源”。

## 2) `Form.computed`：deps-as-args

```ts
const $ = Form.from(Values)
const d = $.derived

const FormWithSummary = Form.make("FormWithSummary", {
  values: Values,
  initialValues: { items: [] } as any,
  derived: d({
    "ui.total": Form.computed({
      deps: ["items"],
      get: (items) => Array.isArray(items) ? items.length : 0,
    }),
  }),
})
```

`get` 的入参只来自 `deps`，不暴露“隐式 state 读取”，便于类型推导与性能优化。

## 3) `Form.link`：把一个值映射到另一个值

假设已定义 `const d = $.derived`：

```ts
derived: d({
  "shipping.contactEmail": Form.link({ from: "profile.email" }),
})
```

## 4) `Form.source`：把异步资源写回到 values

当你希望“根据 values 的某些字段自动拉取数据，并把 snapshot 写回 values”，可以用 `source`：

假设已定义 `const d = $.derived`：

```ts
derived: d({
  "cityOptions": Form.source({
    resource: "demo/region/cities",
    deps: ["country", "province"],
    triggers: ["onValueChange"],
    concurrency: "switch",
    key: (state) => ({ country: state.country, province: state.province }),
  }),
})
```

> 建议：source 的写回字段设计成 `ResourceSnapshot`（idle/loading/success/error），这样 UI 与调试都更清晰。

## 5) 数组与“行级”诉求：怎么选方案

`deps` 用来表达“结构字段的触发契约”，不要写 `items.0.name` / `a.2.b` 这类带数字 index 的路径：插入/删除/重排会导致 index 漂移，很难稳定解释与复现。

当你想“只关心某一行”时，优先基于 list identity（`trackBy`）组织写法：

- **只为渲染/联动**：在行组件内用 ``useField(form, `items.${index}.name`)`` 订阅字段并即时计算（不写回 values/ui）。
- **要跨组件复用但不参与提交**：把派生结果写到 `ui`，推荐输出 `{ [id]: ... }` 的字典（key 用 `trackBy` 字段）。
- **只在提交时需要**：在 `controller.handleSubmit({ onValid })` 里对 values 做一次性计算，生成提交 payload。
- **行级异步依赖**：用 `Form.traits(...)({ items: Form.list({ identityHint: { trackBy }, item: Form.node({ source: { ... } }) }) })`。
- **行级/跨行校验**：用 `rules: z.list("items", { identity, item, list })`（见“动态列表（Field Array）”）。
