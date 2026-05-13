---
title: Performance
description: 把读取面和校验面都压窄。
---

## 优先使用 core selector

用 `useSelector(form, selector)` 只订阅真正要渲染的最小切片。

```tsx
const canSubmit = useSelector(
  form,
  (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
)

const submitCount = useSelector(form, (s) => s.$form.submitCount)
const lineItem = useSelector(form, (s) => s.items[index])
```

如果组件只关心一个 flag 或一行数据，就不要把整份表单状态都读出来。
同一页面多个局部实例时，也不要用共享实例来减少订阅数量；实例隔离优先于表面上的少一次创建。

## 优先做 scoped validation

```ts
yield* form.validatePaths(["shipping.address"])
```

当只有一个字段或一个子树变化时，用 `validatePaths(...)`，不要无差别跑整表单。

## 把数组视为结构热路径

列表编辑统一走 `form.fieldArray(path)`：

- `insert`
- `update`
- `replace`
- `remove`
- `swap`
- `move`
- `byRowId(...)`

这样结构编辑会和 row ownership、cleanup 语义保持一致。

identity 配置上：

- 行已经有稳定业务 id 时，优先 `trackBy`
- 行是客户端临时创建但仍要稳定结构编辑时，用 `store`
- 重排频繁的列表，避免使用 `index`

## 恢复实例时控制成本

keyed 实例加 `gcTime` 可以在路由切换后恢复已有状态。
恢复本身不应重新跑整页订阅；成本主要来自重新挂载的组件会读取哪些切片。

```tsx
const form = useModule(CheckoutForm, {
  key: `checkout:${cartId}`,
  gcTime: 60_000,
})
```

对于复杂 Form：

- route 级共享用 `useModule(Form.tag)`
- 可恢复的页面编辑会话用 `useModule(Form, { key, gcTime })`
- 同屏多个独立副本用 `useModule(Form)` 或不同 key

## 错误渲染保持 data-first

渲染应该由 canonical error leaf 和当前 i18n snapshot 共同驱动。
不要在校验深处提前把错误结果压成临时显示字符串。

## 延伸阅读

- [Instances](/cn/docs/form/instances)
- [Field arrays](/cn/docs/form/field-arrays)
- [Selectors and support facts](/cn/docs/form/selectors)
